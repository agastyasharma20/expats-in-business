import { magicLinkClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/** Browser-side auth calls (sign in, sign out). Same origin, so no baseURL is needed. */
export const authClient = createAuthClient({ plugins: [magicLinkClient()] });
