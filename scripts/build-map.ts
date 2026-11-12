/**
 * npm run map:build: copies the Natural Earth 110m countries TopoJSON (world-atlas, public
 * domain data) into public/maps and tags each country with its ISO 3166-1 alpha-2 code, so the
 * Bubbles map needs no lookup table at runtime. Run once; the output is committed.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import countries from "i18n-iso-countries";

type Geometry = { id?: string; properties?: { name?: string; iso2?: string } };

async function main() {
  const source = path.join(process.cwd(), "node_modules", "world-atlas", "countries-110m.json");
  const topo = JSON.parse(await readFile(source, "utf8")) as { objects: { countries: { geometries: Geometry[] } } };
  let tagged = 0;
  for (const geometry of topo.objects.countries.geometries) {
    const iso2 = geometry.id ? countries.numericToAlpha2(geometry.id) : undefined;
    geometry.properties = { name: geometry.properties?.name ?? "", ...(iso2 && { iso2 }) };
    if (iso2) tagged += 1;
  }
  const target = path.join(process.cwd(), "public", "maps", "countries-110m.json");
  await writeFile(target, JSON.stringify(topo));
  console.info(`map:build wrote ${target}: ${tagged}/${topo.objects.countries.geometries.length} countries tagged`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
