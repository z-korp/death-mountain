import ROUTER_ABI from "@/abi/router-abi.json";
import { generateSwapCalls, getSwapQuote } from "@/api/ekubo";
import { createAlchemyOrder, redirectToPayment } from "@/api/alchemyPay";
import { useController } from "@/contexts/controller";
import { useDungeon } from "@/dojo/useDungeon";
import { useUIStore } from "@/stores/uiStore";
import { NETWORKS } from "@/utils/networkConfig";
import { formatAmount } from "@/utils/utils";
import type { SupportedCrypto } from "@/types/alchemyPay";
import CloseIcon from "@mui/icons-material/Close";
import TokenIcon from "@mui/icons-material/Token";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import {
  Box,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Slider,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  CircularProgress,
} from "@mui/material";
import { useProvider } from "@starknet-react/core";
import { AnimatePresence, motion } from "framer-motion";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Contract } from "starknet";

interface PaymentOptionsModalProps {
  open: boolean;
  onClose: () => void;
}

interface TokenSelectionProps {
  userTokens: {
    symbol: string;
    balance: string | number;
    address: string;
    decimals: number;
    displayDecimals: number;
  }[];
  selectedToken: string;
  tokenQuote: { amount: string; loading: boolean; error?: string };
  onTokenChange: (tokenSymbol: string) => void;
  buyDungeonTicket: () => void;
}

// Memoized token selection component for Crypto tab
const CryptoTabContent = memo(
  ({
    userTokens,
    selectedToken,
    tokenQuote,
    onTokenChange,
    buyDungeonTicket,
  }: TokenSelectionProps) => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const selectedTokenData = userTokens.find(
      (t) => t.symbol === selectedToken
    );

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
      setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
      setAnchorEl(null);
    };

    const handleTokenSelect = (tokenSymbol: string) => {
      onTokenChange(tokenSymbol);
      handleClose();
    };

    const hasEnoughBalance = useMemo(() => {
      if (!selectedTokenData) return false;
      return Number(selectedTokenData.balance) >= Number(tokenQuote.amount);
    }, [selectedTokenData, tokenQuote]);

    if (userTokens.length === 0) {
      return (
        <Box sx={styles.tabContent}>
          <Box sx={styles.emptyState}>
            <TokenIcon sx={{ fontSize: 48, color: "#d0c98d", opacity: 0.5, mb: 2 }} />
            <Typography sx={{ fontSize: 14, color: "text.secondary", textAlign: "center" }}>
              No tokens with balance found in your wallet.
            </Typography>
            <Typography sx={{ fontSize: 12, color: "text.secondary", opacity: 0.7, mt: 1, textAlign: "center" }}>
              Use the Fiat tab to buy crypto with card.
            </Typography>
          </Box>
        </Box>
      );
    }

    return (
      <Box sx={styles.tabContent}>
        <Box sx={styles.cardHeader}>
          <Box sx={styles.iconContainer}>
            <TokenIcon sx={{ fontSize: 28, color: "#d0c98d" }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography sx={styles.paymentTitle}>Pay with Crypto</Typography>
            <Typography sx={styles.paymentSubtitle}>
              Select any token in your controller wallet
            </Typography>
          </Box>
        </Box>

        <Box sx={styles.sectionContainer} pb={2} mt={1}>
          <Button
            variant="outlined"
            onClick={handleClick}
            fullWidth
            sx={styles.mobileSelectButton}
          >
            <Box
              sx={{
                fontSize: "0.6rem",
                color: "text.primary",
                marginLeft: "-5px",
                display: "flex",
                alignItems: "center",
              }}
            >
              ▼
            </Box>
            <Box sx={styles.tokenRow}>
              <Box sx={styles.tokenLeft}>
                <Typography sx={styles.tokenName}>
                  {selectedTokenData
                    ? selectedTokenData.symbol
                    : "Select token"}
                </Typography>
              </Box>
              {selectedTokenData && (
                <Typography sx={styles.tokenBalance}>
                  {selectedTokenData.balance}
                </Typography>
              )}
            </Box>
          </Button>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleClose}
            slotProps={{
              paper: {
                sx: {
                  mt: 0.5,
                  width: "260px",
                  maxHeight: 300,
                  background: "rgba(24, 40, 24, 1)",
                  border: "1px solid rgba(208, 201, 141, 0.3)",
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
                  zIndex: 9999,
                },
              },
            }}
            sx={{
              zIndex: 9999,
            }}
          >
            {userTokens.map((token) => (
              <MenuItem
                key={token.symbol}
                onClick={() => handleTokenSelect(token.symbol)}
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 1,
                  backgroundColor:
                    token.symbol === selectedToken
                      ? "rgba(208, 201, 141, 0.2)"
                      : "transparent",
                  "&:hover": {
                    backgroundColor:
                      token.symbol === selectedToken
                        ? "rgba(208, 201, 141, 0.3)"
                        : "rgba(208, 201, 141, 0.1)",
                  },
                }}
              >
                <Box sx={styles.tokenRow}>
                  <Box sx={styles.tokenLeft}>
                    <Typography sx={styles.tokenName}>
                      {token.symbol}
                    </Typography>
                  </Box>
                  <Typography sx={styles.tokenBalance}>
                    {token.balance}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </Menu>
        </Box>

        <Box sx={styles.costDisplay}>
          <Typography sx={styles.costText}>
            {tokenQuote.loading
              ? "Loading quote..."
              : tokenQuote.error
                ? `Error: ${tokenQuote.error}`
                : tokenQuote.amount
                  ? `Cost: ${tokenQuote.amount} ${selectedToken}`
                  : "Loading..."}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", justifyContent: "center", px: 2, pb: 2 }}>
          <Button
            variant="contained"
            sx={styles.activateButton}
            onClick={buyDungeonTicket}
            fullWidth
            disabled={
              tokenQuote.loading || !!tokenQuote.error || !hasEnoughBalance
            }
          >
            <Typography sx={styles.buttonText}>
              {hasEnoughBalance ? "Enter Dungeon" : "Insufficient Balance"}
            </Typography>
          </Button>
        </Box>
      </Box>
    );
  }
);

