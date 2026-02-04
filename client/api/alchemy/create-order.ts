import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  alchemyRequest,
  formatWalletAddress,
  generateUidFromAddress,
  generateMerchantOrderNo,
  storeOrder,
  ALCHEMY_CONFIG,
  type SupportedCrypto,
  SUPPORTED_CRYPTOS,
} from "../lib/alchemyPay.js";

interface CreateOrderRequest {
  walletAddress: string;
  userName?: string;
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
  console.log("=== CREATE ORDER ENDPOINT HIT ===");
  console.log("Method:", req.method);
  console.log("Body:", JSON.stringify(req.body));
  
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      walletAddress,
      userName,
      fiatAmount,
      fiatCurrency = "USD",
      cryptoCurrency,
      gameCount = 1,
    } = req.body as CreateOrderRequest;
    
    console.log("Parsed request:", { walletAddress, userName, fiatAmount, fiatCurrency, cryptoCurrency, gameCount });

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

    const formattedAddress = formatWalletAddress(walletAddress);
    // Use userName if provided, otherwise generate from address (max 36 chars)
    const uid = userName || generateUidFromAddress(walletAddress);
    const merchantOrderNo = generateMerchantOrderNo();

    console.log("Formatted address:", formattedAddress);
    console.log("UID:", uid, "length:", uid.length);

    // Step 1: Get access token using wallet address as UID
    console.log("Calling getToken with uid:", uid);
    const tokenResult = await alchemyRequest<AlchemyTokenResponse>(
      "POST",
      "/open/api/v4/merchant/getToken",
      { uid }
    );
    
    console.log("Token result:", JSON.stringify(tokenResult));

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
      network: ALCHEMY_CONFIG.network,
      payWayCode: "10001", // Credit card - can be made dynamic
      redirectUrl: `${frontendUrl}/survivor/payment/callback?orderId=${merchantOrderNo}`,
      callbackUrl: `${apiUrl}/api/alchemy/webhook`,
    };

    console.log("=== CREATE ORDER PAYLOAD ===");
    console.log("Order body:", JSON.stringify(orderBody, null, 2));
    console.log("Network:", ALCHEMY_CONFIG.network);
    console.log("Base URL:", ALCHEMY_CONFIG.baseUrl);
    console.log("Access Token (first 50 chars):", accessToken.substring(0, 50) + "...");

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
