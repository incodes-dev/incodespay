import Razorpay from "razorpay";

export const createRazorpayOrder = async ({
  keyId,
  keySecret,
  amount,
  currency,
}: {
  keyId: string;
  keySecret: string;
  amount: number;
  currency: string;
}) => {
  const razorpay = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });

  const order = await razorpay.orders.create({
    amount: Math.round(amount * 100),
    currency,
  });

  return order;
};