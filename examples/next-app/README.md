# Next.js Example

Use package helpers with App Router route handlers:

- Route handler: `createNextGatewayRoute(...)`
- UI: `StripeGatewayCheckout` / `RazorpayGatewayCheckout`

Example route:

```ts
import { createNextGatewayRoute } from "@your-scope/payments-kit/next";

export const POST = createNextGatewayRoute({
  gateway: "razorpay",
  resolveCredentials: () => ({
    keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET
  })
});
```

Example component:

```tsx
import { RazorpayGatewayCheckout } from "@your-scope/payments-kit/client";

export default function RazorpayPage() {
  return (
    <RazorpayGatewayCheckout
      initEndpoint="/api/create-razorpay-order"
      razorpayKeyId={process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || ""}
    />
  );
}
```
