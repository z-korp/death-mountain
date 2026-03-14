import { createContext, PropsWithChildren, useContext } from "react";

export interface ControllerContext {
  account: any;
  address: string | undefined;
  playerName: string;
  isPending: boolean;
  tokenBalances: Record<string, string>;
  goldenPassIds: number[];
  openProfile: () => void;
  login: () => void;
  logout: () => void;
  enterDungeon: (...args: any[]) => void;
  showTermsOfService: boolean;
  acceptTermsOfService: () => void;
  openBuyTicket: () => void;
  bulkMintGames: (...args: any[]) => void;
  purchaseGames: (...args: any[]) => void;
  refreshTokenBalances: () => Promise<Record<string, string>>;
}

const noop = (..._args: any[]) => {};

const ControllerContext = createContext<ControllerContext>({
  account: null,
  address: undefined,
  playerName: "Spectator",
  isPending: false,
  tokenBalances: {},
  goldenPassIds: [],
  openProfile: noop,
  login: noop,
  logout: noop,
  enterDungeon: noop,
  showTermsOfService: false,
  acceptTermsOfService: noop,
  openBuyTicket: noop,
  bulkMintGames: noop,
  purchaseGames: noop,
  refreshTokenBalances: async () => ({}),
});

export const ControllerProvider = ({ children }: PropsWithChildren) => {
  return <>{children}</>;
};

export const useController = () => {
  return useContext(ControllerContext);
};
