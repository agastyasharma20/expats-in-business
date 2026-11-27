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
  // India: central and state government (indianvisaonline.gov.in, incometax.gov.in, frro.gov.in, mca.gov.in, …)
  /(^|\.)gov\.in$/,
  /(^|\.)nic\.in$/, // National Informatics Centre, hosts many government portals
  /^(www\.)?rbi\.org\.in$/, // Reserve Bank of India (the central bank is a public body)
  // Sri Lanka: government (immigration.gov.lk, ird.gov.lk, eta.gov.lk, cbsl.gov.lk, …)
  /(^|\.)gov\.lk$/,
  /^(www\.)?boi\.lk$/, // Board of Investment of Sri Lanka (statutory body)
  /^(www\.)?investsrilanka\.com$/, // Board of Investment's investor portal and investment guide
  /^(www\.)?parliament\.lk$/, // Parliament of Sri Lanka (texts of Acts)
];
