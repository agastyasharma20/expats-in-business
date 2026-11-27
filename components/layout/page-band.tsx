import { cn } from "@/lib/utils";

type PageBandProps = {
  eyebrow: string;
  title: string;
  lead: string;
  /** Buttons or links under the lead. */
  actions?: React.ReactNode;
  className?: string;
};

/**
 * Deep Teal hero band for public story pages (About, Partners, Stories). The title is the page's
 * h1 and, with the lead, the largest paint, so the entrance only moves it and never fades it.
 */
export function PageBand({ eyebrow, title, lead, actions, className }: PageBandProps) {
  return (
    <header className={cn("bg-brand-950 text-on-dark", className)}>
      <div className="container-page flex animate-rise-move flex-col gap-4 py-14 lg:py-20">
        <p className="eyebrow text-on-dark-muted">{eyebrow}</p>
        <h1 className="max-w-3xl text-display-sm text-on-dark lg:text-display">{title}</h1>
        <p className="max-w-2xl text-h3 font-normal text-on-dark-muted">{lead}</p>
        {actions ? <div className="flex flex-wrap gap-3 pt-2">{actions}</div> : null}
      </div>
    </header>
  );
}
