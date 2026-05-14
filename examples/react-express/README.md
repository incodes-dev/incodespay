# React + Express Example

Use package helpers with an Express API and React frontend.

## Express API

```ts
import express from "express";
import { createExpressGatewayHandler } from "@your-scope/payments-kit/generic";

const app = express();
app.use(express.json());

app.post(
  "/api/payments/stripe/init",
  createExpressGatewayHandler({
    gateway: "stripe",
    resolveCredentials: () => ({
      secretKey: process.env.STRIPE_SECRET_KEY
    })
  })
);
```

## React Frontend

```tsx
import { StripeGatewayCheckout } from "@your-scope/payments-kit/client";

export default function Checkout() {
  return (
    <StripeGatewayCheckout initEndpoint="/api/payments/stripe/init" />
  );
}
```
