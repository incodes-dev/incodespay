import { loadScript } from "../utils/loadScript";

import { createPaymentSuccessResponse } from "../../shared/paymentResponse";

import { PaymentCancelledError } from "../../shared/errors";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export const openRazorpayCheckout = async ({
  orderId,
  amount,
  currency,
  keyId,
  customer,
}: any) => {
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
        contact: customer.phone,
      },

      handler: (response: any) => {
        resolve(
          createPaymentSuccessResponse({
            gateway: "razorpay",

            transactionId: response.razorpay_payment_id,

            raw: response,
          }),
        );
      },

      modal: {
        ondismiss: () => {
          reject(new PaymentCancelledError());
        },
      },
    });

    razorpay.open();
  });
};
