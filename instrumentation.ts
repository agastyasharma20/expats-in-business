/**
 * Runs once when the server starts. Warms up the local embedding model in the background, so the
 * first concierge question does not pay the model load (which briefly blocks the event loop and
 * would slow every other request at that moment). Skipped during builds; never blocks startup.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  setTimeout(() => {
    void import("./lib/ai/embeddings")
      .then(({ embed }) => embed(["warm up"]))
      .then(() => console.info("[concierge] embedding model ready"))
      .catch((error: unknown) =>
        console.warn("[concierge] embedding warm-up skipped:", (error as Error).message),
      );
  }, 1000);
}
