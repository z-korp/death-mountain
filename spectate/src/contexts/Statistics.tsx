import { createContext, PropsWithChildren, useContext } from "react";

export interface TierData {
  tier: number;
  collected: number;
  total: number;
  remaining: number;
  tokensPerBeast: number;
  color: string;
}

export interface StatisticsContext {
  gamePrice: string | null;
  gamePriceHistory: any[];
  lordsPrice: string | null;
  strkPrice: string | null;
  survivorTokenPrice: string | null;
  fetchSurvivorTokensLeft: () => Promise<void>;
  fetchGamePrice: () => Promise<void>;
  remainingSurvivorTokens: number | null;
  collectedBeasts: number;
  beastTierData: TierData[];
}

export const OPENING_TIME = 1758043800;
export const totalSurvivorTokens = 2258100;
export const totalCollectableBeasts = 93225;
export const JACKPOT_AMOUNT = 33333;

export const BEASTS_PER_TIER: { [tier: number]: number } = {
  1: 18645, 2: 18645, 3: 18645, 4: 18645, 5: 18645,
};

export const TOKENS_PER_TIER: { [tier: number]: number } = {
  1: 14, 2: 12, 3: 10, 4: 8, 5: 6,
};

export const TIER_COLORS: { [tier: number]: string } = {
  1: "#FFD700", 2: "#9370DB", 3: "#4169E1", 4: "#32CD32", 5: "#A9A9A9",
};

const StatisticsContext = createContext<StatisticsContext>({
  gamePrice: null,
  gamePriceHistory: [],
  lordsPrice: null,
  strkPrice: null,
  survivorTokenPrice: null,
  fetchSurvivorTokensLeft: async () => {},
  fetchGamePrice: async () => {},
  remainingSurvivorTokens: null,
  collectedBeasts: 0,
  beastTierData: [],
});

export const StatisticsProvider = ({ children }: PropsWithChildren) => {
  return <>{children}</>;
};

export const useStatistics = () => {
  return useContext(StatisticsContext);
};
