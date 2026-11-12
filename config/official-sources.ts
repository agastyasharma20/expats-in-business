/**
 * Hosts accepted as official sources for guides (government and public bodies only). Guides may
 * cite nothing else, and the concierge cites only guides. Add a country's or city's official
 * domains here when its chapter launches.
 */
export const OFFICIAL_SOURCE_HOSTS: readonly RegExp[] = [
  /(^|\.)gov\.pl$/, // Polish central government (gov.pl, podatki.gov.pl, …)
  /(^|\.)zus\.pl$/, // Social insurance institution
  /(^|\.)krakow\.pl$/, // City of Kraków (chapter #1)
  /(^|\.)europa\.eu$/, // European Union
];
