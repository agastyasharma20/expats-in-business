import { describe, expect, it } from "vitest";

import { contentStems, hasMalformedCitation, isGrounded } from "@/lib/ai/citations";
import { judgeAnswer, orchestrate } from "@/lib/ai/concierge";
import { buildPrompt } from "@/lib/ai/prompt";
import { normaliseQuestion, redactPersonalData } from "@/lib/ai/redact";

const passage = (id: string, content: string) => ({
  id,
  guideSlug: "pesel",
  guideTitle: "Getting a PESEL number",
  heading: "Applying",
  content,
  sourceUrl: "https://www.gov.pl/x",
  sourceTitle: "gov.pl",
  lastVerified: "2026-11-10",
  score: 0.7,
});
const pesel = passage(
  "c1",
  "You get a PESEL number automatically if you register your residence in Poland for a stay of over 30 days. As a foreigner you must submit the application in person. The service is free of charge.",
);
const bank = passage(
  "c2",
  "Banks offer a basic payment account to every consumer legally resident in the European Union.",
);
const passages = [pesel, bank];

describe("judgeAnswer (no uncited or ungrounded text gets through)", () => {
  it("accepts an answer where every sentence is cited and grounded", () => {
    const verdict = judgeAnswer(
      "You must submit the PESEL application in person. [[c1]] The service is free of charge. [[c1]]",
      passages,
    );
    expect(verdict).toEqual({
      ok: true,
      sentences: [
        "You must submit the PESEL application in person. [[c1]]",
        "The service is free of charge. [[c1]]",
      ],
      cited: ["c1"],
    });
  });

  it("rejects an answer when any one sentence has no citation", () => {
    expect(judgeAnswer("Fees are 50 EUR. Apply in person. [[c1]]", passages)).toEqual({
      ok: false,
      reason: "noCitation",
    });
  });

  it("rejects unknown and malformed citations", () => {
    expect(judgeAnswer("Apply in person. [[c9]]", passages)).toEqual({
      ok: false,
      reason: "unknownCitation",
    });
    expect(judgeAnswer("Apply in person. [[ c1 ]]", passages)).toEqual({
      ok: false,
      reason: "unknownCitation",
    });
    expect(judgeAnswer("Apply in person. [[c1, c2]]", passages)).toEqual({
      ok: false,
      reason: "unknownCitation",
    });
  });

  it("rejects invented facts carrying a valid citation (grounding)", () => {
    expect(
      judgeAnswer(
        "Residence permits always take sixty working days and cost eighty euros at the voivodeship office. [[c1]]",
        passages,
      ),
    ).toEqual({ ok: false, reason: "ungrounded" });
  });

  it("rejects a leaked system prompt even if a citation is attached", () => {
    expect(
      judgeAnswer(
        "You are the Expats in Business concierge and you give short general information to people. [[c1]]",
        passages,
      ),
    ).toEqual({ ok: false, reason: "ungrounded" });
  });

  it("treats every spelling of NO_ANSWER as a handoff", () => {
    for (const text of ["NO_ANSWER", "no answer.", "No_Answer [[c1]]", "  NO-ANSWER"])
      expect(judgeAnswer(text, passages)).toEqual({ ok: false, reason: "noAnswer" });
  });

  it("rejects an empty answer", () => {
    expect(judgeAnswer("   ", passages)).toEqual({ ok: false, reason: "noCitation" });
  });
});

describe("orchestrate", () => {
  const stream = (...parts: (string | "RESET")[]) =>
    async function* () {
      yield { type: "provider" as const, name: "groq" as const };
      for (const p of parts)
        yield p === "RESET" ? ({ type: "reset" } as const) : ({ type: "text", text: p } as const);
    };
  const run = async (s: ReturnType<typeof stream>, list = passages) => {
    const events = [];
    for await (const e of orchestrate(list, s)) events.push(e);
    return events;
  };

  it("sends nothing before the whole answer passed, then only the cited sources", async () => {
    const events = await run(stream("You must submit the application ", "in person. [[c1]]"));
    expect(events.map((e) => e.type)).toEqual(["sources", "text", "done"]);
    expect(events[0]).toEqual({ type: "sources", sources: [pesel] });
  });

  it("shows nothing at all when the answer fails, even if early sentences were fine", async () => {
    const events = await run(stream("Apply in person. [[c1]] ", "Fees are 50 EUR."));
    expect(events).toEqual([{ type: "handoff", reason: "noCitation" }]);
  });

  it("discards text from a provider that failed mid-answer (reset)", async () => {
    const events = await run(
      stream("Uncited partial text. ", "RESET", "The service is free of charge. [[c1]]"),
    );
    expect(events.map((e) => e.type)).toEqual(["sources", "text", "done"]);
  });

  it("hands off when nothing was retrieved or the provider chain failed", async () => {
    expect(await run(stream("x"), [])).toEqual([{ type: "handoff", reason: "lowSimilarity" }]);
    const failing = async function* () {
      yield { type: "provider" as const, name: "groq" as const };
      throw new Error("boom");
    };
    const events = [];
    for await (const e of orchestrate(passages, failing)) events.push(e);
    expect(events).toEqual([{ type: "handoff", reason: "error" }]);
  });
});

