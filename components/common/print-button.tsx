"use client";

import { PrinterIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Opens the browser print dialog (the page has a print stylesheet); hidden in print. */
export function PrintButton({ label }: { label: string }) {
  return (
    <Button type="button" variant="outline" onClick={() => window.print()} data-print-hide>
      <PrinterIcon aria-hidden="true" />
      {label}
    </Button>
  );
}
