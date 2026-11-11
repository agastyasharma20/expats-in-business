import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth/auth";

// Better Auth endpoints (sign-in, magic link callback, sign-out, session).
export const { GET, POST } = toNextJsHandler(auth);
