import { MailIcon, MessageCircleIcon, UsersIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { ExternalLink } from "@/components/common/external-link";
import { getFact } from "@/config/facts";
import { Link } from "@/lib/i18n/navigation";
import { footerColumns, socialNav } from "@/lib/nav";

import { LanguageSwitcher } from "./language-switcher";
import { Logo } from "./logo";

const linkOnDark =
  "inline-flex min-h-11 items-center text-on-dark underline-offset-4 hover:text-on-dark-muted hover:underline";
const externalOnDark =
  "font-normal text-on-dark no-underline hover:text-on-dark-muted hover:underline";

/**
 * Deep Teal footer. Columns from lib/nav.ts, contact and social links from config/facts.ts.
 * `[--ring:var(--on-dark)]` switches every focus outline inside to white (13.7:1 on Deep Teal).
 */
export function SiteFooter() {
  const t = useTranslations();
  const email = getFact("contact.email").value;

  return (
    <footer className="bg-brand-950 text-on-dark [--ring:var(--on-dark)]">
      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-6">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Logo tone="white" className="h-10 self-start" />
          <p className="text-on-dark-muted">{getFact("org.tagline").value}</p>
          <LanguageSwitcher tone="dark" className="self-start" />
        </div>

        {footerColumns.map((column) => (
          <nav key={column.id} aria-labelledby={`footer-${column.id}`}>
            <h2 id={`footer-${column.id}`} className="eyebrow text-on-dark-muted">
              {t(column.headingKey)}
            </h2>
            <ul className="mt-3 flex flex-col">
              {column.items.map((item) => (
                <li key={item.id}>
                  <Link href={item.href} className={linkOnDark}>
                    {t(item.labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        <div className="flex flex-col gap-8 sm:col-span-2">
          <section aria-labelledby="footer-contact">
            <h2 id="footer-contact" className="eyebrow text-on-dark-muted">
              {t("footer.contact")}
            </h2>
            <ul className="mt-3 flex flex-col">
              <li>
                <a href={`mailto:${email}`} className={`${linkOnDark} gap-2`}>
                  <MailIcon aria-hidden="true" className="size-4" />
                  <span className="sr-only">{t("footer.email")}: </span>
                  <span className="[overflow-wrap:anywhere]">{email}</span>
                </a>
              </li>
              <li>
                <ExternalLink
                  href={getFact("contact.messenger").value}
                  className={`${externalOnDark} min-h-11 gap-2`}
                >
                  <MessageCircleIcon aria-hidden="true" className="size-4" />
                  {t("footer.messenger")}
                </ExternalLink>
              </li>
              <li>
                <ExternalLink
                  href={getFact("community.whatsapp").value}
                  className={`${externalOnDark} min-h-11 gap-2`}
                >
                  <UsersIcon aria-hidden="true" className="size-4" />
                  {t("footer.whatsapp")}
                </ExternalLink>
              </li>
            </ul>
          </section>
          <nav aria-labelledby="footer-connect">
            <h2 id="footer-connect" className="eyebrow text-on-dark-muted">
              {t("footer.connect")}
            </h2>
            <ul className="mt-3 flex flex-wrap gap-x-4">
              {socialNav.map((item) => (
                <li key={item.id}>
                  <ExternalLink
                    href={getFact(item.fact).value}
                    className={`${externalOnDark} min-h-11`}
                  >
                    {t(item.labelKey)}
                  </ExternalLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
      <div className="border-t border-brand-800">
        <p className="container-page py-6 text-small text-on-dark-muted">
          {t("footer.copyright", { name: getFact("org.name").value })}
        </p>
      </div>
    </footer>
  );
}
