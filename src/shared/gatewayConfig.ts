export const GATEWAY_CONFIG = {
  razorpay: {
    requiresBackend: false,
    supportedCurrencies: ["INR"],
  },

  stripe: {
    requiresBackend: true,
    supportedCurrencies: ["USD", "EUR", "INR", "NGN"],

    minimumAmounts: {
      USD: 0.5,
      INR: 50,
      NGN: 800,
    },
  },

  paypal: {
    requiresBackend: false,
  },

  paystack: {
    requiresBackend: false,
  },

  flutterwave: {
    requiresBackend: false,
  },

  cashfree: {
    requiresBackend: true,
    supportedCurrencies: ["INR"],
  },

  nowpayments: {
    requiresBackend: true,
    supportedCurrencies: ["USD", "EUR"],
  },
};
