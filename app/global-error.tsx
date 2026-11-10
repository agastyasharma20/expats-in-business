"use client";

import { TriangleAlertIcon } from "lucide-react";

import { StatusMessage } from "@/components/common/status-message";
import { Button } from "@/components/ui/button";
import en from "@/messages/en.json";

import "./globals.css";

// Last resort when the root layout itself fails: no i18n provider is available, so the default
// catalogue is read directly. Must render its own <html> and <body>.
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  const t = en.errors;
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col bg-background font-sans text-foreground">
        <main className="flex flex-1 flex-col">
          <StatusMessage
            icon={TriangleAlertIcon}
            eyebrow={t.errorEyebrow}
            title={t.errorTitle}
            description={t.errorDescription}
            actions={<Button onClick={() => retry()}>{t.retry}</Button>}
          />
        </main>
      </body>
    </html>
  );
}
