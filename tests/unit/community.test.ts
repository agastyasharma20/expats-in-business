import { describe, expect, it } from "vitest";

import { getFeatureFlags, mergeFlags } from "@/config/features";
import { parseScopeKey, scopeKey } from "@/config/roulette";
import type { AuthUser } from "@/lib/auth/permissions";
import {
  allowedKinds,
  bodyFingerprint,
  canModerateGroup,
  canPostInGroup,
  cleanPostBody,
  isReaction,
  postVisibility,
  publicCount,
  shadeStep,
  type GroupScope,
  type Membership,
} from "@/lib/community/rules";

const member = (roles: AuthUser["roles"] = []): AuthUser => ({
  id: "u1",
  roles,
  tiers: [],
  ownsProvider: false,
});
const none: Membership = { inBubble: false, isBubbleLead: false, inChapter: false };
const chapterGroup: GroupScope = { kind: "chapter", chapterId: "krk", bubbleId: null };
const bubbleGroup: GroupScope = { kind: "bubble", chapterId: null, bubbleId: "ua" };

describe("group moderation permissions", () => {
  it("lets a Bubble Lead moderate their own Bubble group only", () => {
    const lead = member([{ role: "bubble_lead", chapterId: "krk" }]);
    expect(
      canModerateGroup(lead, bubbleGroup, { ...none, inBubble: true, isBubbleLead: true }),
    ).toBe(true);
    // A lead of another Bubble (not lead here) cannot moderate this one.
    expect(canModerateGroup(lead, bubbleGroup, { ...none, inBubble: true })).toBe(false);
    expect(canModerateGroup(lead, chapterGroup, none)).toBe(false);
  });

  it("lets chapter leads and moderators moderate their chapter group, not another chapter's", () => {
    const lead = member([{ role: "chapter_lead", chapterId: "krk" }]);
    const mod = member([{ role: "moderator", chapterId: "krk" }]);
    expect(canModerateGroup(lead, chapterGroup, none)).toBe(true);
    expect(canModerateGroup(mod, chapterGroup, none)).toBe(true);
    expect(canModerateGroup(lead, { ...chapterGroup, chapterId: "waw" }, none)).toBe(false);
  });

  it("gives admins every group and visitors nothing", () => {
    expect(canModerateGroup(member([{ role: "admin", chapterId: null }]), bubbleGroup, none)).toBe(
      true,
    );
    expect(canModerateGroup(null, bubbleGroup, none)).toBe(false);
    expect(canPostInGroup(null, chapterGroup, { ...none, inChapter: true })).toBe(false);
  });

  it("lets members post where they belong", () => {
    expect(canPostInGroup(member(), bubbleGroup, { ...none, inBubble: true })).toBe(true);
    expect(canPostInGroup(member(), bubbleGroup, none)).toBe(false);
    expect(canPostInGroup(member(), chapterGroup, { ...none, inChapter: true })).toBe(true);
    expect(canPostInGroup(member(), chapterGroup, none)).toBe(false);
  });

  it("keeps announcements for moderators", () => {
    expect(allowedKinds(false)).toEqual(["post", "question"]);
    expect(allowedKinds(true)).toContain("announcement");
  });
});

describe("post visibility", () => {
  const post = { authorId: "author", hiddenAt: null, removedAt: null };
  const viewer = { id: "v", canModerate: false, reportedByViewer: false };

  it("never shows removed posts, even to moderators", () => {
    const removed = { ...post, removedAt: new Date() };
    expect(postVisibility(removed, { ...viewer, canModerate: true })).toBe("hidden");
  });

  it("shows hidden posts only to the author and moderators, marked under review", () => {
    const hidden = { ...post, hiddenAt: new Date() };
    expect(postVisibility(hidden, viewer)).toBe("hidden");
    expect(postVisibility(hidden, { ...viewer, id: "author" })).toBe("underReview");
    expect(postVisibility(hidden, { ...viewer, canModerate: true })).toBe("underReview");
  });

  it("hides a post from the person who reported it", () => {
    expect(postVisibility(post, { ...viewer, reportedByViewer: true })).toBe("hidden");
    expect(postVisibility(post, viewer)).toBe("visible");
  });
});

describe("post text cleaning", () => {
  it("removes invisible and bidi-override characters and extra blank lines", () => {
    const result = cleanPostBody("  Hello​ ‮world\r\n\r\n\r\n\r\nBye  ");
    expect(result).toEqual({ ok: true, body: "Hello world\n\nBye" });
  });

  it("rejects too short, too long and link-stuffed posts", () => {
    expect(cleanPostBody("hi")).toEqual({ ok: false, reason: "length" });
    expect(cleanPostBody("​​​ab")).toEqual({ ok: false, reason: "length" });
    expect(cleanPostBody("x".repeat(2001))).toEqual({ ok: false, reason: "length" });
    const links = "https://a.pl https://b.pl www.c.pl http://d.pl";
    expect(cleanPostBody(links)).toEqual({ ok: false, reason: "links" });
  });

  it("fingerprints ignore case and spacing (duplicate detection)", () => {
    expect(bodyFingerprint("Hello   World\n")).toBe(bodyFingerprint("hello world"));
  });

  it("accepts only allow-listed reactions", () => {
    expect(isReaction("👍")).toBe(true);
    expect(isReaction("<script>")).toBe(false);
    expect(isReaction(undefined)).toBe(false);
  });
});

describe("Bubbles privacy and map", () => {
  it("never publishes counts under 5", () => {
    expect(publicCount(4)).toBeNull();
    expect(publicCount(5)).toBe(5);
  });

  it("shades by share of the largest Bubble", () => {
    expect(shadeStep(null, 10)).toBe(0);
    expect(shadeStep(10, 10)).toBe(4);
    expect(shadeStep(6, 10)).toBe(3);
    expect(shadeStep(5, 10)).toBe(2);
    expect(shadeStep(2, 10)).toBe(1);
  });
});

describe("roulette scopes and feature flags", () => {
  it("round-trips scope keys and rejects anything else", () => {
    expect(parseScopeKey(scopeKey({ kind: "bubble", id: "abc123" }))).toEqual({
      kind: "bubble",
      id: "abc123",
    });
    expect(parseScopeKey("admin:1")).toBeNull();
    expect(parseScopeKey("chapter:../../x")).toBeNull();
  });

  it("applies only valid boolean admin overrides", () => {
    const defaults = getFeatureFlags({
      FEATURE_COFFEE_ROULETTE: true,
      FEATURE_SESSION_PULSE: true,
      FEATURE_BUBBLES_MAP: true,
      FEATURE_PAID_TICKETS: true,
    });
    expect(mergeFlags(defaults, { coffeeRoulette: false }).coffeeRoulette).toBe(false);
    expect(mergeFlags(defaults, { coffeeRoulette: "false", evil: true })).toEqual(defaults);
    expect(mergeFlags(defaults, null)).toEqual(defaults);
    expect(mergeFlags(defaults, [true])).toEqual(defaults);
  });
});
