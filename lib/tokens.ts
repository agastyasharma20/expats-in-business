import { createHash } from "node:crypto";

/** SHA-256 of a single-use token; only the hash is stored, so a database leak reveals no live links. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
