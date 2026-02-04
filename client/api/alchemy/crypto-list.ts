import type { VercelRequest, VercelResponse } from "@vercel/node";
import { alchemyRequest } from "../lib/alchemyPay.js";

interface CryptoInfo {
  crypto: string;
  network: string;
  minPurchaseAmount: string;
  maxPurchaseAmount: string;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Allow GET
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("Fetching crypto list from Alchemy Pay...");
    
    const result = await alchemyRequest<CryptoInfo[]>(
      "GET",
      "/open/api/v4/merchant/crypto/list"
    );

    if (!result.success) {
      console.error("Failed to get crypto list:", result.error);
      return res.status(400).json({
        error: "Failed to get crypto list",
        details: result.error,
        returnCode: result.returnCode,
      });
    }

    return res.status(200).json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error("Error in crypto-list endpoint:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}
