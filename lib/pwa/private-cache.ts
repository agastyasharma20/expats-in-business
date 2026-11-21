/**
 * Tickets saved on this device so they open without a connection (browser only).
 * Only the ticket page writes here, only for the signed-in owner's confirmed ticket, entries
 * expire a day after the event ends, and signing out wipes everything.
 */
import { CACHE_NAMES } from "./rules";

/** localStorage key of the list of saved tickets (the offline page reads it). */
export const SAVED_TICKETS_KEY = "eib:saved-tickets";
const INDEX_KEY = SAVED_TICKETS_KEY;
const MAX_SAVED = 12;
const KEEP_AFTER_EVENT_MS = 24 * 60 * 60 * 1000;

export type SavedTicket = {
  path: string;
  title: string;
  /** ISO start time, for sorting. */
  startsAt: string;
  /** Start time already formatted in the chapter's time zone and the member's language. */
  when: string;
  /** Epoch milliseconds after which the copy is removed. */
  expiresAt: number;
};

/** Reads the stored list defensively: anything malformed is ignored. */
export function parseSavedTickets(raw: string | null | undefined, now = Date.now()): SavedTicket[] {
  try {
    const parsed: unknown = JSON.parse(raw ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is SavedTicket =>
          typeof item?.path === "string" &&
          item.path.startsWith("/") &&
          typeof item?.title === "string" &&
          typeof item?.startsAt === "string" &&
          typeof item?.when === "string" &&
          typeof item?.expiresAt === "number" &&
          item.expiresAt > now,
      )
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  } catch {
    return [];
  }
}

function readIndex(): SavedTicket[] {
  try {
    return parseSavedTickets(window.localStorage.getItem(INDEX_KEY), 0);
  } catch {
    return [];
  }
}

function writeIndex(entries: SavedTicket[]) {
  try {
    window.localStorage.setItem(INDEX_KEY, JSON.stringify(entries));
  } catch {
    // Storage blocked: the offline page just shows no list.
  }
}

export function cacheSupported(): boolean {
  return typeof window !== "undefined" && "caches" in window;
}

async function removeFromCache(paths: string[]) {
  if (!cacheSupported() || paths.length === 0) return;
  try {
    const cache = await window.caches.open(CACHE_NAMES.private);
    await Promise.all(paths.map((path) => cache.delete(path, { ignoreSearch: true })));
  } catch {
    // Nothing to clean up.
  }
}

/** Saved tickets that have not expired, soonest event first. Expired copies are removed. */
export function listSavedTickets(now = Date.now()): SavedTicket[] {
  const all = readIndex();
  const live = all.filter((entry) => entry.expiresAt > now);
  if (live.length !== all.length) {
    writeIndex(live);
    void removeFromCache(all.filter((entry) => entry.expiresAt <= now).map((e) => e.path));
  }
  return live.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

export async function isTicketSaved(path: string): Promise<boolean> {
  if (!cacheSupported()) return false;
  try {
    const cache = await window.caches.open(CACHE_NAMES.private);
    return Boolean(await cache.match(path, { ignoreSearch: true, ignoreVary: true }));
  } catch {
    return false;
  }
}

/** Fetches the ticket page again and keeps the copy. Returns false when it could not be saved. */
export async function saveTicketOffline(
  ticket: Omit<SavedTicket, "expiresAt"> & { endsAt: string },
): Promise<boolean> {
  if (!cacheSupported()) return false;
  try {
    const response = await fetch(ticket.path, { credentials: "same-origin" });
    // Redirects (signed out, wrong member) and errors are never kept.
    if (!response.ok || response.redirected) return false;
    const cache = await window.caches.open(CACHE_NAMES.private);
    await cache.put(ticket.path, response);
    const { endsAt, ...entry } = ticket;
    const expiresAt = new Date(endsAt).getTime() + KEEP_AFTER_EVENT_MS;
    const added = { ...entry, expiresAt };
    const all = [...readIndex().filter((item) => item.path !== ticket.path), added];
    const kept = [...all].sort((a, b) => b.expiresAt - a.expiresAt).slice(0, MAX_SAVED);
    writeIndex(kept);
    await removeFromCache(all.filter((item) => !kept.includes(item)).map((item) => item.path));
    return true;
  } catch {
    return false;
  }
}

/** Removes every saved ticket from this device. Call when the member signs out. */
export async function clearPrivateData(): Promise<void> {
  try {
    window.localStorage.removeItem(INDEX_KEY);
  } catch {
    // Storage blocked: nothing was saved there.
  }
  if (!cacheSupported()) return;
  try {
    await window.caches.delete(CACHE_NAMES.private);
  } catch {
    // Cache unavailable: nothing was saved there.
  }
}
