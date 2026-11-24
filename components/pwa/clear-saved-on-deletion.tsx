"use client";

import { useEffect } from "react";

import { clearPrivateData } from "@/lib/pwa/private-cache";

/**
 * Rendered only while an account deletion is scheduled: removes the tickets saved for offline use
 * from this device, the same wipe as signing out. Renders nothing.
 */
export function ClearSavedOnDeletion() {
  useEffect(() => {
    void clearPrivateData();
  }, []);
  return null;
}
