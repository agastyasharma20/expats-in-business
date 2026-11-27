# Guides verification record

Checked on **2026-11-27** against official pages only (CLAUDE.md rule 4). Each guide carries `lastVerified`
and cites the pages it was checked against. This is general information, not legal advice. Items below that say
"could not verify" are stated plainly inside the guide as well, and are never presented as fact.

How it was done: one research pass per topic read the official pages, quoted them and reported
CONFIRMED, CHANGED or COULD NOT VERIFY. Only confirmed facts, with their source, went into the guides.
`tests/unit/guides.test.ts` now refuses a verified guide that still contains a "TODO (verify)", any guide older
than the re-verification window, a slug used twice across countries, and any source outside the official-host list
(`config/official-sources.ts`).

## Poland (8 guides, all re-checked)

| Guide                      | Result                                                                                                                                                                                                                                                   |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Basic payment account      | Confirmed against the 2026 consolidated Payment Services Act. Added: the right covers anyone legally staying in the EU, refusal grounds, 10-business-day written reasons, 2026 closure-notice rule. Could not verify: a person with no residence permit. |
| Health insurance           | Updated from the NFZ page of 27 Oct 2026: cover starts no earlier than the application day; extra fee amounts; 2026 minimum contribution; who is insured through work or a business. Could not verify: contract for specific work.                       |
| Information Point (Kraków) | Hours, address, phone, email confirmed (2026 pages). Corrected: the City commissions it and a foundation runs it. Could not verify: staff languages (shown as "ask when you call").                                                                      |
| KSeF                       | Dates confirmed. Added: from 1 Jan 2027 all invoices go through KSeF, token access ends 31 Dec 2026, sole-trader access steps. Could not verify: login with a foreign passport alone.                                                                    |
| MOS residence portal       | All claims confirmed. Added: the paper-filing list, fee per permit type, 50 zł reduced card fee.                                                                                                                                                         |
| PESEL                      | Corrected: in-person filing now applies only to non-EU/EFTA/EEA/Swiss foreigners (since 1 Jan 2026). Added the legal-basis field. Could not verify: an official list of reasons (the guide says so).                                                     |
| Trusted profile            | Corrected: a foreign passport is **not** accepted for the video call. Added e-ID card, qualified certificate, mObywatel authorisation. Removed unverified service examples.                                                                              |
| ZUS for sole traders       | Added the 2026 amounts, deadlines and forms. Could not verify: 2027 amounts (not published), a possible change of the accident rate.                                                                                                                     |

## India (5 new guides)

Visas, FRRO registration, tax residency and Aadhaar and GST, banking, business setup. Sources: Indian Visa Online,
Bureau of Immigration, Ministry of External Affairs, Income Tax Department, UIDAI, GST portal, Reserve Bank of India,
Invest India, Startup India.

Could not verify (said so in the guides): the 2025 Immigration and Foreigners Rules and the FRRO fee list, PAN fees
and the current PAN form, ordinary GST thresholds, the MCA and DPIIT pages (blocked), the minimum capital rule.

## Sri Lanka (4 new guides)

Visas and the ETA, TIN/income tax/VAT, banking and money, starting a business. Sources: Department of Immigration
and Emigration, ETA site, Inland Revenue Department, Financial Intelligence Unit, Customs, Board of Investment,
Parliament of Sri Lanka (Acts).

Could not verify (said so in the guides): the Central Bank's foreign-currency account rules (site blocked), the
Registrar of Companies' fees and name-reservation steps (site unreachable), how to convert a visit visa into a
residence visa, tax rates for the 2026/27 year of assessment.

## Notes on sources

- The Sri Lanka immigration site prints the current date as "last updated" on every page; it is not a revision date.
- India's Bureau of Immigration shows a site-wide date, not a per-page date.
- Re-verify these guides at least every 90 days, and straight after any change in the rules named above.
