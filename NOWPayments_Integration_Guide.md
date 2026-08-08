# NOWPayments Integration Guide — Figgy / Next.js

## 1. Purpose

This document describes the complete NOWPayments hosted-checkout integration implemented in the Figgy Next.js application.

The goal is to make NOWPayments behave like the other gateways already integrated through the `incodespay` package:

```text
Figgy Wallet
    ↓
Payment gateway selection
    ↓
incodespay.startPayment()
    ↓
Figgy Next.js API route
    ↓
NOWPayments API
    ↓
NOWPayments hosted checkout
    ↓
User completes/cancels payment
    ↓
Figgy success/cancel page
    ↓
Purchase recording / user refresh
```

The implementation is currently based on the working Figgy implementation.

---

# 2. Important Architecture

NOWPayments is implemented as a **hosted checkout gateway**.

The browser does not render a NOWPayments payment form itself. Instead:

1. Figgy calls `startPayment()` from `incodespay`.
2. `incodespay` calls the Figgy Next.js API endpoint.
3. The Next.js endpoint creates a NOWPayments invoice.
4. NOWPayments returns an `invoice_url`.
5. `incodespay` redirects the browser to that URL.
6. NOWPayments redirects the customer back to Figgy.
7. Figgy handles the success/cancel route.
8. NOWPayments also sends an IPN webhook to Figgy.

---

# 3. Required Package Support

The `incodespay` package must support:

```js
import { startPayment } from "incodespay";
```

and the NOWPayments gateway:

```js
gateway: "nowpayments"
```

The package's NOWPayments implementation must:

- accept NOWPayments credentials
- POST to the supplied `apiUrl`
- send the payment information
- receive `paymentUrl`
- redirect/open the hosted checkout

The product should NOT directly implement the NOWPayments SDK/API logic if `incodespay` already provides it.

The product is responsible for:

- gateway configuration
- credentials from app settings
- Next.js API routes
- success/cancel pages
- IPN endpoint
- product-specific purchase recording

---

# 4. Settings Required

The product's settings response must provide these NOWPayments fields:

```js
{
  apiKey,
  sandboxKey,
  isTest,
  nowPaymentAndroidEnabled,
  nowPaymentIosEnabled,
  payCurrency,
  ipnSecret
}
```

Example:

```js
{
  apiKey: "NOWPAYMENTS_API_KEY",
  sandboxKey: "NOWPAYMENTS_SANDBOX_KEY",
  isTest: true,
  nowPaymentAndroidEnabled: true,
  nowPaymentIosEnabled: true,
  payCurrency: "USDTTRC20",
  ipnSecret: "NOWPAYMENTS_IPN_SECRET"
}
```

Do not hardcode these values inside the payment component.

---

# 5. Gateway Configuration

## File

```text
src/components/payment/testing/gatewayConfig.js
```

The gateway constant must contain:

```js
export const PAYMENT_GATEWAY = {
  STRIPE: 'stripe',
  RAZORPAY: 'razorpay',
  PAYPAL: 'paypal',
  PAYSTACK: 'paystack',
  CASHFREE: 'cashfree',
  FLUTTERWAVE: 'flutterwave',
  NOWPAYMENTS: 'nowpayments',
};
```

Add NOWPayments to the gateway list:

```js
{
  id: PAYMENT_GATEWAY.NOWPAYMENTS,
  title: 'NOWPayments',
  description: 'Crypto hosted checkout',
  getEnabled: (settings) =>
    !!settings?.nowPaymentAndroidEnabled ||
    !!settings?.nowPaymentIosEnabled,
},
```

---

# 6. NOWPayments Currency

NOWPayments is configured in this integration to use USD as the invoice price currency.

Add:

```js
if (gateway === PAYMENT_GATEWAY.NOWPAYMENTS) {
  return {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
  };
}
```

The cryptocurrency the customer actually pays with is controlled separately by:

```js
settings.payCurrency
```

For example:

```text
USDTTRC20
```

Therefore:

```text
price currency = USD
payment currency = USDTTRC20
```

Do not confuse these two currencies.

---

# 7. Credentials Mapping

