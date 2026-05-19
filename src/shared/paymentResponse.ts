export const createPaymentSuccessResponse = ({
  gateway,
  transactionId,
  raw,
}: any) => ({
  success: true,
  gateway,
  transactionId,
  raw,
});

export const createPaymentErrorResponse = ({ gateway, message, raw }: any) => ({
  success: false,

  gateway,

  message,

  raw,
});
