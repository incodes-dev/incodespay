import { createPaymentSuccessResponse } from "../../shared/paymentResponse";
import { PaymentCancelledError } from "../../shared/errors";
import { loadScript } from "../utils/loadScript";

declare global {
  interface Window {
    FlutterwaveCheckout: any;
  }
}

export const openFlutterwaveCheckout = async ({
  publicKey,
  amount,
  currency,
  customer,
  metadata,
}: any) => {
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

        name: customer.name,
      },

      meta: metadata || {},

      callback: (response: any) => {
        resolve(
          createPaymentSuccessResponse({
            gateway: "flutterwave",

            transactionId: response.transaction_id,

            raw: response,
          }),
        );
      },

      onclose: () => {
        reject(new PaymentCancelledError());
      },

      customizations: {
        title: "Payment",

        description: "Payment transaction",

        logo: "",
      },
    });
  });
};
