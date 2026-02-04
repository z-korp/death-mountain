import type {
  CreateOrderRequest,
  CreateOrderResponse,
  OrderStatusResponse,
  SupportedCrypto,
} from "@/types/alchemyPay";

// API base URL - use relative path for Vercel deployment
const API_BASE = "/api/alchemy";

/**
 * Create an Alchemy Pay order for fiat-to-crypto purchase
 */
export async function createAlchemyOrder(
  params: CreateOrderRequest
): Promise<CreateOrderResponse> {
  try {
    const response = await fetch(`${API_BASE}/create-order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        merchantOrderNo: "",
        orderNo: "",
        payUrl: "",
        error: data.error || `HTTP error ${response.status}`,
      };
    }

    return data;
  } catch (error) {
    console.error("Error creating Alchemy Pay order:", error);
    return {
      success: false,
      merchantOrderNo: "",
      orderNo: "",
      payUrl: "",
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Get the status of an existing order
 */
export async function getOrderStatus(
  merchantOrderNo: string
): Promise<OrderStatusResponse> {
  try {
    const response = await fetch(
      `${API_BASE}/order-status?merchantOrderNo=${encodeURIComponent(merchantOrderNo)}`
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        merchantOrderNo,
        status: "PENDING",
        cryptoCurrency: "USDC",
        gameCount: 0,
        cryptoReceived: false,
        error: data.error || `HTTP error ${response.status}`,
      };
    }

    return data;
  } catch (error) {
    console.error("Error getting order status:", error);
    return {
      success: false,
      merchantOrderNo,
      status: "PENDING",
      cryptoCurrency: "USDC",
      gameCount: 0,
      cryptoReceived: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Calculate estimated fiat amount for ticket purchase
 * This uses the Ekubo quote system to estimate how much crypto is needed,
 * then converts to fiat (rough estimate)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function estimateFiatAmount(
  gameCount: number,
  _cryptoCurrency: SupportedCrypto
): Promise<{ fiatAmount: number; cryptoAmount: number } | null> {
  // Ticket price is approximately 1 USDC equivalent per game
  // This is a rough estimate - actual price depends on swap rates
  const ticketPriceUsd = 1; // Base ticket price in USD equivalent
  const buffer = 1.1; // 10% buffer for price fluctuations and fees

  const fiatAmount = gameCount * ticketPriceUsd * buffer;

  // For STRK, we'd need to fetch the current price
  // For now, use a similar estimation
  const cryptoAmount = gameCount * 1; // Approximately 1 token per game

  return {
    fiatAmount: Math.ceil(fiatAmount * 100) / 100, // Round up to 2 decimals
    cryptoAmount,
  };
}

/**
 * Open Alchemy Pay payment page in a new window
 */
export function openPaymentPage(payUrl: string): Window | null {
  return window.open(payUrl, "_blank", "noopener,noreferrer");
}

/**
 * Open Alchemy Pay payment page by redirecting current window
 * (Better UX for mobile)
 */
export function redirectToPayment(payUrl: string): void {
  window.location.href = payUrl;
}