CryptoTabContent.displayName = "CryptoTabContent";

// Fiat tab content component
const FiatTabContent = memo(() => {
  const { address } = useController();
  const [selectedCrypto, setSelectedCrypto] = useState<SupportedCrypto>("USDC");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pricing configuration
  const GAME_PRICE_USD = 0.6; // Price per game in USD
  const MIN_PAYMENT_USD = 1; // Minimum payment amount
  const MAX_GAMES = 20;
  const FEE_BUFFER = 1.1; // 10% buffer for fees

  // Calculate minimum games based on minimum payment
  const MIN_GAMES = Math.ceil(MIN_PAYMENT_USD / GAME_PRICE_USD);
  
  const [gameCount, setGameCount] = useState(MIN_GAMES);

  // Calculate estimated amount
  const estimatedAmount = (gameCount * GAME_PRICE_USD * FEE_BUFFER).toFixed(2);

  const handleSliderChange = useCallback((_: Event, value: number | number[]) => {
    setGameCount(value as number);
  }, []);

  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value, 10);
    if (!isNaN(value)) {
      setGameCount(Math.min(Math.max(value, MIN_GAMES), MAX_GAMES));
    }
  }, [MIN_GAMES]);

  const handleCryptoChange = useCallback(
    (_: React.MouseEvent<HTMLElement>, value: SupportedCrypto | null) => {
      if (value) {
        setSelectedCrypto(value);
      }
    },
    []
  );

  const handlePayment = useCallback(async () => {
    if (!address) {
      setError("Please connect your wallet first");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await createAlchemyOrder({
        walletAddress: address,
        fiatAmount: parseFloat(estimatedAmount),
        fiatCurrency: "USD",
        cryptoCurrency: selectedCrypto,
        gameCount,
      });

      if (!result.success) {
        setError(result.error || "Failed to create order");
        setIsLoading(false);
        return;
      }

      sessionStorage.setItem(
        "alchemyPayOrder",
        JSON.stringify({
          merchantOrderNo: result.merchantOrderNo,
          gameCount,
          cryptoCurrency: selectedCrypto,
          fiatAmount: estimatedAmount,
        })
      );

      redirectToPayment(result.payUrl);
    } catch (err) {
      console.error("Payment error:", err);
      setError(err instanceof Error ? err.message : "Payment failed");
      setIsLoading(false);
    }
  }, [address, estimatedAmount, selectedCrypto, gameCount]);

  return (
    <Box sx={styles.tabContent}>
      <Box sx={styles.cardHeader}>
        <Box sx={styles.iconContainer}>
          <CreditCardIcon sx={{ fontSize: 28, color: "#d0c98d" }} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography sx={styles.paymentTitle}>Pay with Card</Typography>
          <Typography sx={styles.paymentSubtitle}>
            Buy crypto with fiat via Alchemy Pay
          </Typography>
        </Box>
      </Box>

      {/* Game Count Selector with Slider */}
      <Box sx={{ px: 3, mb: 2 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <Typography sx={{ fontSize: 12, color: "#d0c98d", opacity: 0.9 }}>
            Number of Games
          </Typography>
          <TextField
            value={gameCount}
            onChange={handleInputChange}
            type="number"
            size="small"
            inputProps={{ 
              min: MIN_GAMES, 
              max: MAX_GAMES,
              style: { 
                textAlign: "center", 
                width: 50,
                padding: "4px 8px",
                color: "#d0c98d",
              }
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                background: "rgba(0, 0, 0, 0.3)",
                border: "1px solid rgba(208, 201, 141, 0.3)",
                borderRadius: 1,
                "& fieldset": { border: "none" },
              },
              "& input": { color: "#d0c98d" },
            }}
          />
        </Box>
        <Slider
          value={gameCount}
          onChange={handleSliderChange}
          min={MIN_GAMES}
          max={MAX_GAMES}
          step={1}
          marks={[
            { value: MIN_GAMES, label: `${MIN_GAMES}` },
            { value: 10, label: "10" },
            { value: MAX_GAMES, label: `${MAX_GAMES}` },
          ]}
          sx={{
            color: "#d0c98d",
            "& .MuiSlider-thumb": {
              backgroundColor: "#d0c98d",
              "&:hover, &.Mui-focusVisible": {
                boxShadow: "0 0 0 8px rgba(208, 201, 141, 0.16)",
              },
            },
            "& .MuiSlider-track": {
              backgroundColor: "#d0c98d",
            },
            "& .MuiSlider-rail": {
              backgroundColor: "rgba(208, 201, 141, 0.3)",
            },
            "& .MuiSlider-mark": {
              backgroundColor: "rgba(208, 201, 141, 0.5)",
            },
            "& .MuiSlider-markLabel": {
              color: "rgba(208, 201, 141, 0.7)",
              fontSize: 11,
            },
          }}
        />
        <Typography sx={{ fontSize: 11, color: "text.secondary", opacity: 0.6, mt: 0.5 }}>
          ${GAME_PRICE_USD.toFixed(2)} per game • Min {MIN_GAMES} games (${MIN_PAYMENT_USD} minimum)
        </Typography>
      </Box>

      {/* Crypto Selector */}
      <Box sx={{ px: 3, mb: 2 }}>
        <Typography sx={{ fontSize: 12, color: "#d0c98d", mb: 1, opacity: 0.9 }}>
          Receive as
        </Typography>
        <ToggleButtonGroup
          value={selectedCrypto}
          exclusive
          onChange={handleCryptoChange}
          fullWidth
          sx={{
            "& .MuiToggleButton-root": {
              color: "rgba(208, 201, 141, 0.5)",
              borderColor: "rgba(208, 201, 141, 0.3)",
              "&.Mui-selected": {
                background: "rgba(208, 201, 141, 0.2)",
                color: "#d0c98d",
                borderColor: "#d0c98d",
              },
              "&:hover": {
                background: "rgba(208, 201, 141, 0.1)",
              },
            },
          }}
        >
          <ToggleButton value="USDC">USDC</ToggleButton>
          <ToggleButton value="ETH">ETH</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Estimated Amount */}
      <Box sx={styles.costDisplay}>
        <Typography sx={styles.costText}>
          Total: ~${estimatedAmount} USD for {gameCount} game{gameCount > 1 ? "s" : ""}
        </Typography>
        <Typography
          sx={{ fontSize: 11, color: "text.secondary", opacity: 0.6, mt: 0.5 }}
        >
          Includes fees and price buffer
        </Typography>
      </Box>

      {/* Error Message */}
      {error && (
        <Typography
          sx={{
            color: "error.main",
            fontSize: 12,
            textAlign: "center",
            px: 2,
            mb: 1,
          }}
        >
          {error}
        </Typography>
      )}

      {/* Pay Button */}
      <Box sx={{ display: "flex", justifyContent: "center", px: 2, pb: 2 }}>
        <Button
          variant="contained"
          sx={styles.activateButton}
          onClick={handlePayment}
          fullWidth
          disabled={isLoading || !address}
        >
          {isLoading ? (
            <CircularProgress size={20} sx={{ color: "#1a2f1a" }} />
          ) : (
            <Typography sx={styles.buttonText}>
              {!address ? "Connect Wallet" : `Buy ${gameCount} Game${gameCount > 1 ? "s" : ""} for $${estimatedAmount}`}
            </Typography>
          )}
        </Button>
      </Box>
    </Box>
  );
});

