import "server-only";

import Stripe from "stripe";

import { getEnv } from "@/lib/env";

let client: Stripe | null | undefined;

/** Stripe client in test mode, or null when no keys are configured (the app then simulates payment). */
export function getStripe(): Stripe | null {
  if (client === undefined) {
    const key = getEnv().STRIPE_SECRET_KEY;
    if (key && !key.startsWith("sk_test_")) throw new Error("Only Stripe test keys are allowed.");
    client = key ? new Stripe(key, { appInfo: { name: "Expats in Business" } }) : null;
  }
  return client;
}

/** Filter on Stripe dynamic payment methods: BLIK and Przelewy24 only exist for PLN; card works everywhere. */
export function paymentMethodsFor(
  currency: string,
): Stripe.Checkout.SessionCreateParams.AllowedPaymentMethodType[] {
  return currency.toUpperCase() === "PLN" ? ["card", "blik", "p24"] : ["card"];
}
