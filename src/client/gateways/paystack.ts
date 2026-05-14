import { createPaymentSuccessResponse } from "../../shared/paymentResponse";
import { PaymentCancelledError } from "../../shared/errors";
import { loadScript } from "../utils/loadScript";

declare global {
  interface Window {
    PaystackPop: any;
  }
}

export const openPaystackCheckout = async ({
  publicKey,
  email,
  amount,
  currency,
  metadata,
}: any) => {
  await loadScript("https://js.paystack.co/v1/inline.js");

  return new Promise((resolve, reject) => {
    const handler = window.PaystackPop.setup({
      key: publicKey,

      email,

      amount: Math.round(amount * 100),

      currency,

      metadata,

      callback: (response: any) => {
        resolve(
          createPaymentSuccessResponse({
            gateway: "paystack",

            transactionId: response.reference,

            raw: response,
          }),
        );
      },

      onClose: () => {
        reject(new PaymentCancelledError());
      },
    });

    handler.openIframe();
  });
};
