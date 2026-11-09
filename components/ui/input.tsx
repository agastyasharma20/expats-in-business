import * as React from "react";
import { cn } from "@/lib/utils";

import { controlStyles } from "./control-styles";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        controlStyles,
        "h-11 py-2 file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-small file:font-semibold file:text-ink",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
