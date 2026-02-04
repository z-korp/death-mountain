import { createHmac } from "node:crypto";

// Environment configuration
export const ALCHEMY_CONFIG = {
  appId: process.env.ALCHEMY_APP_ID || "f83Is2y7L425rxl8",
  appSecret: process.env.ALCHEMY_APP_SECRET || "8Z2wt0dYslDH2z6x",
  baseUrl:
    process.env.ALCHEMY_ENV === "production"
      ? "https://openapi.alchemypay.org"
      : "https://openapi-test.alchemypay.org",
  // Network code: ARBITRUM for sandbox testing, STARKNET for production
  network: process.env.ALCHEMY_NETWORK || "ARBITRUM",
};

// Supported cryptocurrencies (USDC available on both Arbitrum and Starknet)
export const SUPPORTED_CRYPTOS = ["USDC", "ETH"] as const;
export type SupportedCrypto = (typeof SUPPORTED_CRYPTOS)[number];

// Order status types
export type OrderStatus =
  | "PENDING"
  | "PAY_SUCCESS"
  | "PAY_FAIL"
  | "FINISHED"
  | "EXPIRED";

// Order storage (in-memory for MVP, consider Vercel KV for production)
export interface StoredOrder {
  merchantOrderNo: string;
  alchemyOrderNo?: string;
  walletAddress: string;
  cryptoCurrency: SupportedCrypto;
  fiatAmount: number;
  fiatCurrency: string;
  gameCount: number;
  status: OrderStatus;
  createdAt: number;
  updatedAt: number;
  txHash?: string;
  cryptoAmount?: string;
}

// Simple in-memory order storage
// In production, use Vercel KV or a database
const orderStore = new Map<string, StoredOrder>();

export function storeOrder(order: StoredOrder): void {
  orderStore.set(order.merchantOrderNo, order);
}

export function getOrder(merchantOrderNo: string): StoredOrder | undefined {
  return orderStore.get(merchantOrderNo);
}

export function updateOrder(
  merchantOrderNo: string,
  updates: Partial<StoredOrder>
): StoredOrder | undefined {
  const order = orderStore.get(merchantOrderNo);
  if (order) {
    const updated = { ...order, ...updates, updatedAt: Date.now() };
    orderStore.set(merchantOrderNo, updated);
    return updated;
  }
  return undefined;
}

// Clean up expired orders (older than 24 hours)
export function cleanupExpiredOrders(): void {
  const now = Date.now();
  const expirationTime = 24 * 60 * 60 * 1000; // 24 hours

  orderStore.forEach((order, key) => {
    if (now - order.createdAt > expirationTime) {
      orderStore.delete(key);
    }
  });
}

/**
 * Sort object keys alphabetically (recursive)
 * Required for Alchemy Pay signature generation
 */
export function sortObjectKeys(obj: Record<string, unknown>): Record<string, unknown> {
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sortObjectKeys(item as Record<string, unknown>)) as unknown as Record<string, unknown>;
  }

  const sortedKeys = Object.keys(obj).sort();
  const result: Record<string, unknown> = {};

  for (const key of sortedKeys) {
    const value = obj[key];
    // Remove empty values
    if (value === null || value === undefined || value === "") {
      continue;
    }
    result[key] = sortObjectKeys(value as Record<string, unknown>);
  }

  return result;
}

/**
 * Generate API signature for Alchemy Pay requests
 * Algorithm: HMAC-SHA256(timestamp + method + path + sortedBody, appSecret) -> Base64
 */
export function generateSign(
  timestamp: string,
  method: string,
  path: string,
  body?: Record<string, unknown>
): string {
  let bodyString = "";

  if (body && Object.keys(body).length > 0) {
    const sortedBody = sortObjectKeys(body);
    bodyString = JSON.stringify(sortedBody);
  }

  const content = timestamp + method.toUpperCase() + path + bodyString;
  const sign = createHmac("sha256", ALCHEMY_CONFIG.appSecret)
    .update(content)
    .digest("base64");

  return sign;
}

/**
 * Generate common headers for Alchemy Pay API requests
 */
export function getApiHeaders(
  method: string,
  path: string,
  body?: Record<string, unknown>,
  accessToken?: string
): Record<string, string> {
  const timestamp = Date.now().toString();
  const sign = generateSign(timestamp, method, path, body);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    appid: ALCHEMY_CONFIG.appId,
    timestamp: timestamp,
    sign: sign,
  };

  if (accessToken) {
    headers["access-token"] = accessToken;
  }

  return headers;
}

/**
 * Make a request to the Alchemy Pay API
 */
export async function alchemyRequest<T>(
  method: "GET" | "POST",
  path: string,
  body?: Record<string, unknown>,
  accessToken?: string
): Promise<{ success: boolean; data?: T; error?: string; returnCode?: string }> {
  const headers = getApiHeaders(method, path, body, accessToken);
  const url = `${ALCHEMY_CONFIG.baseUrl}${path}`;

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(sortObjectKeys(body)) : undefined,
    });

    const result = await response.json();

    if (result.success && result.returnCode === "0000") {
      return { success: true, data: result.data };
    } else {
      return {
        success: false,
        error: result.returnMsg || "Unknown error",
        returnCode: result.returnCode,
      };
    }
  } catch (error) {
    console.error("Alchemy Pay API error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Generate a unique merchant order number
 */
export function generateMerchantOrderNo(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  return `DM_${timestamp}_${random}`;
}

/**
 * Verify webhook signature from Alchemy Pay
 */
export function verifyWebhookSignature(
  timestamp: string,
  body: Record<string, unknown>,
  receivedSignature: string
): boolean {
  // Alchemy Pay webhook signature uses the same algorithm
  const path = ""; // Webhook doesn't use path in signature
  const expectedSignature = generateSign(timestamp, "POST", path, body);
  return expectedSignature === receivedSignature;
}

/**
 * Format wallet address - ensure proper format
 */
export function formatWalletAddress(address: string): string {
  // Ensure address starts with 0x and is properly formatted
  if (!address.startsWith("0x")) {
    address = "0x" + address;
  }
  return address.toLowerCase();
}

/**
 * Generate a UID from wallet address (max 36 chars for Alchemy Pay)
 * Uses last 32 chars of address + 4 char prefix
 */
export function generateUidFromAddress(address: string): string {
  const formatted = formatWalletAddress(address);
  // Take last 34 characters (including 0x prefix style)
  // UID max is 36, so we use "dm" prefix + last 34 chars
  return "dm" + formatted.slice(-34);
}
