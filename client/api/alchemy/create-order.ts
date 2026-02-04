import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  alchemyRequest,
  formatStarknetAddress,
  generateMerchantOrderNo,
  storeOrder,
  ALCHEMY_CONFIG,
  type SupportedCrypto,
  SUPPORTED_CRYPTOS,
} from "../lib/alchemyPay";

interface CreateOrderRequest {
  walletAddress: string;
  fiatAmount: number;
  fiatCurrency: string;
  cryptoCurrency: SupportedCrypto;
  gameCount: number;
}

interface AlchemyTokenResponse {
  accessToken: string;
  id: string;
}

interface AlchemyOrderResponse {
  orderNo: string;
  payUrl: string;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      walletAddress,
      fiatAmount,
      fiatCurrency = "USD",
      cryptoCurrency,
      gameCount = 1,
    } = req.body as CreateOrderRequest;

    // Validate required fields
    if (!walletAddress) {
      return res.status(400).json({ error: "walletAddress is required" });
    }
    if (!fiatAmount || fiatAmount < 1) {
      return res.status(400).json({ error: "fiatAmount must be at least $1" });
    }
    if (!cryptoCurrency || !SUPPORTED_CRYPTOS.includes(cryptoCurrency)) {
      return res.status(400).json({
        error: `cryptoCurrency must be one of: ${SUPPORTED_CRYPTOS.join(", ")}`,
      });
    }

    const formattedAddress = formatStarknetAddress(walletAddress);
    const merchantOrderNo = generateMerchantOrderNo();

    // Step 1: Get access token using wallet address as UID
    const tokenResult = await alchemyRequest<AlchemyTokenResponse>(
      "POST",
      "/open/api/v4/merchant/getToken",
      { uid: formattedAddress }
    );

    if (!tokenResult.success || !tokenResult.data) {
      console.error("Failed to get access token:", tokenResult.error);
      return res.status(400).json({
        error: "Failed to get access token from Alchemy Pay",
        details: tokenResult.error,
      });
    }

    const accessToken = tokenResult.data.accessToken;

    // Step 2: Create the order
    // Determine the frontend URL for redirects
    const frontendUrl = process.env.FRONTEND_URL || 
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:5173");
    
    // Build callback URL for webhook
    const apiUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : "http://localhost:3000";

    const orderBody = {
      side: "BUY",
      merchantOrderNo: merchantOrderNo,
      amount: fiatAmount.toString(),
      fiatCurrency: fiatCurrency.toUpperCase(),
      cryptoCurrency: cryptoCurrency.toUpperCase(),
      depositType: 2,
      address: formattedAddress,
      network: ALCHEMY_CONFIG.starknetNetwork,
      payWayCode: "10001", // Credit card - can be made dynamic
      redirectUrl: `${frontendUrl}/survivor/payment/callback?orderId=${merchantOrderNo}`,
      callbackUrl: `${apiUrl}/api/alchemy/webhook`,
    };

    const orderResult = await alchemyRequest<AlchemyOrderResponse>(
      "POST",
      "/open/api/v4/merchant/trade/create",
      orderBody,
      accessToken
    );

    if (!orderResult.success || !orderResult.data) {
      console.error("Failed to create order:", orderResult.error);
      return res.status(400).json({
        error: "Failed to create order with Alchemy Pay",
        details: orderResult.error,
        returnCode: orderResult.returnCode,
      });
    }

    // Store order in memory (for order status lookup)
    storeOrder({
      merchantOrderNo,
      alchemyOrderNo: orderResult.data.orderNo,
      walletAddress: formattedAddress,
      cryptoCurrency,
      fiatAmount,
      fiatCurrency: fiatCurrency.toUpperCase(),
      gameCount,
      status: "PENDING",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return res.status(200).json({
      success: true,
      merchantOrderNo,
      orderNo: orderResult.data.orderNo,
      payUrl: orderResult.data.payUrl,
    });
  } catch (error) {
    console.error("Error in create-order endpoint:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}
