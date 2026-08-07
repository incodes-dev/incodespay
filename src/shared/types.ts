export type PaymentGateway =
  | "razorpay"
  | "stripe"
  | "paypal"
  | "paystack"
  | "flutterwave"
  | "cashfree"
  | "nowpayments";

export interface PaymentCustomer {
  name: string;
  email: string;
  phone?: string;
}

export interface StartPaymentPayload {
  gateway: PaymentGateway;

  amount: number;

  currency: string;

  credentials: Record<string, any>;

  customer: PaymentCustomer;

  metadata?: Record<string, any>;
}

export interface PaymentSuccessResponse {
  success: true;

  gateway: PaymentGateway;

  transactionId?: string;

  raw: any;
}