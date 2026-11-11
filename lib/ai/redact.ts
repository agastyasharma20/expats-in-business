/**
 * Removes personal data from a question before it reaches any model or the query log (CLAUDE.md:
 * never send personal data to an LLM). Pure and unit-tested. Order matters: specific patterns first.
 */
const RULES: { label: string; pattern: RegExp }[] = [
  { label: "[email]", pattern: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi },
  { label: "[iban]", pattern: /\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){3,7}(?:\s?[A-Z0-9]{1,4})?\b/g },
  { label: "[card]", pattern: /\b(?:\d[ -]?){13,19}\b/g },
  { label: "[pesel]", pattern: /\b\d{11}\b/g },
  { label: "[phone]", pattern: /(?:\+\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?){2,4}\d{2,4}\b/g },
  { label: "[passport]", pattern: /\b[A-Z]{2}\d{7}\b/g },
  { label: "[url]", pattern: /https?:\/\/\S+/gi },
];

export function redactPersonalData(text: string): string {
  let result = text;
  for (const rule of RULES) result = result.replace(rule.pattern, rule.label);
  return result.replace(/\s{2,}/g, " ").trim();
}

/** Questions are short by design; longer input is cut (also limits prompt-injection payloads). */
export const MAX_QUESTION_LENGTH = 500;

export function normaliseQuestion(raw: string): string {
  return redactPersonalData(raw.normalize("NFC").replace(/[\u0000-\u001f\u007f]/g, " ")).slice(
    0,
    MAX_QUESTION_LENGTH,
  );
}
