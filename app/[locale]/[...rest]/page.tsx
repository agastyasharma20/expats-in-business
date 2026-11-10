import { notFound } from "next/navigation";

// A 404 never needs an instant navigation, and this segment always throws notFound(), so opt it
// out of instant-navigation validation (otherwise next dev logs "Could not validate instant").
export const instant = false;

// Any unknown path inside a locale renders app/[locale]/not-found.tsx (with header and footer).
export default function CatchAllNotFound() {
  notFound();
}
