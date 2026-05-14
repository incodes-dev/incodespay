declare const startPayment: ({ gateway, amount, currency, credentials, customer, metadata, successUrl, cancelUrl, apiUrl, }: any) => Promise<unknown>;

declare global {
    interface Window {
        Razorpay: any;
    }
}
declare const openRazorpayCheckout: ({ orderId, amount, currency, keyId, customer, }: any) => Promise<unknown>;

declare const openStripeCheckout: ({ checkoutUrl, }: any) => Promise<void>;

declare global {
    interface Window {
        paypal: any;
    }
}
declare const openPaypalCheckout: ({ clientId, amount, currency, }: any) => Promise<unknown>;

declare global {
    interface Window {
        PaystackPop: any;
    }
}
declare const openPaystackCheckout: ({ publicKey, email, amount, currency, metadata, }: any) => Promise<unknown>;

declare global {
    interface Window {
        FlutterwaveCheckout: any;
    }
}
declare const openFlutterwaveCheckout: ({ publicKey, amount, currency, customer, metadata, }: any) => Promise<unknown>;

declare global {
    interface Window {
        Cashfree: any;
    }
}
declare const openCashfreeCheckout: ({ paymentSessionId }: any) => Promise<{
    success: boolean;
    gateway: any;
    transactionId: any;
    raw: any;
}>;

export { openCashfreeCheckout, openFlutterwaveCheckout, openPaypalCheckout, openPaystackCheckout, openRazorpayCheckout, openStripeCheckout, startPayment };
