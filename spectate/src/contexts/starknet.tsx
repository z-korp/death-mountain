import {
  getDefaultChainId,
  getNetworkConfig,
  NetworkConfig,
} from "@/utils/networkConfig";
import { mainnet, sepolia } from "@starknet-react/chains";
import { jsonRpcProvider, StarknetConfig, voyager } from "@starknet-react/core";
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useState,
} from "react";

interface DynamicConnectorContext {
  setCurrentNetworkConfig: (network: NetworkConfig) => void;
  currentNetworkConfig: NetworkConfig;
}

const DynamicConnectorContext = createContext<DynamicConnectorContext | null>(
  null
);

const defaultChainId = getDefaultChainId();
const defaultConfig = getNetworkConfig(defaultChainId);
const starknetChain = defaultChainId === "SN_SEPOLIA" ? sepolia : mainnet;

export function DynamicConnectorProvider({ children }: PropsWithChildren) {
  const [currentNetworkConfig, setCurrentNetworkConfig] =
    useState<NetworkConfig>(defaultConfig);

  const rpc = useCallback(() => {
    return { nodeUrl: defaultConfig.chains[0].rpcUrl };
  }, []);

  return (
    <DynamicConnectorContext.Provider
      value={{ setCurrentNetworkConfig, currentNetworkConfig }}
    >
      <StarknetConfig
        chains={[starknetChain]}
        provider={jsonRpcProvider({ rpc })}
        connectors={[]}
        explorer={voyager}
        autoConnect={false}
      >
        {children}
      </StarknetConfig>
    </DynamicConnectorContext.Provider>
  );
}

export function useDynamicConnector() {
  const context = useContext(DynamicConnectorContext);
  if (!context) {
    throw new Error(
      "useDynamicConnector must be used within a DynamicConnectorProvider"
    );
  }
  return context;
}
