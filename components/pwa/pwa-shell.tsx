import { AppTabBar } from "./app-tab-bar";
import { InstallDialog } from "./install-dialog";
import { InstallPrompt } from "./install-prompt";
import { NetworkBanner } from "./network-banner";
import { PwaRegistrar } from "./pwa-registrar";

/** Everything the installable app adds around a page. Mounted once in the root layout. */
export function PwaShell() {
  return (
    <>
      <PwaRegistrar />
      <NetworkBanner />
      <InstallPrompt />
      <InstallDialog />
      <AppTabBar />
    </>
  );
}