Inside `getGatewayCredentials()` add:

```js
case PAYMENT_GATEWAY.NOWPAYMENTS:
  return {
    apiKey: settings?.apiKey || '',
    sandboxKey: settings?.sandboxKey || '',
    sandbox:
      settings?.isTest === true ||
      settings?.isTest === 'true',
    payCurrency:
      settings?.payCurrency || 'USDTTRC20',
    ipnSecret: settings?.ipnSecret || '',
  };
```

The final object passed to `startPayment()` should therefore look like:

```js
{
  apiKey: settings?.apiKey || '',
  sandboxKey: settings?.sandboxKey || '',
  sandbox: true,
  payCurrency: 'USDTTRC20',
  ipnSecret: settings?.ipnSecret || '',
}
```

---

# 8. Required Credential Validation

Inside `getRequiredCredentialErrors()` add:

```js
if (gateway === PAYMENT_GATEWAY.NOWPAYMENTS) {
  if (!credentials?.apiKey && !credentials?.sandboxKey) {
    missing.push('NOWPayments API key');
  }

  if (!credentials?.payCurrency) {
    missing.push('NOWPayments pay currency');
  }

  if (!credentials?.ipnSecret) {
    missing.push('NOWPayments IPN secret');
  }
}
```

This prevents checkout from starting when the required settings are missing.

---

# 9. Wallet Integration

The wallet should obtain credentials from the application's settings state.

Example:

```js
const gatewayCredentials = getGatewayCredentials(
  selectedPaymentMethod,
  appSettings || {},
);
```

Validate them:

```js
const missingCredentials = getRequiredCredentialErrors(
  selectedPaymentMethod,
  gatewayCredentials,
);

if (missingCredentials.length > 0) {
  throw new Error(
    `Missing credentials: ${missingCredentials.join(', ')}`
  );
}
```

---

# 10. Add NOWPayments API Route to the Gateway Map

Inside the wallet payment handler:

```js
const gatewayApiMap = {
  razorpay: '/api/payments/razorpay/create-order',
  stripe: '/api/payments/stripe/create-session',
  cashfree: '/api/payments/cashfree/create-order',
  nowpayments: '/api/payments/nowpayments/create-payment',
};
```

The important entry is:

```js
nowpayments: '/api/payments/nowpayments/create-payment'
```

---

# 11. Calling incodespay

The wallet calls:

```js
const paymentResponse = await startPayment({
  gateway: selectedPaymentMethod,
  amount: amountMajorNumber,
  currency: selectedGatewayCurrency.code,
  credentials: gatewayCredentials,
  customer: resolveUserPayload(),
  apiUrl: gatewayApiMap[selectedPaymentMethod],
  metadata: {
    planId: selectedPlan._id,
    planType: 'coinPlan',
    coins: selectedPlan.coins,
  },
});
```

For NOWPayments the important values are:

```js
gateway: 'nowpayments'
```

```js
apiUrl: '/api/payments/nowpayments/create-payment'
```

and:

```js
metadata: {
  planId: selectedPlan._id,
  planType: 'coinPlan',
  coins: selectedPlan.coins,
}
```

The `planId` is required because the server creates the NOWPayments order ID from it.

---

# 12. Do Not Immediately Record a Purchase From the Wallet

For hosted gateways such as NOWPayments, the wallet should NOT execute the normal synchronous purchase code immediately after `startPayment()`.

Use:

```js
if (
  selectedPaymentMethod === 'stripe' ||
  selectedPaymentMethod === 'nowpayments'
) {
  return;
}
```

The browser leaves the Figgy application and goes to NOWPayments.

The purchase flow resumes when NOWPayments redirects back to Figgy.

---

# 13. Next.js Create-Payment API

## File

```text
src/app/api/payments/nowpayments/create-payment/route.js
```

Use:

