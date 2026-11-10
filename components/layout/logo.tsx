import Image from "next/image";

import { getFact } from "@/config/facts";
import { cn } from "@/lib/utils";

import logoTeal from "@/public/brand/eib-logo.png";
import logoWhite from "@/public/brand/eib-logo-white.png";

type LogoProps = {
  /** "teal" on white or light surfaces, "white" on Deep Teal (brand rule: only these two). */
  tone?: "teal" | "white";
  className?: string;
  priority?: boolean;
};

/** The EiB wordmark (original artwork, see docs/brand/BRAND.md). Width follows the height. */
export function Logo({ tone = "teal", className, priority = false }: LogoProps) {
  return (
    <Image
      src={tone === "white" ? logoWhite : logoTeal}
      alt={getFact("org.name").value}
      priority={priority}
      sizes="160px"
      className={cn("h-10 w-auto", className)}
    />
  );
}
