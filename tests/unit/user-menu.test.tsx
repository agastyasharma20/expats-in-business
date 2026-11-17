import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { UserMenu } from "@/components/auth/user-menu";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => (key === "account" ? "Account menu" : key),
}));
vi.mock("@/lib/auth/client", () => ({ authClient: { signOut: vi.fn() } }));
vi.mock("@/lib/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

/** WCAG 2.5.3 Label in Name: the button's accessible name must contain the text people can see. */
describe("account menu button", () => {
  it("has an accessible name that starts with the visible member name", () => {
    render(
      <UserMenu
        name="Karim Demo"
        profileSlug={null}
        showAdmin={false}
        showProvider={false}
        showRoulette={false}
        showModeration={false}
      />,
    );
    const button = screen.getByTestId("user-menu");
    expect(button).toHaveAccessibleName("Karim Demo, Account menu");
    expect(button.textContent).toContain("Karim Demo");
    expect(button.getAttribute("aria-label")).toContain(button.textContent ?? "");
  });
});