```js
import { NextResponse } from "next/server";
import { createNowPaymentsInvoice } from "incodespay/server";

export async function POST(request) {
  try {
    const body = await request.json();

    const {
      apiKey,
      sandboxKey,
      sandbox,
      payCurrency,
      ipnSecret,
      amount,
      currency,
      customer,
      metadata,
    } = body;

    if (!apiKey && !sandboxKey) {
      return NextResponse.json(
        {
          status: false,
          message: "NOWPayments credentials are required.",
        },
        { status: 400 }
      );
    }

    const planId = metadata?.planId;

    if (!planId) {
      return NextResponse.json(
        {
          status: false,
          message: "planId is required.",
        },
        { status: 400 }
      );
    }

    const origin = new URL(request.url).origin;

    const orderId = `NOWPAY_${planId}_${Date.now()}`;

    const successUrl =
      `${origin}/payment/nowpayments/success` +
      `?orderId=${encodeURIComponent(orderId)}`;

    const cancelUrl =
      `${origin}/payment/nowpayments/cancel` +
      `?orderId=${encodeURIComponent(orderId)}`;

    const ipnCallbackUrl =
      `${origin}/api/payments/nowpayments/ipn`;

    const response = await createNowPaymentsInvoice({
      apiKey,
      sandboxKey,
      sandbox: Boolean(sandbox),
      amount,
      currency,
      payCurrency,
      ipnSecret,
      customer,
      metadata,
      orderId,
      orderDescription: "Coin Purchase",
      successUrl,
      cancelUrl,
      ipnCallbackUrl,
    });

    return NextResponse.json({
      status: true,
      success: true,
      paymentUrl: response.invoice_url,
      orderId,
      invoice: response,
    });
  } catch (error) {
    console.error(
      "NOWPayments create-payment error:",
      error
    );

    return NextResponse.json(
      {
        status: false,
        message:
          error?.response?.data?.message ||
          error?.message ||
          "Failed to create NOWPayments payment.",
      },
      { status: 500 }
    );
  }
}
```

---

# 14. Order ID Format

The integration deliberately creates:

```text
NOWPAY_<coinPlanId>_<timestamp>
```

Example:

```text
NOWPAY_67d8fd84a0cfb32e816e59f_1786169636049
```

This is important because the success page extracts the coin plan ID from this value.

The order ID must remain consistent between:

- Figgy
- NOWPayments
- success page
- IPN payload

---

# 15. Success URL

The create-payment API generates:

```text
/payment/nowpayments/success?orderId=<orderId>
```

Example:

```text
http://localhost:5003/payment/nowpayments/success?orderId=NOWPAY_67d8fd84a0cfb32e816e59f_1786169636049
```

NOWPayments may append its own parameter, such as:

```text
NP_id
```

Example:

```text
/payment/nowpayments/success
?orderId=NOWPAY_67d8fd84a0cfb32e816e59f_1786169636049
&NP_id=4927319881
```

Do not depend on `coinPlanId` being present as a separate query parameter.

---

# 16. Cancel URL

The create-payment API generates:

```text
/payment/nowpayments/cancel?orderId=<orderId>
```

The cancel page should simply inform the user that the checkout was cancelled and provide navigation back to the wallet/home.

Example:

```jsx
'use client';

import { useRouter } from 'next/navigation';
import { XCircle } from 'lucide-react';

export default function NowPaymentsCancelPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen text-white p-4 md:p-6 flex items-center justify-center">
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 md:p-9 shadow-2xl">
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-rose-400/20 bg-rose-400/10">
            <XCircle className="h-10 w-10 text-rose-400" />
          </div>

          <h1 className="text-2xl md:text-3xl font-semibold mb-2">
            Payment Cancelled
          </h1>

          <p className="text-sm md:text-base text-white/70 mb-6">
            Your NOWPayments checkout was cancelled.
            No coins were added to your account.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => router.push('/wallet')}
              className="rounded-xl bg-white text-black px-4 py-3 font-semibold"
            >
              Back To Wallet
            </button>

            <button
              type="button"
              onClick={() => router.push('/')}
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 font-semibold"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

# 17. Success Page

## File

```text
src/app/(public)/payment/nowpayments/success/page.jsx
```

The current implementation extracts the coin plan ID from:

```text
NOWPAY_<coinPlanId>_<timestamp>
```

using:

```js
const getCoinPlanIdFromOrderId = (value) => {
  if (!value) {
    return null;
  }

  const prefix = "NOWPAY_";

  if (!value.startsWith(prefix)) {
    return null;
  }

  const withoutPrefix = value.substring(prefix.length);
  const parts = withoutPrefix.split("_");

  if (parts.length < 2) {
    return null;
  }

  return parts[0];
};
```

Then:

```js
const coinPlanId =
  getCoinPlanIdFromOrderId(orderId);
