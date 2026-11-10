// Link crawler: starts from every nav and footer route in every locale, follows internal links,
// and fails on 4xx/5xx responses, duplicate links inside the header or footer, and external links
// that do not open safely. Needs a running app:
//   npm run dev   (or npm run build && npm start)   then   npm run crawl
// Options: CRAWL_BASE_URL (default http://localhost:3000), CRAWL_MAX_PAGES (default 200).
import { allInternalHrefs } from "../lib/nav";
import { locales, routing } from "../lib/i18n/routing";

const base = new URL(process.env.CRAWL_BASE_URL ?? "http://localhost:3000");
const maxPages = Number(process.env.CRAWL_MAX_PAGES ?? 200);

type Problem = { page: string; issue: string };
const problems: Problem[] = [];

function localized(href: string, locale: string): string {
  if (locale === routing.defaultLocale) return href;
  return href === "/" ? `/${locale}` : `/${locale}${href}`;
}

function attributes(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const match of tag.matchAll(/([a-zA-Z-:]+)=("([^"]*)"|'([^']*)')/g)) {
    out[match[1]!.toLowerCase()] = match[3] ?? match[4] ?? "";
  }
  return out;
}

function anchors(html: string) {
  return [...html.matchAll(/<a\b[^>]*>/gi)].map((match) => attributes(match[0]));
}

function section(html: string, tag: "header" | "footer"): string {
  const match = new RegExp(`<${tag}\\b[\\s\\S]*?</${tag}>`, "i").exec(html);
  return match?.[0] ?? "";
}

function checkDuplicates(page: string, html: string, tag: "header" | "footer") {
  // The header repeats links in the mobile sheet only after opening it, so server HTML has one
  // copy per menu; any duplicate href inside one nav element is a bug (old bug 11).
  for (const nav of section(html, tag).match(/<nav\b[\s\S]*?<\/nav>/gi) ?? []) {
    const hrefs = anchors(nav)
      .map((a) => a.href)
      .filter(Boolean);
    const dupes = hrefs.filter((href, index) => hrefs.indexOf(href) !== index);
    if (dupes.length)
      problems.push({ page, issue: `duplicate ${tag} links: ${[...new Set(dupes)].join(", ")}` });
  }
}

function checkExternal(page: string, link: Record<string, string>) {
  const rel = (link.rel ?? "").split(/\s+/);
  if (link.target !== "_blank" || !rel.includes("noopener") || !rel.includes("noreferrer")) {
    problems.push({
      page,
      issue: `external link without target=_blank rel="noopener noreferrer": ${link.href}`,
    });
  }
}

async function crawl() {
  const queue = locales.flatMap((locale) =>
    allInternalHrefs().map((href) => localized(href, locale)),
  );
  const seen = new Set<string>();
  let visited = 0;

  while (queue.length && visited < maxPages) {
    const path = queue.shift()!;
    if (seen.has(path)) continue;
    seen.add(path);
    visited += 1;

    const response = await fetch(new URL(path, base), { redirect: "follow" });
    if (!response.ok) {
      problems.push({ page: path, issue: `HTTP ${response.status}` });
      continue;
    }
    const html = await response.text();
    checkDuplicates(path, html, "header");
    checkDuplicates(path, html, "footer");

    for (const link of anchors(html)) {
      const href = link.href;
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:"))
        continue;
      const url = new URL(href, base);
      if (url.origin !== base.origin) {
        checkExternal(path, link);
        continue;
      }
      if (url.pathname.startsWith("/_next") || url.pathname.startsWith("/api")) continue;
      if (!seen.has(url.pathname)) queue.push(url.pathname);
    }
  }
  return visited;
}

const visited = await crawl();
if (problems.length) {
  console.error(`✗ Crawled ${visited} pages, found ${problems.length} problem(s):`);
  for (const { page, issue } of problems) console.error(`  ${page}: ${issue}`);
  process.exit(1);
}
console.info(
  `✓ Crawled ${visited} pages from ${base.origin}: no broken links, duplicates or unsafe external links.`,
);
