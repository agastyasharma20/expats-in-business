import { describe, expect, it } from "vitest";

import { cn } from "@/lib/utils";

describe("cn", () => {
  it("keeps a text colour next to a custom font-size token", () => {
    expect(cn("text-body text-primary-foreground")).toBe("text-body text-primary-foreground");
    expect(cn("text-small", "text-on-dark")).toBe("text-small text-on-dark");
  });

  it("still resolves conflicts within a group", () => {
    expect(cn("text-body", "text-h3")).toBe("text-h3");
    expect(cn("text-ink", "text-danger")).toBe("text-danger");
    expect(cn("shadow-card", "shadow-raised")).toBe("shadow-raised");
  });
});
