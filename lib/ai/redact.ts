/**
 * Removes personal data from a question before it reaches any model or the query log (CLAUDE.md:
 * never send personal data to an LLM). Pure and unit-tested. Order matters: specific patterns first.
 * Best effort by design; the UI also asks members not to type personal details.
 */
const RULES: { label: string; pattern: RegExp }[] = [
  { label: "[email]", pattern: /[\p{L}0-9._%+-]+@[\p{L}0-9.-]+\.[\p{L}]{2,}/giu },
  { label: "[url]", pattern: /\b(?:https?:\/\/|www\.)\S+/gi },
  // IBAN with country prefix (spaces allowed), any case.
  {
    label: "[iban]",
    pattern: /\b[A-Z]{2}\d{2}(?:[\s-]?[A-Z0-9]{4}){3,7}(?:[\s-]?[A-Z0-9]{1,4})?\b/gi,
  },
  // Long digit runs: Polish NRB account numbers (26 digits) and other account numbers, with spaces.
  { label: "[account]", pattern: /\b\d{2}(?:[\s-]?\d{4}){5,8}\b|\b\d{20,34}\b/g },
  { label: "[card]", pattern: /\b(?:\d[ -]?){13,19}\b/g },
  { label: "[pesel]", pattern: /\b\d{11}\b/g },
  { label: "[nip]", pattern: /\b\d{3}-?\d{3}-?\d{2}-?\d{2}\b/g },
  {
    label: "[phone]",
    pattern:
      /(?:\+|\b00)\d{1,3}[\s-]?(?:\(?\d{1,4}\)?[\s-]?){2,4}\d{2,4}\b|\b\d{3}[\s-]\d{3}[\s-]\d{3}\b|\b\d{9}\b/g,
  },
  // Passport and ID cards: two or three letters then 6–7 digits, any case.
  { label: "[document]", pattern: /\b[A-Z]{2,3}\s?\d{6,7}\b/gi },
  // Street addresses (Polish and English forms) with a house number.
  {
    label: "[address]",
    pattern:
      /\b(?:ul|al|os|pl|aleja|ulica|osiedle|street|st|road|rd|avenue|ave)\.?\s+[\p{L}.\- ]{2,40}?\s\d{1,4}[a-z]?(?:\s?\/\s?\d{1,4})?\b/giu,
  },
  { label: "[postcode]", pattern: /\b\d{2}-\d{3}\b/g },
  // Self-introductions: "my name is Anna Kowalska", "nazywam się …", "мене звати …".
  {
    label: "[name]",
    pattern:
      /\b(?:my name is|i am called|i'm called|this is|nazywam się|mam na imię|jestem|мене звати|я)\s+\p{Lu}[\p{L}'-]+(?:\s+\p{Lu}[\p{L}'-]+){0,2}/giu,
  },
];

export function redactPersonalData(text: string): string {
  let result = text;
  for (const rule of RULES) result = result.replace(rule.pattern, rule.label);
  return result.replace(/\s{2,}/g, " ").trim();
}

/** Questions are short by design; longer input is cut (also limits prompt-injection payloads). */
export const MAX_QUESTION_LENGTH = 500;

export function normaliseQuestion(raw: string): string {
  const clean = raw.normalize("NFC").replace(/[\u0000-\u001f\u007f]/g, " ");
  return redactPersonalData(clean).slice(0, MAX_QUESTION_LENGTH);
}
