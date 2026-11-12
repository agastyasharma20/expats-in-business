import { describe, expect, it } from "vitest";

import {
  isFallbackError,
  orderAdapters,
  runChain,
  type Adapter,
  type ChainEvent,
} from "@/lib/ai/chain";
import { chunkGuide, cleanMarkdown, estimateTokens } from "@/lib/ai/chunking";
import {
  checkCitations,
  extractCitations,
  numberCitations,
  SentenceBuffer,
} from "@/lib/ai/citations";
import { normaliseQuestion, redactPersonalData } from "@/lib/ai/redact";

const fake = (name: Adapter["name"], behaviour: string[] | Error, available = true): Adapter => ({
  name,
  available,
  async *stream() {
    if (behaviour instanceof Error) throw behaviour;
    for (const part of behaviour) yield part;
  },
});
const failAfter = (name: Adapter["name"], first: string, error: Error): Adapter => ({
  name,
  available: true,
  async *stream() {
    yield first;
    throw error;
  },
});
const httpError = (statusCode: number) =>
  Object.assign(new Error(`HTTP ${statusCode}`), { name: "AI_APICallError", statusCode });

async function collect(gen: AsyncGenerator<ChainEvent>) {
  const events: ChainEvent[] = [];
  for await (const e of gen) events.push(e);
  return events;
}

describe("fallback chain", () => {
  it("classifies 429, 5xx, timeouts and network errors as fallback errors", () => {
    expect(isFallbackError(httpError(429))).toBe(true);
    expect(isFallbackError(httpError(503))).toBe(true);
    expect(
      isFallbackError(Object.assign(new Error("Request timed out"), { name: "TimeoutError" })),
    ).toBe(true);
    expect(isFallbackError(Object.assign(new TypeError("fetch failed")))).toBe(true);
    expect(isFallbackError(Object.assign(new Error("x"), { code: "ECONNREFUSED" }))).toBe(true);
    expect(isFallbackError(Object.assign(new Error("wrapped"), { cause: httpError(502) }))).toBe(
      true,
    );
  });

  it("does not fall back on client errors or user aborts", () => {
    expect(isFallbackError(httpError(400))).toBe(false);
    expect(isFallbackError(httpError(401))).toBe(false);
    expect(
      isFallbackError(Object.assign(new Error("aborted by user"), { name: "AbortError" })),
    ).toBe(false);
    expect(isFallbackError("nope")).toBe(false);
  });

  it("puts the configured provider first, skips unconfigured ones and keeps demo last", () => {
    const adapters = [
      fake("demo", []),
      fake("groq", [], false),
      fake("gemini", []),
      fake("openrouter", []),
    ];
    expect(orderAdapters(adapters, "openrouter").map((a) => a.name)).toEqual([
      "openrouter",
      "gemini",
      "demo",
    ]);
    expect(orderAdapters(adapters, "demo").map((a) => a.name)).toEqual(
      ["gemini", "openrouter", "demo"].filter((n) => n !== "demo").concat("demo"),
    );
  });

  it("falls back on 429 before any text", async () => {
    const events = await collect(
      runChain([fake("groq", httpError(429)), fake("demo", ["ok"])], {
        instructions: "",
        prompt: "",
      }),
    );
    expect(events).toEqual([
      { type: "provider", name: "groq" },
      { type: "provider", name: "demo" },
      { type: "text", text: "ok" },
    ]);
  });

  it("emits a reset when a provider fails mid-answer, then continues with the next", async () => {
    const events = await collect(
      runChain([failAfter("gemini", "partial", httpError(500)), fake("demo", ["full"])], {
        instructions: "",
        prompt: "",
      }),
    );
    expect(events.map((e) => e.type)).toEqual(["provider", "text", "reset", "provider", "text"]);
  });

  it("rethrows non-fallback errors and the last error when every provider fails", async () => {
    await expect(
      collect(
        runChain([fake("groq", httpError(401)), fake("demo", ["x"])], {
          instructions: "",
          prompt: "",
        }),
      ),
    ).rejects.toThrow("HTTP 401");
    await expect(
      collect(
        runChain([fake("groq", httpError(503)), fake("demo", httpError(503))], {
          instructions: "",
          prompt: "",
        }),
      ),
    ).rejects.toThrow("HTTP 503");
  });
});

