import { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import { StyledEngineProvider, ThemeProvider } from "@mui/material/styles";
import { SnackbarProvider } from "notistack";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";

import { SoundProvider } from "@/desktop/contexts/Sound";
import { SoundProvider as MobileSoundProvider } from "@/mobile/contexts/Sound";
import { GameDirector } from "@/desktop/contexts/GameDirector";
import { GameDirector as MobileGameDirector } from "@/mobile/contexts/GameDirector";
import { desktopTheme, mobileTheme } from "@/utils/themes";
import { StatisticsProvider } from "@/contexts/Statistics";

import WatchPage from "@/desktop/pages/WatchPage";
import { default as MobileWatchPage } from "@/mobile/pages/WatchPage";
import Header from "@/mobile/components/Header";

import { isBrowser, isMobile } from "react-device-detect";
import { useDynamicConnector } from "@/contexts/starknet";
import { useDungeon } from "@/dojo/useDungeon";
import { getNetworkConfig, NetworkConfig } from "@/utils/networkConfig";
import { ReactNode, useEffect as useEffectAlias } from "react";

const MOBILE_BREAKPOINT = 1215;

function useIsSmallViewport() {
  const [isSmall, setIsSmall] = useState(
    () => window.innerWidth < MOBILE_BREAKPOINT
  );

  useEffect(() => {
    const handleResize = () => {
      setIsSmall(window.innerWidth < MOBILE_BREAKPOINT);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return isSmall;
}

function DungeonRoute({ children }: { children: ReactNode }) {
  const dungeon = useDungeon();
  const { currentNetworkConfig, setCurrentNetworkConfig } =
    useDynamicConnector();

  useEffectAlias(() => {
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
  const isSmallViewport = useIsSmallViewport();
  const shouldShowMobile = isMobile || isSmallViewport;

  return (
    <>
      {!shouldShowMobile && (
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
      )}

      {shouldShowMobile && (
        <ThemeProvider theme={mobileTheme}>
          <MobileSoundProvider>
            <Box className="bgImage">
              <MobileGameDirector>
                <Box className="main">
                  <Header />
                  <Routes>
                    <Route
                      path="/"
                      element={<Navigate to="/survivor" replace />}
                    />
                    <Route
                      path="/:dungeonId"
                      element={
                        <DungeonRoute>
                          <MobileWatchPage />
                        </DungeonRoute>
                      }
                    />
                    <Route
                      path="*"
                      element={<Navigate to="/survivor" replace />}
                    />
                  </Routes>
                </Box>
              </MobileGameDirector>
            </Box>
          </MobileSoundProvider>
        </ThemeProvider>
      )}
    </>
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
