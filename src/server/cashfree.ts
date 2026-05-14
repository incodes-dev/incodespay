import axios from "axios";

export const createCashfreeOrder = async ({
  clientId,
  clientSecret,
  amount,
  customer,
  returnUrl,
}: any) => {
  const response = await axios.post(
    "https://sandbox.cashfree.com/pg/orders",

    {
      order_amount: amount,

      order_currency: "INR",

      customer_details: {
        customer_id: `customer_${Date.now()}`,

        customer_email: customer.email,

        customer_phone: customer.phone || "9999999999",

        customer_name: customer.name,
      },

      order_meta: {
        return_url: returnUrl,
      },
    },

    {
      headers: {
        "x-client-id": clientId,

        "x-client-secret": clientSecret,

        "x-api-version": "2023-08-01",

        "Content-Type": "application/json",
      },
    },
  );

  return response.data;
};
