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

declare const createNowPaymentsInvoice: ({ apiKey, sandboxKey, sandbox, amount, currency, payCurrency, successUrl, cancelUrl, ipnUrl, ipnCallbackUrl, orderId, orderDescription, metadata, isFixedRate, isFeePaidByUser, }: any) => Promise<any>;
/**
 * NOWPayments IPN signature verification.
 *
 * NOWPayments requires:
 *
 * 1. Parse JSON
 * 2. Sort object keys recursively
 * 3. JSON.stringify()
 * 4. HMAC SHA-512
 * 5. Compare with x-nowpayments-sig
 */
declare function verifyNowPaymentsIPNSignature({ rawBody, signature, ipnSecret, }: {
    rawBody: string;
    signature: string;
    ipnSecret: string;
}): boolean;

export { createCashfreeOrder, createNowPaymentsInvoice, createRazorpayOrder, createStripeSession, verifyNowPaymentsIPNSignature };
