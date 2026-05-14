import { loadScript } from "../utils/loadScript";
import { createPaymentSuccessResponse } from "../../shared/paymentResponse";
import { PaymentCancelledError } from "../../shared/errors";

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

  try {
    const response = await cashfree.checkout({
      paymentSessionId,

      redirectTarget: "_modal",
    });

    return createPaymentSuccessResponse({
      gateway: "cashfree",

      transactionId:
        response?.paymentDetails?.paymentMessage ||
        response?.order?.order_id ||
        paymentSessionId,

      raw: response,
    });
  } catch (error) {
    throw new PaymentCancelledError();
  }
};
