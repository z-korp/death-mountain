import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getOrder, alchemyRequest, type OrderStatus } from "../lib/alchemyPay.js";

interface AlchemyOrderQueryResponse {
  orderNo: string;
  status: string;
  crypto: string;
  cryptoQuantity: string;
  txHash: string;
  network: string;
  address: string;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow GET
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { merchantOrderNo } = req.query;

    if (!merchantOrderNo || typeof merchantOrderNo !== "string") {
      return res.status(400).json({ error: "merchantOrderNo is required" });
    }

    // First check our local store
    const storedOrder = getOrder(merchantOrderNo);

    if (!storedOrder) {
      return res.status(404).json({ error: "Order not found" });
    }

    // If order is already finished, return stored data
    if (storedOrder.status === "FINISHED") {
      return res.status(200).json({
        success: true,
        merchantOrderNo: storedOrder.merchantOrderNo,
        status: storedOrder.status,
        cryptoCurrency: storedOrder.cryptoCurrency,
        cryptoAmount: storedOrder.cryptoAmount,
        txHash: storedOrder.txHash,
        gameCount: storedOrder.gameCount,
        cryptoReceived: true,
      });
    }

    // If we have the Alchemy order number, query the current status
    if (storedOrder.alchemyOrderNo) {
      const queryResult = await alchemyRequest<AlchemyOrderQueryResponse>(
        "GET",
        `/open/api/v4/merchant/query/trade?orderNo=${storedOrder.alchemyOrderNo}&side=BUY`
      );

      if (queryResult.success && queryResult.data) {
        const alchemyStatus = queryResult.data.status;
        
        // Map Alchemy Pay status to our status
        let mappedStatus: OrderStatus = storedOrder.status;
        let cryptoReceived = false;

        if (alchemyStatus === "FINISHED") {
          mappedStatus = "FINISHED";
          cryptoReceived = true;
        } else if (alchemyStatus === "PAY_SUCCESS") {
          mappedStatus = "PAY_SUCCESS";
        } else if (alchemyStatus === "PAY_FAIL") {
          mappedStatus = "PAY_FAIL";
        }

        return res.status(200).json({
          success: true,
          merchantOrderNo: storedOrder.merchantOrderNo,
          status: mappedStatus,
          alchemyStatus: alchemyStatus,
          cryptoCurrency: storedOrder.cryptoCurrency,
          cryptoAmount: queryResult.data.cryptoQuantity || storedOrder.cryptoAmount,
          txHash: queryResult.data.txHash || storedOrder.txHash,
          gameCount: storedOrder.gameCount,
          cryptoReceived,
        });
      }
    }

    // Return stored order data if API query fails
    return res.status(200).json({
      success: true,
      merchantOrderNo: storedOrder.merchantOrderNo,
      status: storedOrder.status,
      cryptoCurrency: storedOrder.cryptoCurrency,
      cryptoAmount: storedOrder.cryptoAmount,
      txHash: storedOrder.txHash,
      gameCount: storedOrder.gameCount,
      cryptoReceived: (storedOrder.status as string) === "FINISHED",
    });
  } catch (error) {
    console.error("Error in order-status endpoint:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}
