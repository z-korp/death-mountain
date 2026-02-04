import type { VercelRequest, VercelResponse } from "@vercel/node";
import { alchemyRequest, formatStarknetAddress } from "../lib/alchemyPay";

interface GetTokenRequest {
  uid: string; // User's wallet address
}

interface GetTokenResponse {
  accessToken: string;
  id: string;
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
    const { uid } = req.body as GetTokenRequest;

    if (!uid) {
      return res.status(400).json({ error: "uid (wallet address) is required" });
    }

    // Format the wallet address as UID
    const formattedUid = formatStarknetAddress(uid);

    const result = await alchemyRequest<GetTokenResponse>(
      "POST",
      "/open/api/v4/merchant/getToken",
      { uid: formattedUid }
    );

    if (!result.success) {
      console.error("Alchemy Pay getToken failed:", result.error);
      return res.status(400).json({
        error: result.error || "Failed to get access token",
        returnCode: result.returnCode,
      });
    }

    return res.status(200).json({
      success: true,
      accessToken: result.data!.accessToken,
      id: result.data!.id,
    });
  } catch (error) {
    console.error("Error in get-token endpoint:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}
