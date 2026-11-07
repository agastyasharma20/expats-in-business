"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button, type ButtonProps } from "@/components/ui/button";

type DemoButtonProps = Omit<ButtonProps, "onClick" | "asChild"> & {
  /** Name shown in the toast; defaults to the button text. */
  name?: string;
};

/** Styleguide-only button: clicking it explains that it is an example (no silent no-op buttons). */
export function DemoButton({ name, children, ...props }: DemoButtonProps) {
  const t = useTranslations("styleguide");
  const label = name ?? (typeof children === "string" ? children : "");
  return (
    <Button type="button" onClick={() => toast(t("pressed", { name: label }))} {...props}>
      {children}
    </Button>
  );
}
