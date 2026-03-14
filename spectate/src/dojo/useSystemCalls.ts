const noop = (..._args: any[]) => ({});
const asyncNoop = async (..._args: any[]): Promise<any> => [];

export const useSystemCalls = () => ({
  startGame: noop,
  explore: noop,
  attack: noop,
  flee: noop,
  equip: noop,
  drop: noop,
  buyItems: noop,
  selectStatUpgrades: noop,
  claimBeast: asyncNoop,
  claimJackpot: asyncNoop,
  createSettings: asyncNoop,
  buyGame: asyncNoop,
  mintGame: asyncNoop,
  requestRandom: noop,
  executeAction: asyncNoop,
  claimSurvivorTokens: asyncNoop,
  refreshDungeonStats: asyncNoop,
});