describe("citations", () => {
  const allowed = new Set(["c1", "c2"]);
  it("extracts and validates cited ids against the retrieved set", () => {
    expect(extractCitations("A [[c1]]. B [[c2]] [[c1]].")).toEqual(["c1", "c2", "c1"]);
    expect(checkCitations("A [[c1]].", allowed)).toEqual({ ok: true, cited: ["c1"] });
    expect(checkCitations("A [[c9]].", allowed)).toEqual({
      ok: false,
      reason: "unknownCitation",
      unknown: ["c9"],
    });
    expect(checkCitations("No sources here.", allowed)).toEqual({
      ok: false,
      reason: "noCitation",
    });
  });

  it("numbers citations in source order and drops unknown markers", () => {
    expect(numberCitations("A [[c2]] and [[c1]] and [[zz]].", ["c1", "c2"])).toBe(
      "A [2] and [1] and .",
    );
  });

  it("releases whole sentences only, keeping trailing citations with their sentence", () => {
    const buffer = new SentenceBuffer();
    expect(buffer.push("You need a PES")).toEqual([]);
    expect(buffer.push("EL first. [[c1]] Then apply")).toEqual(["You need a PESEL first. [[c1]]"]);
    expect(buffer.push(" online.\n\nDone")).toEqual(["Then apply online."]);
    expect(buffer.flush()).toEqual(["Done"]);
    expect(new SentenceBuffer().push("Version 1.5 is out ")).toEqual([]);
  });
});

describe("redaction", () => {
  it("removes emails, phones, PESEL, IBAN, cards and URLs", () => {
    const text = redactPersonalData(
      "I am jan.kowalski@example.com, tel +48 512 345 678, PESEL 90010112345, IBAN PL61 1090 1014 0000 0712 1981 2874, card 4111 1111 1111 1111, see https://evil.example/x",
    );
    for (const secret of ["jan.kowalski", "512 345", "90010112345", "PL61", "4111", "evil.example"])
      expect(text).not.toContain(secret);
    expect(text).toContain("[email]");
    expect(text).toContain("[pesel]");
  });

  it("keeps ordinary questions intact, strips control characters and caps the length", () => {
    expect(normaliseQuestion("How do I get a PESEL number?")).toBe("How do I get a PESEL number?");
    expect(normaliseQuestion("a\u0000b")).toBe("a b");
    expect(normaliseQuestion("x".repeat(900)).length).toBe(500);
  });
});

describe("chunking", () => {
  const body = [
    "Intro paragraph.",
    "",
    "## First step",
    "",
    "Do this.",
    "",
    "> **TODO (verify):** unclear rule",
    "",
    "## Second step",
    "",
    "Then [this](/x) **now**.",
  ].join("\n");

  it("splits by heading, keeps headings and drops TODO notes", () => {
    const chunks = chunkGuide("Guide title", body);
    expect(chunks.map((c) => c.heading)).toEqual(["Guide title", "First step", "Second step"]);
    expect(chunks.map((c) => c.content).join(" ")).not.toContain("TODO");
    expect(chunks[2]!.content).toBe("Then this now.");
    expect(chunks.map((c) => c.ordinal)).toEqual([0, 1, 2]);
  });

  it("keeps chunks near the token target and splits long sections on sentences", () => {
    const long = Array.from(
      { length: 120 },
      (_, i) => `Sentence number ${i} explains one rule clearly.`,
    ).join(" ");
    const chunks = chunkGuide("T", `## Long\n\n${long}`);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) expect(estimateTokens(chunk.content)).toBeLessThanOrEqual(650);
    for (const chunk of chunks) expect(chunk.content.endsWith(".")).toBe(true);
  });

  it("cleans markdown noise", () => {
    expect(cleanMarkdown("<Note>Hi</Note> **bold** [link](https://x)")).toBe("Hi bold link");
  });
});