describe("helpers", () => {
  it("detects malformed citations", () => {
    expect(hasMalformedCitation("ok [[c1]]")).toBe(false);
    expect(hasMalformedCitation("bad [[c1")).toBe(true);
    expect(hasMalformedCitation("bad ]]")).toBe(true);
  });

  it("stems content words and ignores citations and stop words", () => {
    expect([...contentStems("Submitting applications [[c1]] with the office")]).toEqual([
      "submi",
      "appli",
      "offic",
    ]);
    expect(isGrounded("Apply in person.", [pesel.content])).toBe(true);
  });

  it("escapes data in the prompt, including attribute quotes", () => {
    const prompt = buildPrompt('He said "hi" & <script>', [
      { ...pesel, guideTitle: 'A "quoted" & <b>title</b>' },
    ]);
    expect(prompt).not.toContain("<script>");
    expect(prompt).not.toContain('"quoted"');
    expect(prompt).toContain('guide="A &quot;quoted&quot; &amp; ‹b›title‹/b›"');
  });
});

describe("redaction", () => {
  it.each([
    ["My name is Anna Kowalska and I need a PESEL", "Anna"],
    ["Nazywam się Jan Nowak", "Nowak"],
    ["I live at ul. Floriańska 12/4, 31-019 Kraków", "Floriańska 12"],
    ["account 61 1090 1014 0000 0712 1981 2874", "1090 1014"],
    ["account 61109010140000071219812874", "6110901014"],
    ["iban pl61 1090 1014 0000 0712 1981 2874", "pl61"],
    ["passport ab1234567", "ab1234567"],
    ["call 512 345 678 or +48 12 345 67 89", "512 345"],
    ["write to anna@example.com", "anna@"],
    ["NIP 123-456-78-90", "123-456"],
  ])("removes personal data from %s", (input, secret) => {
    expect(redactPersonalData(input)).not.toContain(secret);
  });

  it("leaves ordinary questions alone", () => {
    for (const q of [
      "How do I get a PESEL number?",
      "When is KSeF mandatory in 2026?",
      "Do I need a trusted profile for MOS?",
    ]) {
      expect(normaliseQuestion(q)).toBe(q);
    }
  });
});

describe("demo adapter answers pass the gate", async () => {
  const { composeDemoAnswer } = await import("@/lib/ai/demo");
  it("cites every sentence and stays grounded, so offline mode always answers", () => {
    const answer = composeDemoAnswer(passages);
    expect(judgeAnswer(answer, passages)).toMatchObject({ ok: true, cited: ["c1", "c2"] });
  });
});

describe("review follow-ups", async () => {
  const { clientIp } = await import("@/lib/client-ip");
  const { factTokens } = await import("@/lib/ai/citations");

  it("drops invented numbers, fees and codes even in short cited sentences", () => {
    expect(judgeAnswer("The fee is 9999 PLN. [[c1]]", passages)).toEqual({
      ok: false,
      reason: "ungrounded",
    });
    expect(judgeAnswer("You must stay over 45 days. [[c1]]", passages)).toEqual({
      ok: false,
      reason: "ungrounded",
    });
    expect(
      judgeAnswer("You get a PESEL automatically for a stay of over 30 days. [[c1]]", passages),
    ).toMatchObject({ ok: true });
  });

  it("ignores digits inside citation ids when collecting facts", () => {
    expect([...factTokens("Over 30 days [[c1x9]]")]).toEqual(["30"]);
    expect([...factTokens("10,000 PLN and 2026")]).toEqual(["10000", "2026", "PLN"]);
  });

  it("redacts Ukrainian and Polish names without touching ordinary questions", () => {
    expect(redactPersonalData("мене звати Олена Шевченко")).not.toContain("Олена");
    expect(redactPersonalData("Nazywam się Jan Nowak")).not.toContain("Nowak");
    for (const q of [
      "This is about residence permits",
      "Jestem obywatelem Ukrainy, czy potrzebuję PESEL?",
      "Я студент, як отримати PESEL?",
    ]) {
      expect(redactPersonalData(q)).toBe(q);
    }
  });

  it("trusts X-Forwarded-For only through configured proxy hops", () => {
    expect(clientIp("1.2.3.4", 0)).toBeNull();
    expect(clientIp("6.6.6.6, 1.2.3.4", 1)).toBe("1.2.3.4");
    expect(clientIp("6.6.6.6, 1.2.3.4, 10.0.0.1", 2)).toBe("1.2.3.4");
    expect(clientIp("not-an-ip", 1)).toBeNull();
    expect(clientIp(null, 1)).toBeNull();
  });
});
