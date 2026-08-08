"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/server/index.ts
var server_exports = {};
__export(server_exports, {
  createCashfreeOrder: () => createCashfreeOrder,
  createNowPaymentsInvoice: () => createNowPaymentsInvoice,
  createRazorpayOrder: () => createRazorpayOrder,
  createStripeSession: () => createStripeSession,
  verifyNowPaymentsIPNSignature: () => verifyNowPaymentsIPNSignature
});
module.exports = __toCommonJS(server_exports);

// src/server/razorpay.ts
var import_razorpay = __toESM(require("razorpay"), 1);
var createRazorpayOrder = async ({
  keyId,
  keySecret,
  amount,
  currency
}) => {
  const razorpay = new import_razorpay.default({
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
var import_stripe = __toESM(require("stripe"), 1);
var createStripeSession = async ({
  secretKey,
  amount,
  currency,
  customer,
  metadata,
  successUrl,
  cancelUrl
}) => {
  const stripe = new import_stripe.default(secretKey);
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
var import_axios = __toESM(require("axios"), 1);
var createCashfreeOrder = async ({
  clientId,
  clientSecret,
  amount,
  customer,
  returnUrl
}) => {
  const response = await import_axios.default.post(
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
var import_axios2 = __toESM(require("axios"), 1);
var import_crypto = __toESM(require("crypto"), 1);
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
  if (!currency) {
    throw new Error(
      "NOWPayments currency is required."
    );
  }
  const callbackUrl = ipnCallbackUrl || ipnUrl;
  const payload = {
    price_amount: numericAmount,
    price_currency: String(currency).trim().toLowerCase(),
    order_id: orderId || `NOWPAY_${Date.now()}`,
    order_description: orderDescription || metadata?.description || metadata?.planType || "Payment",
    is_fixed_rate: toBoolean(isFixedRate),
    is_fee_paid_by_user: toBoolean(isFeePaidByUser)
  };
  if (payCurrency) {
    payload.pay_currency = String(payCurrency).trim().toLowerCase();
  }
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
  const { data } = await import_axios2.default.post(
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
    const expectedSignature = import_crypto.default.createHmac(
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
    return import_crypto.default.timingSafeEqual(
      receivedBuffer,
      expectedBuffer
    );
  } catch {
    return false;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createCashfreeOrder,
  createNowPaymentsInvoice,
  createRazorpayOrder,
  createStripeSession,
  verifyNowPaymentsIPNSignature
});
//# sourceMappingURL=index.cjs.map