FiatTabContent.displayName = "FiatTabContent";

export default function PaymentOptionsModal({
  open,
  onClose,
}: PaymentOptionsModalProps) {
  const { tokenBalances, goldenPassIds, enterDungeon, bulkMintGames } =
    useController();
  const { defaultPaymentToken } = useUIStore();

  const { provider } = useProvider();
  const dungeon = useDungeon();

  const routerContract = useMemo(
    () =>
      new Contract({
        abi: ROUTER_ABI,
        address: NETWORKS.SN_MAIN.ekuboRouter,
        providerOrAccount: provider,
      }),
    [provider]
  );

  const paymentTokens = useMemo(() => {
    return NETWORKS.SN_MAIN.paymentTokens || [];
  }, []);

  const userTokens = useMemo(() => {
    return paymentTokens
      .map((token: { name: string; address: string; decimals?: number; displayDecimals?: number }) => ({
        symbol: token.name,
        balance: tokenBalances[token.name] || 0,
        address: token.address,
        decimals: token.decimals || 18,
        displayDecimals: token.displayDecimals || 4,
      }))
      .filter(
        (token) =>
          Number(token.balance) > 0 &&
          token.address !== dungeon.ticketAddress &&
          token.symbol !== "USDC.e Bridged"
      );
  }, [paymentTokens, tokenBalances, dungeon.ticketAddress]);

  const dungeonTicketCount = useMemo(() => {
    const dungeonTicketToken = paymentTokens.find(
      (token: { address: string }) => token.address === dungeon.ticketAddress
    );
    return dungeonTicketToken
      ? Number(tokenBalances[(dungeonTicketToken as { name: string }).name])
      : 0;
  }, [paymentTokens, tokenBalances, dungeon.ticketAddress]);

  const [selectedToken, setSelectedToken] = useState("");
  const [activeTab, setActiveTab] = useState(0); // 0 = Crypto, 1 = Fiat
  const [tokenQuote, setTokenQuote] = useState<{
    amount: string;
    loading: boolean;
    error?: string;
  }>({
    amount: "",
    loading: false,
  });

  // Special views for Golden Token and Dungeon Ticket
  const [specialView, setSpecialView] = useState<"golden" | "dungeon" | null>(null);

  useEffect(() => {
    if (userTokens.length > 0 && !selectedToken) {
      const hasDefaultToken = userTokens.some((t) => t.symbol === defaultPaymentToken);
      if (hasDefaultToken) {
        setSelectedToken(defaultPaymentToken);
      } else {
        setSelectedToken(userTokens[0].symbol);
      }
    }
  }, [userTokens, defaultPaymentToken, selectedToken]);

  // Initialize special view based on user's assets
  useEffect(() => {
    if (open && specialView === null) {
      if (goldenPassIds.length > 0) {
        setSpecialView("golden");
      } else if (dungeonTicketCount >= 1) {
        setSpecialView("dungeon");
      }
    }
  }, [open, goldenPassIds.length, dungeonTicketCount, specialView]);

  // Reset special view when modal closes
  useEffect(() => {
    if (!open) {
      setSpecialView(null);
    }
  }, [open]);

  const fetchTokenQuote = useCallback(
    async (tokenSymbol: string) => {
      const selectedTokenData = userTokens.find(
        (t) => t.symbol === tokenSymbol
      );

      if (!selectedTokenData?.address || !dungeon.ticketAddress) {
        setTokenQuote({
          amount: "",
          loading: false,
          error: "Token not supported",
        });
        return;
      }

      setTokenQuote({ amount: "", loading: true });

      try {
        const quote = await getSwapQuote(
          -1e18,
          dungeon.ticketAddress,
          selectedTokenData.address
        );
        if (quote) {
          const rawAmount =
            (quote.total * -1) / Math.pow(10, selectedTokenData.decimals || 18);
          if (rawAmount === 0) {
            setTokenQuote({
              amount: "",
              loading: false,
              error: "No liquidity",
            });
          } else {
            const amount = formatAmount(rawAmount);
            setTokenQuote({ amount, loading: false });
          }
        } else {
          setTokenQuote({
            amount: "",
            loading: false,
            error: "No quote available",
          });
        }
      } catch (error) {
        console.error("Error fetching quote:", error);
        setTokenQuote({
          amount: "",
          loading: false,
          error: "Failed to get quote",
        });
      }
    },
    [userTokens, dungeon.ticketAddress]
  );

  const useGoldenToken = () => {
    enterDungeon(
      {
        paymentType: "Golden Pass",
        goldenPass: {
          address: NETWORKS.SN_MAIN.goldenToken,
          tokenId: goldenPassIds[0],
        },
      },
      []
    );
  };

  const useDungeonTicket = () => {
    enterDungeon({ paymentType: "Ticket" }, []);
  };

  const buyDungeonTicket = async () => {
    const selectedTokenData = userTokens.find(
      (t) => t.symbol === selectedToken
    );
    const quote = await getSwapQuote(
      -1e18,
      dungeon.ticketAddress!,
      selectedTokenData!.address
    );

    const tokenSwapData = {
      tokenAddress: dungeon.ticketAddress!,
      minimumAmount: 1,
      quote: quote,
    };
    const calls = generateSwapCalls(
      routerContract,
      selectedTokenData!.address,
      tokenSwapData
    );

    enterDungeon({ paymentType: "Ticket" }, calls);
  };

  const handleTokenChange = useCallback(
    (tokenSymbol: string) => {
      setSelectedToken(tokenSymbol);
      fetchTokenQuote(tokenSymbol);
    },
    [fetchTokenQuote]
  );

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Fetch initial quote when component loads or selected token changes
  useEffect(() => {
    if (selectedToken && activeTab === 0 && specialView === null) {
      fetchTokenQuote(selectedToken);
    }
  }, [selectedToken, activeTab, specialView, fetchTokenQuote]);

  // Action button component
  const ActionButton = ({
    onClick,
    children,
    disabled,
  }: {
    onClick: () => void;
    children: React.ReactNode;
    disabled?: boolean;
  }) => (
    <Box sx={{ display: "flex", justifyContent: "center", px: 2, pb: 2 }}>
      <Button
        variant="contained"
        sx={styles.activateButton}
        onClick={onClick}
        fullWidth
        disabled={disabled}
      >
        <Typography sx={styles.buttonText}>{children}</Typography>
      </Button>
    </Box>
  );

  return (
    <AnimatePresence>
      {open && (
        <Box sx={styles.overlay}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Box sx={styles.modal}>
              <Box sx={styles.modalGlow} />
              <IconButton onClick={onClose} sx={styles.closeBtn} size="small">
                <CloseIcon sx={{ fontSize: 20 }} />
              </IconButton>

              <Box sx={styles.header}>
                <Box sx={styles.titleContainer}>
                  <Typography sx={styles.title}>DUNGEON ACCESS</Typography>
                  <Box sx={styles.titleUnderline} />
                </Box>
                <Typography sx={styles.subtitle}>
                  Select payment method
                </Typography>
              </Box>

              <Box sx={styles.contentContainer}>
                <AnimatePresence mode="wait">
                  {/* Golden Token Special View */}
                  {specialView === "golden" && (
                    <motion.div
                      key="golden"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      style={{ width: "100%" }}
                    >
                      <Box sx={styles.specialCard}>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "center",
                            mb: 0,
                            mt: 2,
                          }}
                        >
                          <Typography sx={styles.paymentTitle}>
                            Use Golden Token
                          </Typography>
                        </Box>

                        <Box sx={styles.goldenTokenContainer}>
                          <img
                            src={"/images/golden_token.svg"}
                            alt="Golden Token"
                            style={{
                              width: "150px",
                              height: "150px",
                            }}
                          />
                        </Box>

                        <ActionButton onClick={useGoldenToken}>
                          Enter Dungeon
                        </ActionButton>

                        <Box sx={{ textAlign: "center", pb: 2 }}>
                          <Typography
                            component="button"
                            onClick={() => setSpecialView(null)}
                            sx={styles.skipLink}
                          >
                            Pay with crypto or card instead
                          </Typography>
                        </Box>
                      </Box>
                    </motion.div>
                  )}

                  {/* Dungeon Ticket Special View */}
                  {specialView === "dungeon" && (
                    <motion.div
                      key="dungeon"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      style={{ width: "100%" }}
                    >
                      <Box sx={styles.specialCard}>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "center",
                            mb: 0,
                            mt: 2,
                          }}
                        >
                          <Typography sx={styles.paymentTitle}>
                            Use Dungeon Ticket
                          </Typography>
                        </Box>

                        <Box sx={styles.goldenTokenContainer}>
                          <img
                            src="/images/dungeon_ticket.png"
                            alt="Dungeon Ticket"
                            style={{
                              width: "120px",
                              height: "120px",
                              objectFit: "contain",
                              display: "block",
                            }}
                            onError={(e) => {
                              console.error("Failed to load dungeon ticket image");
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        </Box>

                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            gap: 0.5,
                            mb: 0.5,
                          }}
                        >
                          <Typography sx={styles.ticketCount}>
                            You have {dungeonTicketCount} ticket
                            {dungeonTicketCount > 1 ? "s" : ""}
                          </Typography>
                        </Box>

                        <ActionButton onClick={useDungeonTicket}>
                          Enter Dungeon
                        </ActionButton>

                        {dungeonTicketCount > 1 && (
                          <Box
                            onClick={() => bulkMintGames(dungeonTicketCount, onClose)}
                            textAlign="center"
                            mt={"-10px"}
                            mb={1}
                          >
                            <Typography sx={styles.mintAll}>
                              Bulk Mint {dungeonTicketCount > 50 ? "50" : "All"} Games
                            </Typography>
                          </Box>
                        )}

                        <Box sx={{ textAlign: "center", pb: 2 }}>
                          <Typography
                            component="button"
                            onClick={() => setSpecialView(null)}
                            sx={styles.skipLink}
                          >
                            Pay with crypto or card instead
                          </Typography>
                        </Box>
                      </Box>
                    </motion.div>
                  )}

                  {/* Tabbed Payment View */}
                  {specialView === null && (
                    <motion.div
                      key="tabs"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      style={{ width: "100%" }}
                    >
                      <Box sx={styles.tabsContainer}>
                        <Tabs
                          value={activeTab}
                          onChange={handleTabChange}
                          variant="fullWidth"
                          sx={styles.tabs}
                        >
                          <Tab
                            icon={<TokenIcon sx={{ fontSize: 20 }} />}
                            iconPosition="start"
                            label="Crypto"
                            sx={styles.tab}
                          />
                          <Tab
                            icon={<CreditCardIcon sx={{ fontSize: 20 }} />}
                            iconPosition="start"
                            label="Fiat"
                            sx={styles.tab}
                          />
                        </Tabs>
                      </Box>

                      <Box sx={styles.tabPanel}>
                        {activeTab === 0 && (
                          <CryptoTabContent
                            userTokens={userTokens}
                            selectedToken={selectedToken}
                            tokenQuote={tokenQuote}
                            onTokenChange={handleTokenChange}
                            buyDungeonTicket={buyDungeonTicket}
                          />
                        )}
                        {activeTab === 1 && <FiatTabContent />}
                      </Box>

                      {/* Show link to special views if available */}
                      {(goldenPassIds.length > 0 || dungeonTicketCount >= 1) && (
                        <Box sx={styles.footer}>
                          {goldenPassIds.length > 0 && (
                            <Typography
                              component="button"
                              onClick={() => setSpecialView("golden")}
                              sx={styles.skipLink}
                            >
                              Use Golden Token
                            </Typography>
                          )}
                          {dungeonTicketCount >= 1 && (
                            <Typography
                              component="button"
                              onClick={() => setSpecialView("dungeon")}
                              sx={styles.skipLink}
                            >
                              Use Dungeon Ticket ({dungeonTicketCount})
                            </Typography>
                          )}
                        </Box>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </Box>
            </Box>
          </motion.div>
        </Box>
      )}
    </AnimatePresence>
  );
}

