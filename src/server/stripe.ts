import Stripe from "stripe";

export const createStripeSession = async ({
  secretKey,
  amount,
  currency,
  customer,
  metadata,
  successUrl,
  cancelUrl,
}: any) => {
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
            name: "Payment",
          },

          unit_amount: Math.round(amount * 100),
        },

        quantity: 1,
      },
    ],

    success_url: successUrl,

    cancel_url: cancelUrl,
  });

  return session;
};