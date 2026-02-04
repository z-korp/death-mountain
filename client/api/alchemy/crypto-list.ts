import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createHmac } from "node:crypto";
import { ALCHEMY_CONFIG } from "../lib/alchemyPay.js";

interface CryptoInfo {
  crypto: string;
  network: string;
  buyEnable: number;
  sellEnable: number;
  minPurchaseAmount: number;
  maxPurchaseAmount: number;
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
    // Check if we should query production
    const useProd = req.query.env === "production";
    const baseUrl = useProd 
      ? "https://openapi.alchemypay.org"
      : "https://openapi-test.alchemypay.org";
    
    const path = "/open/api/v4/merchant/crypto/list";
    const url = `${baseUrl}${path}`;
    const timestamp = Date.now().toString();
    
    // Generate signature
    const content = timestamp + "GET" + path;
    const sign = createHmac("sha256", ALCHEMY_CONFIG.appSecret)
      .update(content)
      .digest("base64");
    
    console.log(`Fetching crypto list from ${useProd ? "PRODUCTION" : "SANDBOX"}...`);
    console.log("URL:", url);
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "appid": ALCHEMY_CONFIG.appId,
        "timestamp": timestamp,
        "sign": sign,
      },
    });

    const result = await response.json();
    
    console.log("Response status:", response.status);
    console.log("Response:", JSON.stringify(result).substring(0, 500) + "...");

    if (!result.success) {
      return res.status(400).json({
        error: "Failed to get crypto list",
        details: result.returnMsg,
        returnCode: result.returnCode,
        env: useProd ? "production" : "sandbox",
      });
    }

    // Filter to show only buy-enabled cryptos if requested
    let data = result.data as CryptoInfo[];
    if (req.query.buyOnly === "true") {
      data = data.filter((c: CryptoInfo) => c.buyEnable === 1);
    }
    
    // Filter by network if requested
    if (req.query.network) {
      data = data.filter((c: CryptoInfo) => 
        c.network.toUpperCase() === (req.query.network as string).toUpperCase()
      );
    }

    return res.status(200).json({
      success: true,
      env: useProd ? "production" : "sandbox",
      count: data.length,
      data: data,
    });
  } catch (error) {
    console.error("Error in crypto-list endpoint:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}