```

The purchase call is:

```js
await recordPurchaseHistory({
  planType: "coinPlan",
  coinPlanId,
  paymentGateway: "nowpayments",
});
```

After a successful purchase, refresh the user:

```js
await dispatch(fetchUserProfile());
```

---

# 18. Duplicate Protection on Success Page

The current implementation uses:

```js
const storageKey =
  `nowpayments_processed_${orderId}`;
```

Then:

```js
const alreadyProcessed =
  sessionStorage.getItem(storageKey);
```

If already processed:

```js
if (alreadyProcessed === "true") {
  setSuccess(true);
  setMessage(
    "Your payment has already been processed successfully."
  );

  await dispatch(fetchUserProfile());

  return;
}
```

After successful purchase:

```js
sessionStorage.setItem(
  storageKey,
  "true"
);
```

This prevents the same browser session from repeatedly submitting the purchase when the success page is refreshed.

Important: this is **browser-level duplicate protection**, not a replacement for server-side idempotency.

---

# 19. Purchase Recording

The current helper is:

```text
src/lib/payment/recordPurchaseHistory.js
```

It supports both coin plans and VIP plans.

For a coin plan:

```js
await recordPurchaseHistory({
  planType: 'coinPlan',
  coinPlanId,
  paymentGateway: 'nowpayments',
});
```

The current coin-plan endpoint used by the helper is:

```text
/api/client/coinPlan/recordCoinPlanPurchase
```

with:

```text
coinPlanId
paymentGateway
```

as query parameters.

Example:

```text
/api/client/coinPlan/recordCoinPlanPurchase
  ?coinPlanId=67d8fd84a0cfb32e816e59f
  &paymentGateway=nowpayments
```

If another product uses a different purchase-recording API, change only this product-specific helper/API mapping. Do not change the NOWPayments package itself for that.

---

# 20. IPN Webhook

## File

```text
src/app/api/payments/nowpayments/ipn/route.js
```

The webhook receives the request directly from NOWPayments.

It must read the raw request body:

```js
const rawBody = await request.text();
```

Do NOT call:

```js
await request.json()
```

before signature verification because the raw JSON string is required for HMAC verification.

---

# 21. IPN Signature Verification

The current implementation reads:

```js
const signature =
  request.headers.get('x-nowpayments-sig') || '';
```

Then calculates:

```js
const expectedSignature =
  crypto
    .createHmac('sha512', secret)
    .update(rawBody)
    .digest('hex');
```

Then compares the received and calculated signatures using:

```js
crypto.timingSafeEqual()
```

This prevents accepting an unsigned/falsely signed IPN request.

---

# 22. IPN Secret

The current Figgy webhook implementation reads:

```js
const secret =
  process.env.NOWPAYMENTS_IPN_SECRET;
```

Therefore the deployed application must have:

```env
NOWPAYMENTS_IPN_SECRET=your_ipn_secret
```

configured on the server.

The create-payment request currently receives `ipnSecret` through the gateway credentials and passes it to `createNowPaymentsInvoice()`, while the webhook verification uses the server environment variable.

These are two separate concerns:

```text
Create invoice
    ↓
ipnSecret passed to package

Webhook verification
    ↓
