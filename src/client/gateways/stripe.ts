export const openStripeCheckout = async ({
  checkoutUrl,
}: any) => {
  if (!checkoutUrl) {
    throw new Error(
      "Stripe checkout URL missing."
    );
  }

  window.location.href = checkoutUrl;
};