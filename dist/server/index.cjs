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
  createRazorpayOrder: () => createRazorpayOrder,
  createStripeSession: () => createStripeSession
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createCashfreeOrder,
  createRazorpayOrder,
  createStripeSession
});
//# sourceMappingURL=index.cjs.map