server-side NOWPAYMENTS_IPN_SECRET
```

The server-side webhook secret must be configured correctly in every environment.

---

# 23. IPN Status Handling

The current webhook intentionally ignores statuses other than:

```text
finished
```

Example:

```js
if (payload.payment_status !== 'finished') {
  return Response.json({
    status: true,
    ignored: true,
    paymentStatus: payload.payment_status,
  });
}
```

For a finished payment, the webhook logs:

```js
console.table({
  orderId: payload.order_id,
  paymentId: payload.payment_id,
  invoiceId: payload.invoice_id,
  purchaseId: payload.purchase_id,
  paymentStatus: payload.payment_status,
  amount: payload.price_amount,
  currency: payload.price_currency,
  payCurrency: payload.pay_currency,
});
```

---

# 24. Important Current IPN Behavior

The current Figgy implementation does NOT record the purchase directly from the IPN.

The current code deliberately leaves the following out of the webhook:

```js
recordPurchaseHistory()
```

The current flow is:

```text
NOWPayments
    ↓
IPN
    ↓
Signature validation
    ↓
finished status
    ↓
Webhook acknowledges request

Browser
    ↓
NOWPayments success redirect
    ↓
Figgy success page
    ↓
recordPurchaseHistory()
```

This is the behavior of the current working Figgy implementation.

---

# 25. Important Security Recommendation

The current working implementation is suitable as a reference/test implementation, but the final production architecture should not trust a browser redirect as proof that payment was completed.

A user can potentially manually open the success URL.

For a hardened production implementation, the recommended flow is:

```text
User
 ↓
NOWPayments hosted checkout
 ↓
Payment completed
 ↓
NOWPayments IPN
 ↓
Verify signature
 ↓
Verify payment status
 ↓
Verify order ID
 ↓
Verify amount
 ↓
Verify currency
 ↓
Record transaction server-side
 ↓
Credit coins
```

The browser success page should then only display the transaction result.

If the product's backend already provides an authenticated and idempotent transaction-recording API, use that API from a server-side verification flow rather than relying solely on the browser redirect.

---

# 26. Do Not Expose Secrets in Production

The current settings architecture passes:

```js
apiKey
sandboxKey
ipnSecret
```

from the application settings into the client-side payment flow.

That means these values can be visible to the browser.

This is acceptable only if the existing settings architecture intentionally exposes those values and the environment is controlled accordingly.

For production security, the preferred architecture is:

```text
Browser
   ↓
Product Next.js API
   ↓
Server-side credentials
   ↓
NOWPayments
```

instead of:

```text
Browser
   ↓
NOWPayments credentials
   ↓
Product API
```

The IPN secret in particular should remain server-side.

---

# 27. incodespay NOWPayments Flow

The product calls:

```js
startPayment({
  gateway: 'nowpayments',
  amount,
  currency,
  credentials,
  customer,
  metadata,
  apiUrl,
});
```

The package sends approximately:

```js
{
  apiKey: credentials.apiKey,
  sandboxKey: credentials.sandboxKey,
  sandbox: credentials.sandbox,
  ipnSecret: credentials.ipnSecret,
  payCurrency: credentials.payCurrency,
  amount,
  currency,
  customer,
  metadata,
  successUrl,
  cancelUrl,
}
```

to:

```text
/api/payments/nowpayments/create-payment
```

The product API returns:

```js
{
  status: true,
  success: true,
  paymentUrl: response.invoice_url,
  orderId,
  invoice: response,
}
```

The package should extract:

```js
invoiceData.paymentUrl
```

and open:

```text
https://sandbox.nowpayments.io/payment/?iid=...
```

for sandbox mode.

---

# 28. Important Response Handling

The package should not assume that the product API returns:

```js
invoiceData.data.invoice_url
```

The current product API returns:

```js
invoiceData.paymentUrl
```

Therefore the package's NOWPayments gateway should support:

```js
const checkoutUrl =
  invoiceData?.paymentUrl ||
  invoiceData?.data?.invoice_url ||
  invoiceData?.invoice?.invoice_url;

