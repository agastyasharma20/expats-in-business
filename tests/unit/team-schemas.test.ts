import { describe, expect, it } from "vitest";

import { founderSchema, memberSchema } from "@/lib/team/schemas";

const base = { name: "Demo profile: Test", designation: "Volunteer" };

describe("memberSchema", () => {
  it("accepts a minimal member and defaults the optional fields", () => {
    const parsed = memberSchema.parse(base);
    expect(parsed).toMatchObject({
      grp: "team",
      bio: null,
      linkedinUrl: null,
      email: null,
      startedAt: null,
      endedAt: null,
      showEmail: false,
      isVisible: true,
      sortOrder: 0,
    });
  });

  it("only accepts https LinkedIn links", () => {
    expect(
      memberSchema.safeParse({ ...base, linkedinUrl: "https://www.linkedin.com/in/someone" })
        .success,
    ).toBe(true);
    for (const bad of [
      "http://www.linkedin.com/in/someone",
      "https://evil.example/linkedin.com",
      "https://linkedin.com.evil.example/in/x",
      "javascript:alert(1)",
      "not a url",
    ]) {
      expect(memberSchema.safeParse({ ...base, linkedinUrl: bad }).success, bad).toBe(false);
    }
  });

  it("never shows an email that was not given", () => {
    expect(memberSchema.parse({ ...base, showEmail: true }).showEmail).toBe(false);
    expect(
      memberSchema.parse({ ...base, email: "person@example.com", showEmail: true }).showEmail,
    ).toBe(true);
  });

  it("rejects a bad email, an unknown group and an end before the start", () => {
    expect(memberSchema.safeParse({ ...base, email: "nope" }).success).toBe(false);
    expect(memberSchema.safeParse({ ...base, grp: "board" }).success).toBe(false);
    expect(
      memberSchema.safeParse({ ...base, startedAt: "2025-06", endedAt: "2024-01" }).success,
    ).toBe(false);
  });

  it("turns a month into the first day, in UTC", () => {
    expect(memberSchema.parse({ ...base, startedAt: "2024-03" }).startedAt?.toISOString()).toBe(
      "2024-03-01T00:00:00.000Z",
    );
  });
});

describe("founderSchema", () => {
  const founder = {
    title: "Welcome",
    body: "A message that is long enough to pass.",
    founderName: "Demo profile: Founder",
    designation: "Founder",
  };

  it("accepts a complete message", () => {
    expect(founderSchema.safeParse(founder).success).toBe(true);
  });

  it("rejects an empty or very short message", () => {
    expect(founderSchema.safeParse({ ...founder, body: "Hi" }).success).toBe(false);
    expect(founderSchema.safeParse({ ...founder, title: "" }).success).toBe(false);
  });
});
