import Box from "@mui/material/Box";
import { StyledEngineProvider, ThemeProvider } from "@mui/material/styles";
import { SnackbarProvider } from "notistack";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";

import { SoundProvider } from "@/desktop/contexts/Sound";
import { GameDirector } from "@/desktop/contexts/GameDirector";
import { desktopTheme } from "@/utils/themes";
import { StatisticsProvider } from "@/contexts/Statistics";

import WatchPage from "@/desktop/pages/WatchPage";

import { useDynamicConnector } from "@/contexts/starknet";
import { useDungeon } from "@/dojo/useDungeon";
import { getNetworkConfig, NetworkConfig } from "@/utils/networkConfig";
import { ReactNode, useEffect } from "react";

function DungeonRoute({ children }: { children: ReactNode }) {
  const dungeon = useDungeon();
  const { currentNetworkConfig, setCurrentNetworkConfig } =
    useDynamicConnector();

  useEffect(() => {
    if (dungeon && dungeon.network !== currentNetworkConfig.chainId) {
      setCurrentNetworkConfig(
        getNetworkConfig(dungeon.network) as NetworkConfig
      );
    }
  }, [dungeon]);

  if (!dungeon) {
    return null;
  }

  if (dungeon.network !== currentNetworkConfig.chainId) {
    return null;
  }

  return <>{children}</>;
}

function AppContent() {
  return (
    <ThemeProvider theme={desktopTheme}>
      <SoundProvider>
        <GameDirector>
          <Box className="main">
            <Routes>
              <Route
                path="/"
                element={<Navigate to="/survivor" replace />}
              />
              <Route
                path="/:dungeonId"
                element={
                  <DungeonRoute>
                    <WatchPage />
                  </DungeonRoute>
                }
              />
              <Route path="*" element={<Navigate to="/survivor" replace />} />
            </Routes>
          </Box>
        </GameDirector>
      </SoundProvider>
    </ThemeProvider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <StyledEngineProvider injectFirst>
        <SnackbarProvider
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
          preventDuplicate
          autoHideDuration={3000}
        >
          <StatisticsProvider>
            <AppContent />
          </StatisticsProvider>
        </SnackbarProvider>
      </StyledEngineProvider>
    </BrowserRouter>
  );
}

export default App;
