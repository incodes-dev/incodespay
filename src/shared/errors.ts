export class PaymentCancelledError extends Error {
  constructor(message = "Payment cancelled") {
    super(message);

    this.name = "PaymentCancelledError";
  }
}

export class PaymentFailedError extends Error {
  constructor(message = "Payment failed") {
    super(message);

    this.name = "PaymentFailedError";
  }
}

export class GatewayConfigError extends Error {
  constructor(message = "Invalid gateway configuration") {
    super(message);

    this.name = "GatewayConfigError";
  }
}
