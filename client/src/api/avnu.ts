import { getQuotes, quoteToCalls, executeSwap, type Quote, type AvnuCalls } from '@avnu/avnu-sdk';
import { formatUnits } from 'ethers';
import { PaymasterRpc, type Account } from 'starknet';

// AVNU Paymaster Configuration for gasless swaps
const AVNU_PAYMASTER_URL = 'https://starknet.paymaster.avnu.fi';
const AVNU_PAYMASTER_API_KEY = import.meta.env.VITE_AVNU_PAYMASTER_API_KEY || '';

// USDC token address on mainnet for gas payment
const USDC_ADDRESS = '0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8';

// AVNU Integrator Configuration for zkorp
export const AVNU_INTEGRATOR_CONFIG = {
  integratorName: 'zkorp',
  integratorFees: 300n, // 3% = 300 basis points
  integratorFeeRecipient: '0x066bE88C48b0D71d1Bded275e211C2dDe1EF1c078Fd57ece1313f130Bbc5b859',
};

// Default slippage for swaps (1%)
export const DEFAULT_SLIPPAGE = 0.01;

// Dungeon ticket amount (1 ticket = 1e18)
export const ONE_TICKET = BigInt(1e18);

export interface AvnuQuoteResult {
  quote: Quote;
  sellAmount: bigint;
  sellAmountFormatted: string;
  buyAmount: bigint;
  priceImpact: number;
  gasFeesInUsd?: number;
}

export interface AvnuSwapError {
  type: 'NO_LIQUIDITY' | 'NO_QUOTES' | 'BUILD_FAILED' | 'UNKNOWN';
  message: string;
}

/**
 * Get a quote to buy exactly 1 dungeon ticket
 * @param sellTokenAddress - The token to sell (e.g., ETH, STRK, USDC)
 * @param buyTokenAddress - The dungeon ticket token address
 * @param takerAddress - The user's wallet address
 * @param buyAmount - Amount of tickets to buy (default: 1 ticket = 1e18)
 */
export async function getAvnuQuote(
  sellTokenAddress: string,
  buyTokenAddress: string,
  takerAddress: string,
  buyAmount: bigint = ONE_TICKET
): Promise<AvnuQuoteResult> {
  try {
    const quotes = await getQuotes({
      sellTokenAddress,
      buyTokenAddress,
      buyAmount,
      takerAddress,
      integratorFees: AVNU_INTEGRATOR_CONFIG.integratorFees,
      integratorFeeRecipient: AVNU_INTEGRATOR_CONFIG.integratorFeeRecipient,
      integratorName: AVNU_INTEGRATOR_CONFIG.integratorName,
    });

    if (!quotes || quotes.length === 0) {
      throw createAvnuError('NO_QUOTES', 'No quotes available for this swap');
    }

    const bestQuote = quotes[0];

    // Check for zero sell amount (no liquidity)
    if (bestQuote.sellAmount === 0n) {
      throw createAvnuError('NO_LIQUIDITY', 'No liquidity available for this trading pair');
    }

    return {
      quote: bestQuote,
      sellAmount: bestQuote.sellAmount,
      sellAmountFormatted: formatUnits(bestQuote.sellAmount, 18), // Will be adjusted by caller based on token decimals
      buyAmount: bestQuote.buyAmount,
      priceImpact: bestQuote.priceImpact,
      gasFeesInUsd: bestQuote.gasFeesInUsd,
    };
  } catch (error) {
    if (isAvnuError(error)) {
      throw error;
    }
    throw createAvnuError('UNKNOWN', error instanceof Error ? error.message : 'Failed to get quote');
  }
}

/**
 * Build swap calls from a quote
 * @param quote - The quote from getAvnuQuote
 * @param takerAddress - The user's wallet address
 * @param slippage - Slippage tolerance (default: 1%)
 */
export async function buildAvnuSwapCalls(
  quote: Quote,
  takerAddress: string,
  slippage: number = DEFAULT_SLIPPAGE
): Promise<AvnuCalls> {
  try {
    const swapCalls = await quoteToCalls({
      quoteId: quote.quoteId,
      takerAddress,
      slippage,
      executeApprove: true, // Include approval in the calls
    });

    return swapCalls;
  } catch (error) {
    throw createAvnuError(
      'BUILD_FAILED',
      error instanceof Error ? error.message : 'Failed to build swap calls'
    );
  }
}

export interface GaslessSwapResult {
  transactionHash: string;
}

/**
 * Execute a gasless swap using AVNU paymaster
 * User pays gas fees in USDC instead of ETH
 * @param account - The user's account (must be a starknet Account object)
 * @param quote - The quote from getAvnuQuote
 * @param slippage - Slippage tolerance (default: 0.5%)
 */
export async function executeGaslessSwap(
  account: Account,
  quote: Quote,
  slippage: number = 0.005
): Promise<GaslessSwapResult> {
  try {
    // Create paymaster provider for gasless transactions
    const paymasterProvider = new PaymasterRpc({
      nodeUrl: AVNU_PAYMASTER_URL,
      headers: AVNU_PAYMASTER_API_KEY 
        ? { 'x-paymaster-api-key': AVNU_PAYMASTER_API_KEY }
        : undefined,
    });

    // Execute swap with gasless mode - user pays in USDC
    const result = await executeSwap({
      provider: account,
      quote,
      slippage,
      paymaster: {
        active: true,
        provider: paymasterProvider,
        params: {
          version: '0x1',
          feeMode: {
            mode: 'default',
            gasToken: USDC_ADDRESS,
          },
        },
      },
    });

    return {
      transactionHash: result.transactionHash,
    };
  } catch (error) {
    throw createAvnuError(
      'BUILD_FAILED',
      error instanceof Error ? error.message : 'Failed to execute gasless swap'
    );
  }
}

/**
 * Format the sell amount based on token decimals
 */
export function formatSellAmount(
  sellAmount: bigint,
  decimals: number,
  displayDecimals: number = 4
): string {
  const formatted = formatUnits(sellAmount, decimals);
  const num = parseFloat(formatted);
  
  if (num === 0) return '0';
  if (num < 0.0001) return '<0.0001';
  
  return num.toFixed(displayDecimals);
}

// Error handling utilities
function createAvnuError(type: AvnuSwapError['type'], message: string): AvnuSwapError {
  return { type, message };
}

function isAvnuError(error: unknown): error is AvnuSwapError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    'message' in error
  );
}

export function getErrorMessage(error: unknown): string {
  if (isAvnuError(error)) {
    switch (error.type) {
      case 'NO_LIQUIDITY':
        return 'No liquidity available';
      case 'NO_QUOTES':
        return 'No quotes available';
      case 'BUILD_FAILED':
        return 'Failed to build transaction';
      default:
        return error.message;
    }
  }
  return error instanceof Error ? error.message : 'Unknown error';
}
