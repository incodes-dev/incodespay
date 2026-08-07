export const openNowPaymentsCheckout = async ({
  checkoutUrl,
}: {
  checkoutUrl: string;
}) => {
  if (!checkoutUrl) {
    throw new Error("NOWPayments checkout URL missing.");
  }

  window.location.href = checkoutUrl;
};