if (!checkoutUrl) {
  throw new Error(
    'NOWPayments invoice was created but checkout URL was not returned.'
  );
}
```

Then:

```js
return await openNowPaymentsCheckout({
  checkoutUrl,
});
```

---

# 29. NOWPayments Gateway Package Implementation

Inside `incodespay`, the gateway should follow the same structure as the other gateways.

Example:

```js
if (gateway === "nowpayments") {
  const response = await fetch(apiUrl, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      apiKey: credentials.apiKey,
      sandboxKey: credentials.sandboxKey,
      sandbox: credentials.sandbox,
      ipnSecret: credentials.ipnSecret,
      payCurrency: credentials.payCurrency,
      amount,
      currency,
      customer,
      metadata,
      successUrl,
      cancelUrl,
    }),
  });

  const invoiceData = await response.json();

  if (!response.ok || !invoiceData?.status) {
    throw new Error(
      invoiceData?.message ||
      "Failed to create NOWPayments invoice."
    );
  }

  const checkoutUrl =
    invoiceData?.paymentUrl ||
    invoiceData?.data?.invoice_url ||
    invoiceData?.invoice?.invoice_url;

  if (!checkoutUrl) {
    throw new Error(
      "NOWPayments invoice was created but checkout URL was not returned."
    );
  }

  return await openNowPaymentsCheckout({
    checkoutUrl,
  });
}
```

The gateway must also be exported through the package's public API.

---

# 30. Hosted Checkout Helper

The package's NOWPayments checkout helper should simply redirect to the returned hosted URL.

Example:

```js
export const openNowPaymentsCheckout = async ({
  checkoutUrl,
}) => {
  if (!checkoutUrl) {
    throw new Error(
      "NOWPayments checkout URL is required."
    );
  }

  window.location.href = checkoutUrl;

  return {
    success: true,
    checkoutUrl,
  };
};
```

---

# 31. Complete File Structure

A product using this integration should have approximately:

```text
src/
├── app/
│   ├── api/
│   │   └── payments/
│   │       └── nowpayments/
│   │           ├── create-payment/
│   │           │   └── route.js
│   │           └── ipn/
│   │               └── route.js
│   │
│   └── (public)/
│       └── payment/
│           └── nowpayments/
│               ├── success/
│               │   └── page.jsx
│               └── cancel/
│                   └── page.jsx
│
├── components/
│   └── payment/
│       └── gatewayConfig.js
│
└── lib/
    └── payment/
        └── recordPurchaseHistory.js
```

The exact folders can differ between products, but the responsibilities should remain the same.

---

# 32. Environment Variables

At minimum, the webhook server needs:

```env
NOWPAYMENTS_IPN_SECRET=...
```

Do NOT place production API credentials into the source code.

If the product's settings service already provides the NOWPayments credentials, use those values instead of duplicating them in `.env`.

The IPN webhook is different because NOWPayments calls it directly without a browser session, so the webhook must have access to its secret server-side.

---

# 33. Local Testing

Start the Next.js application:

```bash
npm run dev
```

The current Figgy project uses:

```text
http://localhost:5003
```

because its development script is:

```json
"dev": "next dev -p 5003"
```

Select:

```text
Wallet
→ Coin package
→ NOWPayments
→ Proceed
```

Expected sequence:

```text
POST /api/payments/nowpayments/create-payment
    ↓
200
    ↓
