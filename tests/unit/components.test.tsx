import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EmptyState } from "@/components/common/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

describe("Field", () => {
  it("wires label, hint and error to the control", () => {
    render(
      <Field id="email" label="Email" hint="We never share it." error="Enter an email address.">
        {(props) => <Input {...props} />}
      </Field>,
    );
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("We never share it. Enter an email address.");
    expect(screen.getByRole("alert")).toHaveTextContent("Enter an email address.");
  });

  it("is not invalid without an error", () => {
    render(
      <Field id="name" label="Name">
        {(props) => <Input {...props} />}
      </Field>,
    );
    expect(screen.getByLabelText("Name")).not.toHaveAttribute("aria-invalid");
  });
});

describe("Badge", () => {
  it.each(["verified", "founding", "demo", "unconfirmed", "bubble"] as const)(
    "renders the %s variant with its label",
    (variant) => {
      render(<Badge variant={variant}>{variant} label</Badge>);
      const badge = screen.getByText(`${variant} label`);
      expect(badge).toHaveAttribute("data-variant", variant);
    },
  );
});

describe("Button", () => {
  it("keeps the white label on primary buttons (cn must not drop the colour)", () => {
    render(<Button>Join free</Button>);
    const button = screen.getByRole("button", { name: "Join free" });
    expect(button.className).toContain("text-primary-foreground");
    expect(button.className).toContain("text-body");
  });

  it.each([
    // [size, variant, expected class: 44px+ height, or a hit-area extension to 44px]
    ["default", "default", /\bh-11\b/],
    ["lg", "default", /\bh-12\b/],
    ["icon", "default", /\bsize-11\b/],
    ["sm", "default", /h-10 .*before:-inset-y-0\.5/],
    ["icon-sm", "default", /size-10 .*before:-inset-0\.5/],
    ["default", "link", /\bmin-h-11\b/],
  ] as const)("gives size %s (%s variant) a 44px target", (size, variant, expected) => {
    render(
      <Button size={size} variant={variant}>
        Label
      </Button>,
    );
    expect(screen.getByRole("button").className).toMatch(expected);
  });
});

describe("EmptyState", () => {
  it("always renders its next action", () => {
    render(
      <EmptyState
        title="No events yet"
        description="New sessions are announced every month."
        action={<button type="button">See chapters</button>}
      />,
    );
    expect(screen.getByRole("heading", { name: "No events yet" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "See chapters" })).toBeInTheDocument();
  });
});
