import { describe, expect, it } from "vitest";

import {
  complementScore,
  matchParticipants,
  weekStart,
  type Participant,
} from "@/lib/community/roulette";

const person = (
  id: string,
  goals: string[] = ["meet-people"],
  skills: string[] = [id],
  optedIn = true,
): Participant => ({ id, goals, skills, optedIn });
const now = new Date("2026-11-16T09:00:00Z");
const ids = (groups: string[][]) => groups.flat().sort();

describe("Coffee Roulette matching", () => {
  it("never matches anyone with themselves and uses everyone exactly once", () => {
    const people = ["a", "b", "c", "d", "e", "f"].map((id) => person(id));
    const { groups, unmatched } = matchParticipants(people, [], "week-1", now);
    expect(unmatched).toEqual([]);
    expect(ids(groups)).toEqual(["a", "b", "c", "d", "e", "f"]);
    for (const group of groups) expect(new Set(group).size).toBe(group.length);
    expect(groups.every((g) => g.length === 2)).toBe(true);
  });

  it("does not repeat a pair within 8 weeks, but may after", () => {
    const people = [person("a"), person("b")];
    const recent = [{ members: ["a", "b"], at: new Date("2026-10-20T00:00:00Z") }];
    const result = matchParticipants(people, recent, "s", now);
    expect(result.groups).toEqual([]);
    expect(result.unmatched.sort()).toEqual(["a", "b"]);
    const old = [{ members: ["a", "b"], at: new Date("2026-08-01T00:00:00Z") }];
    expect(matchParticipants(people, old, "s", now).groups).toHaveLength(1);
  });

  it("treats every pair inside an earlier trio as met", () => {
    const people = [person("a"), person("b"), person("c")];
    const recent = [{ members: ["a", "b", "c"], at: new Date("2026-11-09T00:00:00Z") }];
    const result = matchParticipants(people, recent, "s", now);
    expect(result.groups).toEqual([]);
  });

  it("respects opt-outs and ignores duplicates", () => {
    const people = [person("a"), person("b"), person("c", ["x"], ["c"], false), person("a")];
    const { groups, unmatched } = matchParticipants(people, [], "s", now);
    expect(ids(groups)).toEqual(["a", "b"]);
    expect(unmatched).toEqual([]);
  });

  it("forms a trio when the count is odd", () => {
    const people = ["a", "b", "c", "d", "e"].map((id) => person(id));
    const { groups, unmatched } = matchParticipants(people, [], "odd", now);
    expect(unmatched).toEqual([]);
    expect(groups.map((g) => g.length).sort()).toEqual([2, 3]);
    expect(ids(groups)).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("is deterministic for a seed and changes with the seed", () => {
    const people = "abcdefghij".split("").map((id) => person(id));
    const first = matchParticipants(people, [], "chapter:krk:2026-11-16", now);
    expect(matchParticipants(people, [], "chapter:krk:2026-11-16", now)).toEqual(first);
    const others = ["s1", "s2", "s3", "s4"].map((s) =>
      JSON.stringify(matchParticipants(people, [], s, now).groups),
    );
    expect(new Set(others).size).toBeGreaterThan(1);
  });

  it("prefers complementary partners: shared goals and different skills", () => {
    const founder = person("founder", ["find-clients"], ["sales"]);
    const designer = person("designer", ["find-clients"], ["design"]);
    const twin = person("twin", ["give-back"], ["sales"]);
    expect(complementScore(founder, designer)).toBeGreaterThan(complementScore(founder, twin));
    for (const seed of ["a", "b", "c", "d"]) {
      const { groups } = matchParticipants(
        [founder, designer, twin, person("x", ["give-back"], ["cooking"])],
        [],
        seed,
        now,
      );
      const pairOfFounder = groups.find((g) => g.includes("founder"))!;
      expect(pairOfFounder).toContain("designer");
    }
  });

  it("matches priority (Member Plus) participants first", () => {
    // Three people who all met each other except p+a: only one pair is possible.
    const people = [person("a"), person("b"), { ...person("p"), priority: true }];
    const recent = [{ members: ["a", "b"], at: new Date("2026-11-09T00:00:00Z") }];
    for (const seed of ["s1", "s2", "s3", "s4", "s5"]) {
      const { groups } = matchParticipants(people, recent, seed, now);
      expect(groups.flat()).toContain("p");
    }
  });

  it("weeks start on Monday UTC", () => {
    expect(weekStart(new Date("2026-11-18T22:00:00Z")).toISOString()).toBe(
      "2026-11-16T00:00:00.000Z",
    );
    expect(weekStart(new Date("2026-11-16T00:00:00Z")).toISOString()).toBe(
      "2026-11-16T00:00:00.000Z",
    );
  });
});
