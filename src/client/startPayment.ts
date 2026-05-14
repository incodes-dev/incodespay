import { openRazorpayCheckout } from "./gateways/razorpay";

import { openStripeCheckout } from "./gateways/stripe";

import { openPaypalCheckout } from "./gateways/paypal";

import { openPaystackCheckout } from "./gateways/paystack";

import { openFlutterwaveCheckout } from "./gateways/flutterwave";

import { openCashfreeCheckout } from "./gateways/cashfree";
import { GatewayConfigError } from "../shared/errors";

export const startPayment = async ({
  gateway,
  amount,
  currency,
  credentials,
  customer,
  metadata,
  successUrl,
  cancelUrl,
  apiUrl,
}: any) => {
  if (!gateway) {
    throw new GatewayConfigError("Gateway is required.");
  }

  if (!credentials) {
    throw new GatewayConfigError("Gateway credentials missing.");
  }

  if (!amount) {
    throw new GatewayConfigError("Amount is required.");
  }

  if (!currency) {
    throw new GatewayConfigError("Currency is required.");
  }

  if (
    (gateway === "stripe" ||
      gateway === "razorpay" ||
      gateway === "cashfree") &&
    !apiUrl
  ) {
    throw new GatewayConfigError(`${gateway} requires apiUrl`);
  }

  // ______________________________________________razorpay__________________________________________________________

  if (gateway === "razorpay") {
    const response = await fetch(apiUrl, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        keyId: credentials.keyId,
        keySecret: credentials.keySecret,
        amount,
        currency,
      }),
    });

    const orderData = await response.json();

    if (!orderData?.status || !orderData?.data) {
      throw new Error(orderData?.message || "Failed to create Razorpay order.");
    }

    const order = orderData.data;

    return await openRazorpayCheckout({
      orderId: order.id,

      amount: order.amount,

      currency: order.currency,

      keyId: credentials.keyId,

      customer,
    });
  }

  //______________________________________________stripe__________________________________________________________

  if (gateway === "stripe") {
    const response = await fetch(apiUrl, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        secretKey: credentials.secretKey,

        amount,

        currency,

        customer,

        metadata,
      }),
    });

    const sessionData = await response.json();

    if (!sessionData?.status || !sessionData?.data) {
      throw new Error(
        sessionData?.message || "Failed to create Stripe session.",
      );
    }

    const session = sessionData.data;

    return await openStripeCheckout({
      checkoutUrl: session.url,
    });
  }

  // ______________________________________________paypal__________________________________________________________

  if (gateway === "paypal") {
    return await openPaypalCheckout({
      clientId: credentials.clientId,

      amount,

      currency,
    });
  }

  // ______________________________________________paystack__________________________________________________________

  if (gateway === "paystack") {
    return await openPaystackCheckout({
      publicKey: credentials.publicKey,

      email: customer.email,

      amount,

      currency,

      metadata,
    });
  }

  // ______________________________________________flutterwave__________________________________________________________

  if (gateway === "flutterwave") {
    return await openFlutterwaveCheckout({
      publicKey: credentials.publicKey,

      amount,

      currency,

      customer,

      metadata,
    });
  }

  // ______________________________________________cashfree__________________________________________________________

  if (gateway === "cashfree") {
    const response = await fetch(apiUrl, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        clientId: credentials.clientId,

        clientSecret: credentials.clientSecret,

        amount,

        customer,
      }),
    });

    const orderData = await response.json();

    if (!orderData?.status || !orderData?.data) {
      throw new Error(orderData?.message || "Failed to create Cashfree order.");
    }

    const order = orderData.data;

    return await openCashfreeCheckout({
      paymentSessionId: order.payment_session_id,
    });
  }

  throw new Error("Unsupported gateway");
};
