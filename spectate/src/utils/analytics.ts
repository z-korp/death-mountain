const noop = (..._args: any[]) => {};

export const useAnalytics = () => ({
  identifyAddress: noop,
  gameStartedEvent: noop,
  playerDiedEvent: noop,
  txRevertedEvent: noop,
});
