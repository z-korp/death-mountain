import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  getOrder,
  updateOrder,
  verifyWebhookSignature,
  type OrderStatus,
} from "../lib/alchemyPay";

interface AlchemyWebhookPayload {
  appId: string;
  orderNo: string;
  merchantOrderNo: string;
  email?: string;
  crypto: string;
  cryptoPrice: string;
  cryptoQuantity: string;
  payType: string;
  fiat: string;
  amount: string;
  payTime?: string;
  network: string;
  address: string;
  txTime?: string;
  txHash?: string;
  status: string;
  message?: string;
  networkFee?: string;
  rampFee?: string;
  signature?: string; // Deprecated
  newSignature?: string;
}

// Map Alchemy Pay status to our internal status
function mapAlchemyStatus(alchemyStatus: string): OrderStatus {
  switch (alchemyStatus) {
    case "FINISHED":
      return "FINISHED";
    case "PAY_SUCCESS":
      return "PAY_SUCCESS";
    case "PAY_FAIL":
      return "PAY_FAIL";
    default:
      return "PENDING";
  }
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
    const payload = req.body as AlchemyWebhookPayload;
    const timestamp = req.headers["timestamp"] as string;

    console.log("Received webhook:", {
      merchantOrderNo: payload.merchantOrderNo,
      orderNo: payload.orderNo,
      status: payload.status,
      crypto: payload.crypto,
      cryptoQuantity: payload.cryptoQuantity,
      txHash: payload.txHash,
    });

    // Validate required fields
    if (!payload.merchantOrderNo || !payload.status) {
      console.error("Missing required fields in webhook payload");
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Verify signature if provided (optional for now, can be enforced later)
    if (payload.newSignature && timestamp) {
      const isValid = verifyWebhookSignature(
        timestamp,
        payload as unknown as Record<string, unknown>,
        payload.newSignature
      );
      if (!isValid) {
        console.warn("Webhook signature verification failed");
        // Don't reject for now, just log warning
      }
    }

    // Find the order in our store
    const order = getOrder(payload.merchantOrderNo);

    if (!order) {
      console.warn(`Order not found: ${payload.merchantOrderNo}`);
      // Still return success to prevent retries for unknown orders
      return res.status(200).json({ success: true, message: "Order not found" });
    }

    // Map and update status
    const newStatus = mapAlchemyStatus(payload.status);

    updateOrder(payload.merchantOrderNo, {
      status: newStatus,
      alchemyOrderNo: payload.orderNo,
      txHash: payload.txHash,
      cryptoAmount: payload.cryptoQuantity,
    });

    console.log(`Order ${payload.merchantOrderNo} updated:`, {
      previousStatus: order.status,
      newStatus,
      txHash: payload.txHash,
      cryptoAmount: payload.cryptoQuantity,
    });

    // Return success to Alchemy Pay
    return res.status(200).json({
      success: true,
      message: "Webhook processed successfully",
    });
  } catch (error) {
    console.error("Error processing webhook:", error);
    // Return 200 to prevent retries on our errors
    return res.status(200).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}
