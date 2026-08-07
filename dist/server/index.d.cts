import * as razorpay_dist_types_orders from 'razorpay/dist/types/orders';
import Stripe from 'stripe';

declare const createRazorpayOrder: ({ keyId, keySecret, amount, currency, }: {
    keyId: string;
    keySecret: string;
    amount: number;
    currency: string;
}) => Promise<razorpay_dist_types_orders.Orders.RazorpayOrder>;

declare const createStripeSession: ({ secretKey, amount, currency, customer, metadata, successUrl, cancelUrl, }: any) => Promise<Stripe.Response<Stripe.Checkout.Session>>;

declare const createCashfreeOrder: ({ clientId, clientSecret, amount, customer, returnUrl, }: any) => Promise<any>;

declare const createNowPaymentsInvoice: ({ apiKey, sandboxKey, sandbox, amount, currency, payCurrency, successUrl, cancelUrl, ipnUrl, metadata, }: any) => Promise<any>;

export { createCashfreeOrder, createNowPaymentsInvoice, createRazorpayOrder, createStripeSession };
