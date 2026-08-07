import axios from "axios";

export const createNowPaymentsInvoice = async ({
  apiKey,
  sandboxKey,
  sandbox = false,
  amount,
  currency,
  payCurrency,
  successUrl,
  cancelUrl,
  ipnUrl,
  metadata,
}: any) => {
  const key = sandbox ? sandboxKey : apiKey;

  if (!key) {
    throw new Error("NOWPayments API key is missing.");
  }

  if (!amount) {
    throw new Error("Amount is required.");
  }

  if (!currency) {
    throw new Error("Currency is required.");
  }

  const payload = {
    price_amount: amount,
    price_currency: currency.toLowerCase(),

    pay_currency: payCurrency,

    order_id: `NOWPAY_${Date.now()}`,

    order_description:
      metadata?.description ||
      metadata?.planType ||
      "Payment",

    success_url: successUrl,

    cancel_url: cancelUrl,

    ipn_callback_url: ipnUrl,

    is_fixed_rate: true,

    is_fee_paid_by_user: false,
  };

  const endpoint = sandbox
    ? "https://api-sandbox.nowpayments.io/v1/invoice"
    : "https://api.nowpayments.io/v1/invoice";

  const { data } = await axios.post(endpoint, payload, {
    headers: {
      "x-api-key": key,
      "Content-Type": "application/json",
    },
  });

  return data;
};