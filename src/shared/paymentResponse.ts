export const createPaymentSuccessResponse = ({
  gateway,
  transactionId,
  raw,
}: any) => {
  return {
    success: true,

    gateway,

    transactionId,

    raw,
  };
};