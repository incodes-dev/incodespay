"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.ts
var client_exports = {};
__export(client_exports, {
  openCashfreeCheckout: () => openCashfreeCheckout,
  openFlutterwaveCheckout: () => openFlutterwaveCheckout,
  openPaypalCheckout: () => openPaypalCheckout,
  openPaystackCheckout: () => openPaystackCheckout,
  openRazorpayCheckout: () => openRazorpayCheckout,
  openStripeCheckout: () => openStripeCheckout,
  startPayment: () => startPayment
});
module.exports = __toCommonJS(client_exports);

// src/client/utils/loadScript.ts
var loadScript = (src) => {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(
      `script[src="${src}"]`
    );
    if (existing) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => reject(false);
    document.body.appendChild(script);
  });
};

// src/shared/paymentResponse.ts
var createPaymentSuccessResponse = ({
  gateway,
  transactionId,
  raw
}) => ({
  success: true,
  gateway,
  transactionId,
  raw
});
var createPaymentErrorResponse = ({ gateway, message, raw }) => ({
  success: false,
  gateway,
  message,
  raw
});

// src/shared/errors.ts
var PaymentCancelledError = class extends Error {
  constructor(message = "Payment cancelled") {
    super(message);
    this.name = "PaymentCancelledError";
  }
};
var GatewayConfigError = class extends Error {
  constructor(message = "Invalid gateway configuration") {
    super(message);
    this.name = "GatewayConfigError";
  }
};

// src/client/gateways/razorpay.ts
var openRazorpayCheckout = async ({
  orderId,
  amount,
  currency,
  keyId,
  customer
}) => {
  await loadScript("https://checkout.razorpay.com/v1/checkout.js");
  return new Promise((resolve, reject) => {
    const razorpay = new window.Razorpay({
      key: keyId,
      amount,
      currency,
      order_id: orderId,
      prefill: {
        name: customer.name,
        email: customer.email,
        contact: customer.phone
      },
      handler: (response) => {
        resolve(
          createPaymentSuccessResponse({
            gateway: "razorpay",
            transactionId: response.razorpay_payment_id,
            raw: response
          })
        );
      },
      modal: {
        ondismiss: () => {
          reject(new PaymentCancelledError());
        }
      }
    });
    razorpay.open();
  });
};

// src/client/gateways/stripe.ts
var openStripeCheckout = async ({
  checkoutUrl
}) => {
  if (!checkoutUrl) {
    throw new Error(
      "Stripe checkout URL missing."
    );
  }
  window.location.href = checkoutUrl;
};

// src/client/gateways/paypal.ts
var openPaypalCheckout = async ({
  clientId,
  amount,
  currency
}) => {
  await loadScript(
    `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=${currency}`
  );
  return new Promise((resolve, reject) => {
    const containerId = "incodespay-paypal-container";
    let container = document.getElementById(containerId);
    if (!container) {
      container = document.createElement("div");
      container.id = containerId;
      container.style.position = "fixed";
      container.style.top = "50%";
      container.style.left = "50%";
      container.style.transform = "translate(-50%, -50%)";
      container.style.zIndex = "999999";
      container.style.background = "#fff";
      container.style.padding = "20px";
      container.style.borderRadius = "12px";
      document.body.appendChild(container);
    }
    container.innerHTML = "";
    window.paypal.Buttons({
      style: {
        layout: "vertical",
        shape: "rect"
      },
      createOrder: (data, actions) => {
        return actions.order.create({
          purchase_units: [
            {
              amount: {
                currency_code: currency,
                value: amount.toFixed(2)
              }
            }
          ]
        });
      },
      onApprove: async (data, actions) => {
        const details = await actions.order.capture();
        resolve(
          createPaymentSuccessResponse({
            gateway: "paypal",
            transactionId: details.id,
            raw: details
          })
        );
        container.remove();
      },
      onCancel: () => {
        reject(new PaymentCancelledError());
        container.remove();
      },
      onError: (error) => {
        reject(error);
        container.remove();
      }
    }).render(`#${containerId}`);
  });
};

// src/client/gateways/paystack.ts
var openPaystackCheckout = async ({
  publicKey,
  email,
  amount,
  currency,
  metadata
}) => {
  await loadScript("https://js.paystack.co/v1/inline.js");
  return new Promise((resolve, reject) => {
    const handler = window.PaystackPop.setup({
      key: publicKey,
      email,
      amount: Math.round(amount * 100),
      currency,
      metadata,
      callback: (response) => {
        resolve(
          createPaymentSuccessResponse({
            gateway: "paystack",
            transactionId: response.reference,
            raw: response
          })
        );
      },
      onClose: () => {
        reject(new PaymentCancelledError());
      }
    });
    handler.openIframe();
  });
};

