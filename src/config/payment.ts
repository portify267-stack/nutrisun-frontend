export interface PaymentConfig {
  accountHolder: string;
  upiId: string;
  qrAssetPath: string;
  instruction: string;
}

export const PAYMENT_CONFIG: PaymentConfig = {
  accountHolder: process.env.NEXT_PUBLIC_PAYEE_NAME || 'Syed Kaleel Awn M',
  upiId: process.env.NEXT_PUBLIC_UPI_ID || 'syedkaleelawn@icici',
  qrAssetPath: process.env.NEXT_PUBLIC_QR_ASSET_PATH || '/ICICIBank_QR.jpg',
  instruction:
    process.env.NEXT_PUBLIC_PAYMENT_INSTRUCTION ||
    'Scan this QR using any UPI app, enter the exact amount shown, and upload your payment screenshot for admin verification.',
};
