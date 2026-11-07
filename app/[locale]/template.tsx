import { PageTransition } from "@/components/motion/page-transition";

// Remounts on every navigation, which drives the page transition.
export default function LocaleTemplate({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
