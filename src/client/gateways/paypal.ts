import { PaymentCancelledError } from "../../shared/errors";
import { createPaymentSuccessResponse } from "../../shared/paymentResponse";
import { loadScript } from "../utils/loadScript";

declare global {
  interface Window {
    paypal: any;
  }
}

export const openPaypalCheckout = async ({
  clientId,
  amount,
  currency,
}: any) => {
  await loadScript(
    `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=${currency}`,
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

    window.paypal
      .Buttons({
        style: {
          layout: "vertical",
          shape: "rect",
        },

        createOrder: (data: any, actions: any) => {
          return actions.order.create({
            purchase_units: [
              {
                amount: {
                  currency_code: currency,
                  value: amount.toFixed(2),
                },
              },
            ],
          });
        },

        onApprove: async (data: any, actions: any) => {
          const details = await actions.order.capture();

          resolve(
            createPaymentSuccessResponse({
              gateway: "paypal",

              transactionId: details.id,

              raw: details,
            }),
          );

          container.remove();
        },

        onCancel: () => {
          reject(new PaymentCancelledError());

          container.remove();
        },

        onError: (error: any) => {
          reject(error);

          container.remove();
        },
      })
      .render(`#${containerId}`);
  });
};
