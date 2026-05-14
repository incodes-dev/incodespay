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
export {
  createCashfreeOrder,
  createRazorpayOrder,
  createStripeSession
};
//# sourceMappingURL=index.js.map