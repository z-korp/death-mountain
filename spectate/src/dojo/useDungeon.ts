import BeastModeRewards from "@/dungeons/BeastModeRewards";
import { ChainId } from "@/utils/networkConfig";
import { ComponentType } from "react";
import { useParams, useLocation } from "react-router-dom";

export interface Dungeon {
  id: string;
  name: string;
  network: ChainId;
  address: string;
  status: string;
  ticketAddress?: string;
  mainButtonText: string;
  externalLink?: string;
  includePractice?: boolean;
  rewards?: ComponentType;
  hideController?: boolean;
}

export const DUNGEONS: Record<string, Dungeon> = {
  survivor: {
    id: "survivor",
    name: "Beast Mode",
    network: ChainId.SN_MAIN,
    address:
      "0x00a67ef20b61a9846e1c82b411175e6ab167ea9f8632bd6c2091823c3629ec42",
    status: "online",
    ticketAddress:
      "0x0452810188C4Cb3AEbD63711a3b445755BC0D6C4f27B923fDd99B1A118858136",
    mainButtonText: "Enter the Dungeon",
    includePractice: true,
    rewards: BeastModeRewards,
  },
  budokan: {
    id: "budokan",
    name: "Tournaments",
    network: ChainId.SN_MAIN,
    address:
      "0x051f5fc1ddcffcb0bf548378e0166a5e5328fb4894efbab170e3fb1a4c0cdfdf",
    status: "online",
    mainButtonText: "Enter Tournament",
    externalLink: "https://budokan.gg/",
  },
  trials: {
    id: "trials",
    name: "Trials",
    network: ChainId.WP_PG_SLOT,
    address:
      "0x56a32ac6baa3d3e2634d55e6f2ca07bfee4ab09c6c6f0b93d456b0a6da4c84c",
    status: "online",
    mainButtonText: "Start Game",
    hideController: true,
  },
};

export const useDungeon = () => {
  const params = useParams();
  const location = useLocation();

  // Try to get dungeonId from route params first
  let dungeonId = params?.dungeonId;

  // If not available from params (e.g., when called outside Route context),
  // try to parse it from the location pathname
  if (!dungeonId && location.pathname) {
    // Match the first path segment (works for both "/budokan" and "/budokan/play")
    const pathMatch = location.pathname.match(/\/([^/]+)(?:\/|$)/);
    if (pathMatch && pathMatch[1] && pathMatch[1] !== "") {
      dungeonId = pathMatch[1];
    }
  }

  if (!dungeonId) {
    return DUNGEONS["survivor"];
  }

  const dungeon = DUNGEONS[dungeonId];

  if (!dungeon) {
    return DUNGEONS["survivor"];
  }

  return dungeon;
};
