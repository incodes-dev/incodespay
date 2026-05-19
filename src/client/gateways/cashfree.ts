import { loadScript } from "../utils/loadScript";

import {
  createPaymentSuccessResponse,
  createPaymentErrorResponse,
} from "../../shared/paymentResponse";

declare global {
  interface Window {
    Cashfree: any;
  }
}

export const openCashfreeCheckout = async ({ paymentSessionId }: any) => {
  await loadScript("https://sdk.cashfree.com/js/v3/cashfree.js");

  const cashfree = window.Cashfree({
    mode: "sandbox",
  });

  const response = await cashfree.checkout({
    paymentSessionId,

    redirectTarget: "_modal",
  });

  console.log("cashfreeResponse", response);

  if (
    response?.error ||
    response?.raw?.error ||
    response?.code === "payment_aborted" ||
    response?.raw?.code === "payment_aborted"
  ) {
    return createPaymentErrorResponse({
      gateway: "cashfree",

      message:
        response?.error?.message || response?.message || "Payment cancelled",

      raw: response,
    });
  }

  return createPaymentSuccessResponse({
    gateway: "cashfree",

    transactionId:
      response?.paymentDetails?.cf_payment_id ||
      response?.order?.order_id ||
      paymentSessionId,

    raw: response,
  });
};
