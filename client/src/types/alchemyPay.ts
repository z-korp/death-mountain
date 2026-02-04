// Alchemy Pay types for frontend

export type SupportedCrypto = "USDC" | "ETH";

export type OrderStatus =
  | "PENDING"
  | "PAY_SUCCESS"
  | "PAY_FAIL"
  | "FINISHED"
  | "EXPIRED";

export interface CreateOrderRequest {
  walletAddress: string;
  fiatAmount: number;
  fiatCurrency: string;
  cryptoCurrency: SupportedCrypto;
  gameCount: number;
}

export interface CreateOrderResponse {
  success: boolean;
  merchantOrderNo: string;
  orderNo: string;
  payUrl: string;
  error?: string;
}

export interface OrderStatusResponse {
  success: boolean;
  merchantOrderNo: string;
  status: OrderStatus;
  alchemyStatus?: string;
  cryptoCurrency: SupportedCrypto;
  cryptoAmount?: string;
  txHash?: string;
  gameCount: number;
  cryptoReceived: boolean;
  error?: string;
}

export interface AlchemyPayOrder {
  merchantOrderNo: string;
  orderNo: string;
  payUrl: string;
  walletAddress: string;
  cryptoCurrency: SupportedCrypto;
  fiatAmount: number;
  fiatCurrency: string;
  gameCount: number;
  status: OrderStatus;
  cryptoAmount?: string;
  txHash?: string;
}

export interface FiatPaymentConfig {
  minAmount: number;
  maxAmount: number;
  supportedFiats: string[];
  supportedCryptos: SupportedCrypto[];
}

export const DEFAULT_FIAT_CONFIG: FiatPaymentConfig = {
  minAmount: 1,
  maxAmount: 1000,
  supportedFiats: ["USD", "EUR", "GBP"],
  supportedCryptos: ["USDC", "ETH"],
};
