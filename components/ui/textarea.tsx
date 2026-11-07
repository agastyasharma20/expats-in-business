import * as React from "react";
import { cn } from "cn";

import { controlStyles } from "./control-styles";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(controlStyles, "flex field-sizing-content min-h-28 py-2.5", className)}
      {...props}
    />
  );
}

export { Textarea };