const styles = {
  overlay: {
    position: "fixed" as const,
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    bgcolor: "rgba(0, 0, 0, 0.5)",
    zIndex: 2000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backdropFilter: "blur(8px)",
  },
  modal: {
    width: "420px",
    maxWidth: "90dvw",
    p: 0,
    borderRadius: 3,
    background: "linear-gradient(145deg, #1a2f1a 0%, #0f1f0f 100%)",
    border: "2px solid rgba(208, 201, 141, 0.4)",
    boxShadow:
      "0 24px 64px rgba(0, 0, 0, 0.8), 0 0 40px rgba(208, 201, 141, 0.1)",
    position: "relative" as const,
    overflow: "hidden",
  },
  modalGlow: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background:
      "linear-gradient(45deg, transparent 30%, rgba(208, 201, 141, 0.02) 50%, transparent 70%)",
    pointerEvents: "none" as const,
  },
  closeBtn: {
    position: "absolute" as const,
    top: 16,
    right: 16,
    color: "#d0c98d",
    background: "rgba(208, 201, 141, 0.1)",
    border: "1px solid rgba(208, 201, 141, 0.2)",
    "&:hover": {
      background: "rgba(208, 201, 141, 0.2)",
      transform: "scale(1.1)",
    },
    transition: "all 0.2s ease",
    zIndex: 10,
  },
  header: {
    textAlign: "center" as const,
    p: 3,
    pb: 2,
    borderBottom: "1px solid rgba(208, 201, 141, 0.2)",
  },
  titleContainer: {
    position: "relative" as const,
    mb: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: 1.5,
    textShadow: "0 2px 8px rgba(208, 201, 141, 0.3)",
  },
  titleUnderline: {
    width: 80,
    height: 2,
    background: "linear-gradient(90deg, transparent, #d0c98d, transparent)",
    mx: "auto",
    borderRadius: 1,
    mt: 1,
  },
  subtitle: {
    fontSize: 14,
    color: "#FFD700",
    opacity: 0.8,
    letterSpacing: 0.5,
  },
  contentContainer: {
    display: "flex",
    flexDirection: "column" as const,
    width: "100%",
  },
  tabsContainer: {
    borderBottom: "1px solid rgba(208, 201, 141, 0.2)",
  },
  tabs: {
    minHeight: 48,
    "& .MuiTabs-indicator": {
      backgroundColor: "#d0c98d",
      height: 2,
    },
  },
  tab: {
    minHeight: 48,
    color: "rgba(208, 201, 141, 0.6)",
    fontSize: 14,
    fontWeight: 500,
    textTransform: "none" as const,
    gap: 1,
    "&.Mui-selected": {
      color: "#d0c98d",
    },
    "&:hover": {
      color: "#d0c98d",
      opacity: 1,
    },
  },
  tabPanel: {
    minHeight: 280,
  },
  tabContent: {
    display: "flex",
    flexDirection: "column" as const,
    height: "100%",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    minHeight: 200,
    p: 3,
  },
  specialCard: {
    m: 2,
    background: "rgba(24, 40, 24, 0.6)",
    border: "2px solid rgba(208, 201, 141, 0.3)",
    borderRadius: 2,
    overflow: "visible",
    position: "relative" as const,
    backdropFilter: "blur(4px)",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: 2,
    p: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: "8px",
    background: "rgba(0, 0, 0, 0.3)",
    border: "1px solid rgba(208, 201, 141, 0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: 600,
    letterSpacing: 0.5,
    mb: 0.5,
  },
  paymentSubtitle: {
    fontSize: 12,
    color: "#FFD700",
    opacity: 0.7,
    letterSpacing: 0.5,
    lineHeight: 1.2,
  },
  sectionContainer: {
    px: 2,
  },
  mobileSelectButton: {
    height: "48px",
    textTransform: "none" as const,
    fontWeight: 500,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 16px",
    background: "rgba(0, 0, 0, 0.4)",
    border: "1px solid rgba(208, 201, 141, 0.3)",
    borderRadius: 1,
    color: "inherit",
    "&:hover": {
      borderColor: "rgba(208, 201, 141, 0.5)",
      background: "rgba(0, 0, 0, 0.5)",
    },
  },
  tokenRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginLeft: "10px",
  },
  tokenLeft: {
    display: "flex",
    alignItems: "center",
    gap: 1.5,
  },
  tokenName: {
    fontSize: 14,
    fontWeight: 600,
  },
  tokenBalance: {
    fontSize: 11,
    color: "#FFD700",
    opacity: 0.7,
  },
  costDisplay: {
    px: 3,
    mb: 1,
    mt: 1,
    textAlign: "center" as const,
  },
  costText: {
    fontSize: 14,
    fontWeight: 600,
    letterSpacing: 0.5,
  },
  goldenTokenContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  ticketCount: {
    fontSize: 14,
    color: "#FFD700",
    opacity: 0.9,
    letterSpacing: 0.5,
  },
  mintAll: {
    fontFamily: "Tiems",
    fontSize: 13,
    color: "#FFD700",
    opacity: 0.9,
    textDecoration: "underline",
    cursor: "pointer",
    "&:hover": {
      color: "text.primary",
      textDecoration: "underline",
    },
  },
  activateButton: {
    background: "#d0c98d",
    color: "#1a2f1a",
    py: 1.2,
    borderRadius: 1,
    fontWeight: 700,
    letterSpacing: 0.5,
    textAlign: "center" as const,
    justifyContent: "center",
    alignItems: "center",
    "&:hover": {
      background: "#e6df9a",
      boxShadow: "0 4px 12px rgba(208, 201, 141, 0.3)",
    },
    "&:active": {
      transform: "translateY(1px)",
    },
    transition: "all 0.2s ease",
  },
  buttonText: {
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: 0.5,
    color: "#1a2f1a",
    textAlign: "center" as const,
  },
  footer: {
    p: 2,
    textAlign: "center" as const,
    borderTop: "1px solid rgba(208, 201, 141, 0.2)",
    display: "flex",
    gap: 2,
    justifyContent: "center",
    flexWrap: "wrap" as const,
  },
  skipLink: {
    fontSize: 13,
    color: "#FFD700",
    textDecoration: "underline",
    letterSpacing: 0.5,
    background: "none",
    border: "none",
    cursor: "pointer",
    transition: "color 0.2s",
    "&:hover": {
      color: "text.primary",
    },
  },
};