// src/client/gateways/flutterwave.ts
var openFlutterwaveCheckout = async ({
  publicKey,
  amount,
  currency,
  customer,
  metadata
}) => {
  await loadScript("https://checkout.flutterwave.com/v3.js");
  return new Promise((resolve, reject) => {
    window.FlutterwaveCheckout({
      public_key: publicKey,
      tx_ref: `incodespay_${Date.now()}`,
      amount,
      currency,
      payment_options: "card,banktransfer,ussd",
      customer: {
        email: customer.email,
        phone_number: customer.phone || "",
        name: customer.name
      },
      meta: metadata || {},
      callback: (response) => {
        resolve(
          createPaymentSuccessResponse({
            gateway: "flutterwave",
            transactionId: response.transaction_id,
            raw: response
          })
        );
      },
      onclose: () => {
        reject(new PaymentCancelledError());
      },
      customizations: {
        title: "Payment",
        description: "Payment transaction",
        logo: ""
      }
    });
  });
};

// src/client/gateways/cashfree.ts
var openCashfreeCheckout = async ({ paymentSessionId }) => {
  await loadScript("https://sdk.cashfree.com/js/v3/cashfree.js");
  const cashfree = window.Cashfree({
    mode: "sandbox"
  });
  const response = await cashfree.checkout({
    paymentSessionId,
    redirectTarget: "_modal"
  });
  console.log("cashfreeResponse", response);
  if (response?.error || response?.raw?.error || response?.code === "payment_aborted" || response?.raw?.code === "payment_aborted") {
    return createPaymentErrorResponse({
      gateway: "cashfree",
      message: response?.error?.message || response?.message || "Payment cancelled",
      raw: response
    });
  }
  return createPaymentSuccessResponse({
    gateway: "cashfree",
    transactionId: response?.paymentDetails?.cf_payment_id || response?.order?.order_id || paymentSessionId,
    raw: response
  });
};

// src/client/gateways/nowpayments.ts
var openNowPaymentsCheckout = async ({
  checkoutUrl
}) => {
  if (!checkoutUrl) {
    throw new Error("NOWPayments checkout URL missing.");
  }
  window.location.href = checkoutUrl;
};

// src/client/startPayment.ts
var startPayment = async ({
  gateway,
  amount,
  currency,
  credentials,
  customer,
  metadata,
  successUrl,
  cancelUrl,
  apiUrl
}) => {
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
  if ((gateway === "stripe" || gateway === "razorpay" || gateway === "cashfree" || gateway === "nowpayments") && !apiUrl) {
    throw new GatewayConfigError(`${gateway} requires apiUrl`);
  }
  if (gateway === "razorpay") {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        keyId: credentials.keyId,
        keySecret: credentials.keySecret,
        amount,
        currency
      })
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
      customer
    });
  }
  if (gateway === "stripe") {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        secretKey: credentials.secretKey,
        amount,
        currency,
        customer,
        metadata
      })
    });
    const sessionData = await response.json();
    if (!sessionData?.status || !sessionData?.data) {
      throw new Error(
        sessionData?.message || "Failed to create Stripe session."
      );
    }
    const session = sessionData.data;
    return await openStripeCheckout({
      checkoutUrl: session.url
    });
  }
  if (gateway === "paypal") {
    return await openPaypalCheckout({
      clientId: credentials.clientId,
      amount,
      currency
    });
  }
  if (gateway === "paystack") {
    return await openPaystackCheckout({
      publicKey: credentials.publicKey,
      email: customer.email,
      amount,
      currency,
      metadata
    });
  }
  if (gateway === "flutterwave") {
    return await openFlutterwaveCheckout({
      publicKey: credentials.publicKey,
      amount,
      currency,
      customer,
      metadata
    });
  }
  if (gateway === "cashfree") {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret,
        amount,
        customer
      })
    });
    const orderData = await response.json();
    if (!orderData?.status || !orderData?.data) {
      throw new Error(orderData?.message || "Failed to create Cashfree order.");
    }
    const order = orderData.data;
    return await openCashfreeCheckout({
      paymentSessionId: order.payment_session_id
    });
  }
  if (gateway === "nowpayments") {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        apiKey: credentials.apiKey,
        sandboxKey: credentials.sandboxKey,
        sandbox: credentials.sandbox,
        ipnSecret: credentials.ipnSecret,
        payCurrency: credentials.payCurrency,
        amount,
        currency,
        customer,
        metadata,
        successUrl,
        cancelUrl
      })
    });
    const invoiceData = await response.json();
    if (!invoiceData?.status || !invoiceData?.data) {
      throw new Error(
        invoiceData?.message || "Failed to create NOWPayments invoice."
      );
    }
    return await openNowPaymentsCheckout({
      checkoutUrl: invoiceData.data.invoice_url
    });
  }
  throw new Error("Unsupported gateway");
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  openCashfreeCheckout,
  openFlutterwaveCheckout,
  openPaypalCheckout,
  openPaystackCheckout,
  openRazorpayCheckout,
  openStripeCheckout,
  startPayment
});
//# sourceMappingURL=index.cjs.map