NOWPayments hosted checkout
```

The browser should open a URL similar to:

```text
https://sandbox.nowpayments.io/payment/?iid=<invoice_id>
```

---

# 34. Successful Payment Test

After completing a sandbox payment:

NOWPayments should redirect to:

```text
/payment/nowpayments/success
```

with an order ID similar to:

```text
NOWPAY_<coinPlanId>_<timestamp>
```

The success page extracts:

```text
<coinPlanId>
```

from that order ID.

Then it calls:

```js
recordPurchaseHistory({
  planType: 'coinPlan',
  coinPlanId,
  paymentGateway: 'nowpayments',
});
```

Finally:

```js
dispatch(fetchUserProfile());
```

refreshes the wallet balance.

---

# 35. Cancel Test

Cancel the hosted NOWPayments checkout.

Expected result:

```text
/payment/nowpayments/cancel?orderId=...
```

The page should display:

```text
Payment Cancelled
```

and:

```text
No coins were added to your account.
```

---

# 36. IPN Test

When NOWPayments sends an IPN request, the Next.js terminal should show:

```text
NOWPayments IPN:
{
  ...
  payment_status: "finished",
  order_id: "NOWPAY_...",
  payment_id: ...,
  invoice_id: ...
}
```

For non-final statuses, the endpoint should return:

```json
{
  "status": true,
  "ignored": true
}
```

For a valid finished payment:

```json
{
  "status": true,
  "received": true
}
```

---

# 37. Production Deployment Requirements

Before deploying:

### Required

- `incodespay` package version containing NOWPayments support
- NOWPayments gateway exported from the package
- product API route deployed
- IPN route publicly accessible
- correct IPN secret configured server-side
- production NOWPayments API credentials
- `isTest` changed to production mode
- production success URL
- production cancel URL
- production IPN URL
- HTTPS enabled

---

# 38. IPN URL Must Be Public

NOWPayments cannot send a webhook to:

```text
http://localhost:5003/api/payments/nowpayments/ipn
```

from its production servers.

Local testing requires a publicly accessible tunnel or deployed environment.

Example production URL:

```text
https://your-domain.com/api/payments/nowpayments/ipn
```

The create-payment API automatically builds this from the current request origin:

```js
const origin = new URL(request.url).origin;
```

Therefore deploying the same Next.js code under the correct domain automatically changes the callback URL.

---

# 39. Production Checklist

Before marking the integration complete:

- [ ] `incodespay` contains NOWPayments gateway
- [ ] `startPayment()` supports `nowpayments`
- [ ] NOWPayments gateway is exported from the package
- [ ] NOWPayments checkout helper is exported
- [ ] Product has `PAYMENT_GATEWAY.NOWPAYMENTS`
- [ ] NOWPayments appears in payment method selector
- [ ] `nowPaymentAndroidEnabled` works
- [ ] `nowPaymentIosEnabled` works
- [ ] `apiKey` is mapped
- [ ] `sandboxKey` is mapped
- [ ] `isTest` is mapped
- [ ] `payCurrency` is mapped
- [ ] `ipnSecret` is mapped
- [ ] required credential validation exists
- [ ] wallet API map contains `/api/payments/nowpayments/create-payment`
- [ ] create-payment route exists
- [ ] create-payment route imports `createNowPaymentsInvoice`
- [ ] order ID contains the plan ID
- [ ] success URL is correct
- [ ] cancel URL is correct
- [ ] IPN callback URL is correct
- [ ] success page exists
- [ ] cancel page exists
- [ ] success page extracts plan ID from `orderId`
- [ ] purchase recording works
- [ ] user profile refresh works
- [ ] IPN endpoint exists
- [ ] IPN signature verification works
- [ ] IPN secret exists server-side
- [ ] `finished` status is handled
- [ ] sandbox payment succeeds
- [ ] sandbox cancellation works
- [ ] IPN is received
- [ ] production callback URLs are publicly reachable
- [ ] production credentials are configured
- [ ] duplicate transaction handling is implemented server-side

---

# 40. Troubleshooting

## Error: `NOWPayments credentials are required.`

Check:

```js
getGatewayCredentials(
  selectedPaymentMethod,
  appSettings
)
```

and confirm:

```js
apiKey
sandboxKey
```

are actually present.

Also inspect the browser Network request to:

```text
/api/payments/nowpayments/create-payment
```

---

## Error: `planId is required.`

The wallet must send:

```js
metadata: {
  planId: selectedPlan._id,
  planType: 'coinPlan',
  coins: selectedPlan.coins,
}
```

---

## Error: `Failed to create NOWPayments invoice.`

Inspect the API response.

The package should read:

```js
invoiceData.paymentUrl
```

because the current product API returns:

```js
{
  status: true,
  success: true,
  paymentUrl: "...",
  orderId: "...",
  invoice: {...}
}
```

---

## Success page says `Coin plan ID is missing`

Do not look for:

```text
?coinPlanId=...
```

The current implementation stores the plan ID inside:

```text
NOWPAY_<coinPlanId>_<timestamp>
```

Extract it from:

```js
orderId
```

---

## IPN returns `Missing NOWPayments signature`

Check whether NOWPayments is sending:

```text
x-nowpayments-sig
```

and make sure the request reaches the correct IPN route.

---

## IPN returns `Invalid signature`

Verify:

```env
NOWPAYMENTS_IPN_SECRET=...
```

matches the IPN secret configured in NOWPayments.

Do not parse the body with `request.json()` before calculating the signature.

---

## IPN says secret is not configured

The server environment does not contain:

```env
NOWPAYMENTS_IPN_SECRET
```

Add it to the deployed environment and restart/redeploy the application.

---

## Hosted checkout does not open

Check:

1. `create-payment` response
2. `paymentUrl`
3. browser console
4. `openNowPaymentsCheckout()`
5. package version
6. package build/export

The expected response contains:

```json
{
  "status": true,
  "success": true,
  "paymentUrl": "https://sandbox.nowpayments.io/payment/?iid=..."
}
```

---

# 41. Recommended Integration Order for a New Product

When integrating NOWPayments into another Next.js product, follow this order exactly.

### Step 1

Install/update the package:

```bash
npm install github:incodes-dev/incodespay#main
```

or use the released package version containing NOWPayments.

### Step 2

Add the gateway constant.

### Step 3

Add NOWPayments to the enabled gateway list.

### Step 4

Add currency mapping.

### Step 5

Add credential mapping.

### Step 6

Add required credential validation.

### Step 7

Update the wallet/payment component to call:

```js
startPayment()
```

with:

```js
gateway: 'nowpayments'
```

### Step 8

Create:

```text
/api/payments/nowpayments/create-payment
```

### Step 9

Create:

```text
/api/payments/nowpayments/ipn
```

### Step 10

Create:

```text
/payment/nowpayments/success
```

### Step 11

Create:

```text
/payment/nowpayments/cancel
```

### Step 12

Connect the success flow to the product's own purchase-recording API.

### Step 13

Test sandbox checkout.

### Step 14

Test successful redirect.

### Step 15

Test cancellation.

### Step 16

Test IPN.

### Step 17

Verify wallet/coin balance.

### Step 18

Deploy and test again with production callback URLs.

---

# 42. Reference Flow

The complete implementation should look like this:

```text
┌──────────────────────┐
│      App Settings    │
│                      │
│ apiKey               │
│ sandboxKey           │
│ isTest               │
│ payCurrency          │
│ ipnSecret            │
│ nowPaymentEnabled    │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│      Product Wallet  │
│                      │
│ Select NOWPayments   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   incodespay         │
│   startPayment()     │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────────────┐
│ Next.js                      │
│ /api/payments/nowpayments/   │
│ create-payment               │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────┐
│     NOWPayments      │
│     Invoice API      │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Hosted Checkout      │
│ sandbox.nowpayments  │
└──────────┬───────────┘
           │
       ┌───┴────┐
       │        │
       ▼        ▼
   Success    Cancel
       │        │
       ▼        ▼
 /success    /cancel
       │
       ▼
recordPurchaseHistory()
       │
       ▼
fetchUserProfile()
```

Separately:

```text
NOWPayments
     │
     │ IPN
     ▼
/api/payments/nowpayments/ipn
     │
     ▼
Verify x-nowpayments-sig
     │
     ▼
payment_status
     │
     ├── not finished → acknowledge/ignore
     │
     └── finished → process/verify transaction
```

---

# 43. Final Notes for Team Members

### Do not change

The existing integrations:

- Stripe
- Razorpay
- PayPal
- Paystack
- Cashfree
- Flutterwave

NOWPayments should be added as a separate gateway.

### Do not duplicate credentials

If the product already receives NOWPayments settings from its settings API, use those settings.

### Do not hardcode credentials

Never put:

```js
apiKey: "..."
```

inside source code.

### Do not use a separate Node.js backend

This integration is designed for Next.js App Router.

The required backend functionality can live inside:

```text
src/app/api/
```

using Next.js route handlers.

### Keep product-specific logic out of incodespay

`incodespay` should handle:

```text
NOWPayments invoice creation request
checkout URL handling
```

The product should handle:

```text
settings
Next.js API routes
IPN endpoint
success/cancel pages
purchase recording
user balance refresh
```

This keeps NOWPayments reusable across products.
