import { notFound } from "next/navigation";

// Any unknown path inside a locale renders app/[locale]/not-found.tsx (with header and footer).
export default function CatchAllNotFound() {
  notFound();
}
