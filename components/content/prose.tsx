import type { MDXComponents } from "next-mdx-remote-client/rsc";

import NextLink from "next/link";

import { ExternalLinkBase } from "@/components/common/external-link";
import { getPathname } from "@/lib/i18n/navigation";
import type { Locale } from "@/lib/i18n/routing";
import { cn } from "@/lib/utils";

/** Typography wrapper for long-form content (legal pages now, guides from Milestone 4). */
export function Prose({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("flex max-w-prose flex-col gap-5 text-ink", className)}>{children}</div>
  );
}

const linkClass = "font-semibold text-primary underline underline-offset-4 hover:text-brand-800";

type ProseOptions = {
  locale: Locale;
  /** EiB contact email (config/facts.ts), rendered by <ContactEmail /> in MDX. */
  contactEmail?: string;
  /** Translated "(opens in a new tab)": passed in because MDX may render inside "use cache". */
  newTabLabel: string;
};

function createProseLink({ locale, newTabLabel }: ProseOptions) {
  return function ProseLink({ href = "", children }: React.ComponentProps<"a">) {
    if (href.startsWith("/")) {
      return (
        <NextLink href={getPathname({ href, locale })} className={linkClass}>
          {children}
        </NextLink>
      );
    }
    if (href.startsWith("mailto:") || href.startsWith("#")) {
      return (
        <a href={href} className={linkClass}>
          {children}
        </a>
      );
    }
    return (
      <ExternalLinkBase href={href} newTabLabel={newTabLabel}>
        {children}
      </ExternalLinkBase>
    );
  };
}

/** Element mapping used by every MDX document, so content files never carry styling. */
export function createProseComponents(options: ProseOptions): MDXComponents {
  return {
    h2: (props) => <h2 className="mt-6 text-h2" {...props} />,
    h3: (props) => <h3 className="mt-4 text-h3" {...props} />,
    p: (props) => <p className="leading-relaxed" {...props} />,
    ul: (props) => (
      <ul className="flex list-disc flex-col gap-2 pl-6 marker:text-brand-700" {...props} />
    ),
    ol: (props) => <ol className="flex list-decimal flex-col gap-2 pl-6" {...props} />,
    li: (props) => <li className="pl-1" {...props} />,
    a: createProseLink(options),
    // JSX written inside MDX bypasses the element mapping, so content uses this instead of <a>.
    ContactEmail: () =>
      options.contactEmail ? (
        <a href={`mailto:${options.contactEmail}`} className={linkClass}>
          {options.contactEmail}
        </a>
      ) : null,
    strong: (props) => <strong className="font-bold text-brand-950" {...props} />,
    code: (props) => (
      <code className="rounded bg-muted px-1.5 py-0.5 text-small text-brand-950" {...props} />
    ),
    blockquote: (props) => (
      <div
        role="note"
        className="rounded-xl border-l-4 border-warning bg-warning-50 px-5 py-4 text-ink [&_p]:leading-normal [&_strong]:text-warning"
        {...props}
      />
    ),
    table: (props) => (
      <div
        role="region"
        tabIndex={0}
        className="relative w-full overflow-x-auto rounded-xl border border-line bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <table className="w-full min-w-[32rem] border-collapse text-left text-small" {...props} />
      </div>
    ),
    thead: (props) => <thead className="bg-muted text-brand-950" {...props} />,
    th: (props) => <th scope="col" className="p-3 font-bold" {...props} />,
    td: (props) => <td className="border-t border-line p-3 align-top" {...props} />,
  };
}
