// src/server/razorpay.ts
import Razorpay from "razorpay";
var createRazorpayOrder = async ({
  keyId,
  keySecret,
  amount,
  currency
}) => {
  const razorpay = new Razorpay({
    key_id: keyId,
    key_secret: keySecret
  });
  const order = await razorpay.orders.create({
    amount: Math.round(amount * 100),
    currency
  });
  return order;
};

// src/server/stripe.ts
import Stripe from "stripe";
var createStripeSession = async ({
  secretKey,
  amount,
  currency,
  customer,
  metadata,
  successUrl,
  cancelUrl
}) => {
  const stripe = new Stripe(secretKey);
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    customer_email: customer.email,
    metadata,
    line_items: [
      {
        price_data: {
          currency,
          product_data: {
            name: "Payment"
          },
          unit_amount: Math.round(amount * 100)
        },
        quantity: 1
      }
    ],
    success_url: successUrl,
    cancel_url: cancelUrl
  });
  return session;
};

// src/server/cashfree.ts
import axios from "axios";
var createCashfreeOrder = async ({
  clientId,
  clientSecret,
  amount,
  customer,
  returnUrl
}) => {
  const response = await axios.post(
    "https://sandbox.cashfree.com/pg/orders",
    {
      order_amount: amount,
      order_currency: "INR",
      customer_details: {
        customer_id: `customer_${Date.now()}`,
        customer_email: customer.email,
        customer_phone: customer.phone || "9999999999",
        customer_name: customer.name
      },
      order_meta: {
        return_url: returnUrl
      }
    },
    {
      headers: {
        "x-client-id": clientId,
        "x-client-secret": clientSecret,
        "x-api-version": "2023-08-01",
        "Content-Type": "application/json"
      }
    }
  );
  return response.data;
};

// src/server/nowpayments.ts
import axios2 from "axios";
import crypto from "crypto";
var PRODUCTION_ENDPOINT = "https://api.nowpayments.io/v1/invoice";
var SANDBOX_ENDPOINT = "https://api-sandbox.nowpayments.io/v1/invoice";
function toBoolean(value) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }
  return Boolean(value);
}
function sortObject(value) {
  if (Array.isArray(value)) {
    return value.map(sortObject);
  }
  if (value !== null && typeof value === "object") {
    return Object.keys(value).sort().reduce(
      (result, key) => {
        result[key] = sortObject(value[key]);
        return result;
      },
      {}
    );
  }
  return value;
}
var DEFAULT_PRICE_CURRENCY = "usd";
function resolvePriceCurrency(currency) {
  const raw = String(currency || "").trim().toLowerCase();
  if (!raw) {
    return DEFAULT_PRICE_CURRENCY;
  }
  if (raw === "inr" || raw === "rs" || raw === "\u20B9") {
    return DEFAULT_PRICE_CURRENCY;
  }
  return raw;
}
var createNowPaymentsInvoice = async ({
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
  isFeePaidByUser = false
}) => {
  const isSandbox = toBoolean(sandbox);
  const key = isSandbox ? sandboxKey : apiKey;
  if (!key) {
    throw new Error(
      isSandbox ? "NOWPayments sandbox API key is missing." : "NOWPayments production API key is missing."
    );
  }
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error(
      "NOWPayments amount must be greater than 0."
    );
  }
  const resolvedPayCurrency = payCurrency ? String(payCurrency).trim() : "";
  if (!resolvedPayCurrency) {
    throw new Error(
      "NOWPayments payCurrency is required."
    );
  }
  const callbackUrl = ipnCallbackUrl || ipnUrl;
  const payload = {
    price_amount: numericAmount,
    // Fiat denomination of price_amount (not the crypto ticker).
    price_currency: resolvePriceCurrency(currency),
    // Crypto the hosted page accepts for payment.
    pay_currency: resolvedPayCurrency.toLowerCase(),
    order_id: orderId || `NOWPAY_${Date.now()}`,
    order_description: orderDescription || metadata?.description || metadata?.planType || "Payment",
    is_fixed_rate: toBoolean(isFixedRate),
    is_fee_paid_by_user: toBoolean(isFeePaidByUser)
  };
  if (successUrl) {
    payload.success_url = successUrl;
  }
  if (cancelUrl) {
    payload.cancel_url = cancelUrl;
  }
  if (callbackUrl) {
    payload.ipn_callback_url = callbackUrl;
  }
  const endpoint = isSandbox ? SANDBOX_ENDPOINT : PRODUCTION_ENDPOINT;
  const { data } = await axios2.post(
    endpoint,
    payload,
    {
      headers: {
        "x-api-key": key,
        "Content-Type": "application/json"
      },
      timeout: 15e3
    }
  );
  if (!data?.invoice_url) {
    throw new Error(
      "NOWPayments did not return invoice_url."
    );
  }
  return data;
};
function verifyNowPaymentsIPNSignature({
  rawBody,
  signature,
  ipnSecret
}) {
  if (!rawBody || !signature || !ipnSecret) {
    return false;
  }
  try {
    const parsedBody = JSON.parse(rawBody);
    const sortedBody = sortObject(parsedBody);
    const canonicalBody = JSON.stringify(sortedBody);
    const expectedSignature = crypto.createHmac(
      "sha512",
      ipnSecret
    ).update(canonicalBody).digest("hex");
    const receivedBuffer = Buffer.from(
      signature,
      "utf8"
    );
    const expectedBuffer = Buffer.from(
      expectedSignature,
      "utf8"
    );
    if (receivedBuffer.length !== expectedBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(
      receivedBuffer,
      expectedBuffer
    );
  } catch {
    return false;
  }
}
export {
  createCashfreeOrder,
  createNowPaymentsInvoice,
  createRazorpayOrder,
  createStripeSession,
  verifyNowPaymentsIPNSignature
};
//# sourceMappingURL=index.js.map