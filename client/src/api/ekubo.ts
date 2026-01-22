/**
 * Ekubo API - Price Data Only
 * 
 * Swap execution has been migrated to AVNU SDK.
 * This file is kept for price chart and price quote data fetching only.
 */

export interface PriceChartData {
  data: Array<{
    timestamp: number;
    price: number;
  }>;
}

export interface SwapQuote {
  impact: number;
  total: number;
}

/**
 * Get historical price chart data from Ekubo
 * @param token - The base token address
 * @param otherToken - The quote token address
 */
export const getPriceChart = async (token: string, otherToken: string): Promise<PriceChartData> => {
  const response = await fetch(
    `https://prod-api.ekubo.org/price/23448594291968334/${token}/${otherToken}/history?interval=7000`
  );

  const data = await response.json();

  return {
    data: data?.data || []
  };
};

/**
 * Get swap quote from Ekubo for price display purposes
 * Note: For actual swap execution, use AVNU SDK instead
 * 
 * @param amount - The amount to swap (negative for exact output)
 * @param token - The token to buy
 * @param otherToken - The token to sell
 */
export const getSwapQuote = async (
  amount: number,
  token: string,
  otherToken: string
): Promise<SwapQuote> => {
  const response = await fetch(
    `https://prod-api-quoter.ekubo.org/23448594291968334/${amount}/${token}/${otherToken}`
  );

  const data = await response.json();

  return {
    impact: data?.price_impact || 0,
    total: data?.total_calculated || 0,
  };
};
