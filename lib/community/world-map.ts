import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { geoEqualEarth, geoPath } from "d3-geo";
import { cacheLife } from "next/cache";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";

export const MAP_WIDTH = 960;
export const MAP_HEIGHT = 500;

export type CountryShape = { iso2: string | null; name: string; d: string };

type Props = { name?: string; iso2?: string };

/**
 * Country outlines as SVG path strings, projected once on the server (Equal Earth, so areas are
 * comparable) and cached: the browser gets plain SVG and no map JavaScript or tile requests.
 */
export async function worldShapes(): Promise<CountryShape[]> {
  "use cache";
  cacheLife("max");
  const file = path.join(process.cwd(), "public", "maps", "countries-110m.json");
  const topo = JSON.parse(await readFile(file, "utf8")) as Topology<{
    countries: GeometryCollection<Props>;
  }>;
  const collection = feature(topo, topo.objects.countries);
  const projection = geoEqualEarth().fitSize([MAP_WIDTH, MAP_HEIGHT], collection);
  const toPath = geoPath(projection).digits(1);
  return collection.features
    .filter((f) => f.properties?.name !== "Antarctica")
    .map((f) => ({
      iso2: f.properties?.iso2 ?? null,
      name: f.properties?.name ?? "",
      d: toPath(f) ?? "",
    }))
    .filter((shape) => shape.d);
}
