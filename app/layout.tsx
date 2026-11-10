// Pass-through root layout: app/[locale]/layout.tsx renders <html>. This file exists so that
// app/not-found.tsx can handle requests outside any locale (next-intl pattern).
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
