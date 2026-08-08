import axios from "axios";
import crypto from "crypto";

const PRODUCTION_ENDPOINT =
  "https://api.nowpayments.io/v1/invoice";

const SANDBOX_ENDPOINT =
  "https://api-sandbox.nowpayments.io/v1/invoice";

function toBoolean(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }

  return Boolean(value);
}

function sortObject(value: any): any {
  if (Array.isArray(value)) {
    return value.map(sortObject);
  }

  if (
    value !== null &&
    typeof value === "object"
  ) {
    return Object.keys(value)
      .sort()
      .reduce<Record<string, any>>(
        (result, key) => {
          result[key] = sortObject(value[key]);
          return result;
        },
        {},
      );
  }

  return value;
}

/**
 * App settings often use a local fiat (e.g. INR) that NOWPayments rejects
 * as price_currency. Invoice amount is always expressed in a supported fiat
 * (default USD). The crypto the customer pays is pay_currency only.
 */
const DEFAULT_PRICE_CURRENCY = "usd";

function resolvePriceCurrency(currency: unknown): string {
  const raw = String(currency || "")
    .trim()
    .toLowerCase();

  if (!raw) {
    return DEFAULT_PRICE_CURRENCY;
  }

  // Block common store currencies that NOWPayments does not accept as fiat price.
  if (raw === "inr" || raw === "rs" || raw === "₹") {
    return DEFAULT_PRICE_CURRENCY;
  }

  return raw;
}

export const createNowPaymentsInvoice = async ({
  apiKey,
  sandboxKey,
  sandbox = false,

  amount,
  currency,
  payCurrency,

  successUrl,
  cancelUrl,

  ipnUrl,
  ipnCallbackUrl,

  orderId,
  orderDescription,

  metadata,

  isFixedRate = true,
  isFeePaidByUser = false,
}: any) => {
  const isSandbox = toBoolean(sandbox);

  const key = isSandbox
    ? sandboxKey
    : apiKey;

  if (!key) {
    throw new Error(
      isSandbox
        ? "NOWPayments sandbox API key is missing."
        : "NOWPayments production API key is missing.",
    );
  }

  const numericAmount = Number(amount);

  if (
    !Number.isFinite(numericAmount) ||
    numericAmount <= 0
  ) {
    throw new Error(
      "NOWPayments amount must be greater than 0.",
    );
  }

  const resolvedPayCurrency =
    payCurrency
      ? String(payCurrency).trim()
      : "";

  if (!resolvedPayCurrency) {
    throw new Error(
      "NOWPayments payCurrency is required.",
    );
  }

  const callbackUrl =
    ipnCallbackUrl || ipnUrl;

  const payload: Record<string, any> = {
    price_amount: numericAmount,

    // Fiat denomination of price_amount (not the crypto ticker).
    price_currency:
      resolvePriceCurrency(currency),

    // Crypto the hosted page accepts for payment.
    pay_currency:
      resolvedPayCurrency.toLowerCase(),

    order_id:
      orderId ||
      `NOWPAY_${Date.now()}`,

    order_description:
      orderDescription ||
      metadata?.description ||
      metadata?.planType ||
      "Payment",

    is_fixed_rate:
      toBoolean(isFixedRate),

    is_fee_paid_by_user:
      toBoolean(isFeePaidByUser),
  };

  if (successUrl) {
    payload.success_url =
      successUrl;
  }

  if (cancelUrl) {
    payload.cancel_url =
      cancelUrl;
  }

  if (callbackUrl) {
    payload.ipn_callback_url =
      callbackUrl;
  }

  const endpoint = isSandbox
    ? SANDBOX_ENDPOINT
    : PRODUCTION_ENDPOINT;

  const { data } =
    await axios.post(
      endpoint,
      payload,
      {
        headers: {
          "x-api-key": key,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      },
    );

  if (!data?.invoice_url) {
    throw new Error(
      "NOWPayments did not return invoice_url.",
    );
  }

  return data;
};


/**
 * NOWPayments IPN signature verification.
 *
 * NOWPayments requires:
 *
 * 1. Parse JSON
 * 2. Sort object keys recursively
 * 3. JSON.stringify()
 * 4. HMAC SHA-512
 * 5. Compare with x-nowpayments-sig
 */
export function verifyNowPaymentsIPNSignature({
  rawBody,
  signature,
  ipnSecret,
}: {
  rawBody: string;
  signature: string;
  ipnSecret: string;
}): boolean {
  if (
    !rawBody ||
    !signature ||
    !ipnSecret
  ) {
    return false;
  }

  try {
    const parsedBody =
      JSON.parse(rawBody);

    const sortedBody =
      sortObject(parsedBody);

    const canonicalBody =
      JSON.stringify(sortedBody);

    const expectedSignature =
      crypto
        .createHmac(
          "sha512",
          ipnSecret,
        )
        .update(canonicalBody)
        .digest("hex");

    const receivedBuffer =
      Buffer.from(
        signature,
        "utf8",
      );

    const expectedBuffer =
      Buffer.from(
        expectedSignature,
        "utf8",
      );

    if (
      receivedBuffer.length !==
      expectedBuffer.length
    ) {
      return false;
    }

    return crypto.timingSafeEqual(
      receivedBuffer,
      expectedBuffer,
    );
  } catch {
    return false;
  }
}