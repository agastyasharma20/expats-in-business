/**
 * Install state shared by the install prompt and the footer link (browser only).
 * Chrome and Edge give us a deferred "beforeinstallprompt" event; iOS Safari has no such event,
 * so there we only show the "Add to Home Screen" steps.
 */
type InstallChoice = { outcome: "accepted" | "dismissed" };

type BeforeInstallPromptEvent = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<InstallChoice>;
};

export type InstallState = {
  /** The browser can show its own install dialog. */
  canPrompt: boolean;
  /** iOS browser that needs the manual "Add to Home Screen" steps. */
  ios: boolean;
  /** Already running as an installed app. */
  standalone: boolean;
};

const SERVER_STATE: InstallState = { canPrompt: false, ios: false, standalone: false };

let state: InstallState = SERVER_STATE;
let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function update(patch: Partial<InstallState>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

export function subscribeInstall(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const getInstallState = () => state;
export const getServerInstallState = () => SERVER_STATE;

/** Attaches the browser listeners once (from the app shell). Returns a cleanup function. */
export function startInstallListeners(): () => void {
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const appleDevice =
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  update({ standalone, ios: appleDevice && !standalone });

  const onPrompt = (event: Event) => {
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    update({ canPrompt: true });
  };
  const onInstalled = () => {
    deferred = null;
    update({ canPrompt: false, ios: false, standalone: true });
  };
  window.addEventListener("beforeinstallprompt", onPrompt);
  window.addEventListener("appinstalled", onInstalled);
  return () => {
    window.removeEventListener("beforeinstallprompt", onPrompt);
    window.removeEventListener("appinstalled", onInstalled);
  };
}

/** Opens the browser's install dialog. */
export async function promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  if (!deferred) return "unavailable";
  const event = deferred;
  deferred = null;
  update({ canPrompt: false });
  await event.prompt();
  return (await event.userChoice).outcome;
}
