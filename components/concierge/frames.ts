import type { HandoffReason } from "@/lib/ai/concierge";
import type { Passage } from "@/lib/ai/prompt";

export type Turn =
  | { role: "user"; text: string }
  | {
      role: "assistant";
      text: string;
      sources: Passage[];
      cited: string[];
      handoff: HandoffReason | null;
      streaming: boolean;
    };

export type ServerEvent =
  | { type: "quota"; remaining: number | null }
  | { type: "sources"; sources: Passage[] }
  | { type: "text"; text: string }
  | { type: "handoff"; reason: HandoffReason }
  | { type: "done"; cited: string[] };

/** Parses complete "event:/data:" frames out of an SSE buffer; returns events and the remainder. */
export function parseFrames(buffer: string): { events: ServerEvent[]; rest: string } {
  const frames = buffer.split("\n\n");
  const rest = frames.pop() ?? "";
  const events = frames
    .map((frame) => frame.split("\n").find((line) => line.startsWith("data: ")))
    .filter((line): line is string => Boolean(line))
    .map((line) => JSON.parse(line.slice(6)) as ServerEvent);
  return { events, rest };
}
