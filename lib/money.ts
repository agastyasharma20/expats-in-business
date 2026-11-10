/**
 * Money is stored as an integer number of minor units plus an ISO 4217 currency (e.g. 1900 PLN =
 * 19.00 zł). The number of minor units per major unit comes from Intl, so JPY (0 decimals) and
 * BHD (3 decimals) work without special cases. Never use floats for stored amounts.
 */
export type Money = { amountMinor: number; currency: string };

function assertCurrency(currency: string): string {
  if (!/^[A-Z]{3}$/.test(currency))
    throw new Error(`Invalid ISO 4217 currency code: "${currency}"`);
  return currency;
}

/** Decimal places used by a currency (PLN 2, JPY 0, BHD 3). */
export function currencyExponent(currency: string): number {
  return (
    new Intl.NumberFormat("en", {
      style: "currency",
      currency: assertCurrency(currency),
    }).resolvedOptions().maximumFractionDigits ?? 2
  );
}

/** 19.99 PLN → 1999. Rounds half away from zero to the nearest minor unit. */
export function toMinorUnits(major: number, currency: string): number {
  if (!Number.isFinite(major)) throw new Error("Amount must be a finite number");
  const factor = 10 ** currencyExponent(currency);
  return Math.sign(major) * Math.round(Math.abs(major) * factor);
}

/** 1999 PLN → 19.99 (for display maths only; store minor units). */
export function fromMinorUnits(amountMinor: number, currency: string): number {
  if (!Number.isInteger(amountMinor)) throw new Error("Minor units must be an integer");
  return amountMinor / 10 ** currencyExponent(currency);
}

/** Localised price, e.g. formatMoney({ amountMinor: 1900, currency: "PLN" }, "pl") → "19,00 zł". */
export function formatMoney(
  { amountMinor, currency }: Money,
  locale: string,
  options: { hideZeroDecimals?: boolean } = {},
): string {
  const major = fromMinorUnits(amountMinor, currency);
  const exponent = currencyExponent(currency);
  const whole = Number.isInteger(major);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: options.hideZeroDecimals && whole ? 0 : exponent,
    maximumFractionDigits: exponent,
  }).format(major);
}

/** Sums amounts of one currency; mixing currencies is a programming error. */
export function sumMoney(items: Money[], currency: string): Money {
  for (const item of items) {
    if (item.currency !== currency) throw new Error(`Cannot add ${item.currency} to ${currency}`);
  }
  return { amountMinor: items.reduce((total, item) => total + item.amountMinor, 0), currency };
}
