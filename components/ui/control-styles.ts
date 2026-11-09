// Shared look for text inputs, textareas and select triggers. 44px tall, 16px text (no iOS zoom),
// 3:1 border, focus outline, and a red border plus outline when aria-invalid is set.
export const controlStyles =
  "w-full min-w-0 rounded-lg border border-input bg-surface px-3 text-body text-ink outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 aria-invalid:border-danger aria-invalid:outline-2 aria-invalid:outline-offset-0 aria-invalid:outline-danger";
