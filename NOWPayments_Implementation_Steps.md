# NOWPayments Integration — Implementation Steps

This document contains only the steps required to add the working NOWPayments hosted checkout flow to another Next.js product using the `incodespay` package.

---

## 1. Update `incodespay`

Make sure the package version being used contains NOWPayments support.

The package must expose:

```js
import { startPayment } from 'incodespay';
```

and support:

```js
gateway: 'nowpayments'
```

The NOWPayments gateway must:

- POST payment data to the product's `apiUrl`
- read `paymentUrl` from the API response
- redirect the browser to the hosted checkout

Expected response from the product API:

```js
{
  status: true,
  success: true,
  paymentUrl: 'https://sandbox.nowpayments.io/payment/?iid=...',
  orderId: 'NOWPAY_<planId>_<timestamp>',
  invoice: { ... }
}
```

---

## 2. Add NOWPayments Gateway

### File

```text
src/components/payment/testing/gatewayConfig.js
```

### Add constant

```js
NOWPAYMENTS: 'nowpayments',
```

### Add gateway

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

## 3. Add Currency Mapping

NOWPayments uses USD as the invoice currency.

```js
if (gateway === PAYMENT_GATEWAY.NOWPAYMENTS) {
  return {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
  };
}
```

The crypto payment currency comes separately from:

```js
settings.payCurrency
```

Example:

```text
price currency: USD
pay currency: USDTTRC20
```

---

## 4. Map Credentials From Settings

Do not hardcode credentials.

Inside `getGatewayCredentials()`:

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

Required settings:

```text
apiKey
sandboxKey
isTest
payCurrency
ipnSecret
nowPaymentAndroidEnabled
nowPaymentIosEnabled
```

---

## 5. Add Credential Validation

Inside `getRequiredCredentialErrors()`:

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

---

## 6. Add API Route to Payment Map

Where the product maps gateways to API endpoints:

```js
const gatewayApiMap = {
  razorpay: '/api/payments/razorpay/create-order',
  stripe: '/api/payments/stripe/create-session',
  cashfree: '/api/payments/cashfree/create-order',
  nowpayments: '/api/payments/nowpayments/create-payment',
};
```

---

## 7. Call `startPayment()`

For a coin plan:

```js
const gatewayCredentials = getGatewayCredentials(
  selectedPaymentMethod,
  appSettings || {},
);

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

For NOWPayments, the important values are:

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

---

## 8. Stop the Normal Payment Flow

NOWPayments is hosted, so do not immediately execute the normal purchase-recording code after `startPayment()`.

```js
if (
  selectedPaymentMethod === 'stripe' ||
  selectedPaymentMethod === 'nowpayments'
) {
  return;
}
```

NOWPayments redirects the browser to its hosted checkout.

---

# 9. Create NOWPayments API Route

### File

```text
src/app/api/payments/nowpayments/create-payment/route.js
```

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
    console.error("NOWPayments create-payment error:", error);

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

# 10. Create Success Page

### File

```text
src/app/(public)/payment/nowpayments/success/page.jsx
```

The success URL contains:

```text
?orderId=NOWPAY_<planId>_<timestamp>&NP_id=<paymentId>
```

Extract the plan ID from `orderId`:

```js
const getCoinPlanIdFromOrderId = (value) => {
  if (!value?.startsWith("NOWPAY_")) {
    return null;
  }

  const parts = value
    .substring("NOWPAY_".length)
    .split("_");

  if (parts.length < 2) {
    return null;
  }

  return parts[0];
};
```

Then record the purchase:

```js
const coinPlanId =
  getCoinPlanIdFromOrderId(orderId);

await recordPurchaseHistory({
  planType: "coinPlan",
  coinPlanId,
  paymentGateway: "nowpayments",
});
```

After success:

```js
await dispatch(fetchUserProfile());
```

Use a `useRef`/session-storage guard so refreshing the success page does not repeatedly submit the purchase.

---

# 11. Create Cancel Page

### File

```text
src/app/(public)/payment/nowpayments/cancel/page.jsx
```

The page only needs to:

- show payment cancelled
- provide a button back to wallet
- provide a button back home

No purchase API should be called from the cancel page.

---

# 12. Create IPN Route

### File

```text
src/app/api/payments/nowpayments/ipn/route.js
```

Use the raw body:

```js
const rawBody = await request.text();
```

Read:

```js
const signature =
  request.headers.get('x-nowpayments-sig') || '';
```

Verify with the server-side IPN secret:

```js
const secret =
  process.env.NOWPAYMENTS_IPN_SECRET;
```

HMAC:

```js
const expectedSignature =
  crypto
    .createHmac('sha512', secret)
    .update(rawBody)
    .digest('hex');
```

Reject invalid signatures.

Then parse:

```js
const payload = JSON.parse(rawBody);
```

Only process:

```js
payload.payment_status === 'finished'
```

The IPN endpoint must be publicly reachable.

---

# 13. Purchase API

Use the product's existing purchase-recording API.

For Figgy's current implementation:

```js
await recordPurchaseHistory({
  planType: 'coinPlan',
  coinPlanId,
  paymentGateway: 'nowpayments',
});
```

The helper currently calls:

```text
POST /api/client/coinPlan/recordCoinPlanPurchase
```

with:

```text
coinPlanId
paymentGateway
```

For another product, replace this with that product's equivalent transaction API.

---

# 14. Required Environment Variable

The IPN route needs:

```env
NOWPAYMENTS_IPN_SECRET=YOUR_IPN_SECRET
```

The IPN secret must be available server-side.

---

# 15. Final File Structure

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
│       └── testing/
│           └── gatewayConfig.js
│
└── lib/
    └── payment/
        └── recordPurchaseHistory.js
```

---

# 16. Integration Test

Test in this order:

```text
1. NOWPayments appears in payment selector
        ↓
2. Select coin plan
        ↓
3. Select NOWPayments
        ↓
4. Click Proceed
        ↓
5. POST /api/payments/nowpayments/create-payment
        ↓
6. Receive paymentUrl
        ↓
7. NOWPayments hosted checkout opens
        ↓
8. Complete sandbox payment
        ↓
9. Return to /payment/nowpayments/success
        ↓
10. Extract planId from orderId
        ↓
11. Record purchase
        ↓
12. Refresh user profile / coin balance
```

Also test cancellation:

```text
NOWPayments checkout
        ↓
Cancel
        ↓
/payment/nowpayments/cancel
```

And verify the IPN endpoint receives:

```text
POST /api/payments/nowpayments/ipn
```

---

# 17. New Product Integration Checklist

```text
[ ] Update incodespay with NOWPayments support
[ ] Add NOWPAYMENTS gateway constant
[ ] Add NOWPayments to gateway list
[ ] Add USD currency mapping
[ ] Map credentials from settings
[ ] Add credential validation
[ ] Add create-payment API route
[ ] Add IPN API route
[ ] Add success page
[ ] Add cancel page
[ ] Add NOWPayments to gateway API map
[ ] Pass planId in metadata
[ ] Stop normal payment flow for NOWPayments
[ ] Connect success page to purchase API
[ ] Add NOWPAYMENTS_IPN_SECRET
[ ] Test hosted checkout
[ ] Test successful payment
[ ] Test cancelled payment
[ ] Test IPN
```
