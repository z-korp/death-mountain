import ROUTER_ABI from "@/abi/router-abi.json";
import { generateSwapCalls, getSwapQuote } from "@/api/ekubo";
import { getOrderStatus } from "@/api/alchemyPay";
import { useController } from "@/contexts/controller";
import { useDungeon } from "@/dojo/useDungeon";
import type { OrderStatus, SupportedCrypto } from "@/types/alchemyPay";
import { NETWORKS } from "@/utils/networkConfig";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import HourglassTopIcon from "@mui/icons-material/HourglassTop";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import { useProvider } from "@starknet-react/core";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Contract } from "starknet";

type CallbackPhase =
  | "loading"
  | "waiting_crypto"
  | "crypto_received"
  | "purchasing"
  | "success"
  | "error";

const POLL_INTERVAL = 5000; // 5 seconds
const MAX_POLL_TIME = 30 * 60 * 1000; // 30 minutes

export default function PaymentCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId");

  const { account, address, enterDungeon, tokenBalances } = useController();
  const { provider } = useProvider();
  const dungeon = useDungeon();

  const [phase, setPhase] = useState<CallbackPhase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<{
    gameCount: number;
    cryptoCurrency: SupportedCrypto;
    cryptoAmount?: string;
  } | null>(null);

  const startTime = useMemo(() => Date.now(), []);

  const routerContract = useMemo(
    () =>
      new Contract({
        abi: ROUTER_ABI,
        address: NETWORKS.SN_MAIN.ekuboRouter,
        providerOrAccount: provider,
      }),
    [provider]
  );

  // Load order data from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem("alchemyPayOrder");
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setOrderData({
          gameCount: data.gameCount || 1,
          cryptoCurrency: data.cryptoCurrency || "USDC",
        });
      } catch (e) {
        console.error("Failed to parse stored order:", e);
      }
    }
  }, []);

  // Poll for order status
  const pollStatus = useCallback(async () => {
    if (!orderId) return;

    try {
      const result = await getOrderStatus(orderId);

      if (!result.success) {
        console.error("Failed to get order status:", result.error);
        return;
      }

      const status = result.status as OrderStatus;

      if (status === "FINISHED" && result.cryptoReceived) {
        setOrderData((prev) => ({
          ...prev!,
          cryptoAmount: result.cryptoAmount,
        }));
        setPhase("crypto_received");
      } else if (status === "PAY_SUCCESS") {
        setPhase("waiting_crypto");
      } else if (status === "PAY_FAIL") {
        setPhase("error");
        setError("Payment failed. Please try again.");
      }
    } catch (err) {
      console.error("Error polling status:", err);
    }
  }, [orderId]);

  // Start polling
  useEffect(() => {
    if (!orderId) {
      setPhase("error");
      setError("No order ID found");
      return;
    }

    // Initial check
    pollStatus();
    setPhase("waiting_crypto");

    const interval = setInterval(() => {
      // Check timeout
      if (Date.now() - startTime > MAX_POLL_TIME) {
        clearInterval(interval);
        setPhase("error");
        setError("Payment timeout. Please check your order status.");
        return;
      }

      // Stop polling if done
      if (
        phase === "crypto_received" ||
        phase === "purchasing" ||
        phase === "success" ||
        phase === "error"
      ) {
        clearInterval(interval);
        return;
      }

      pollStatus();
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [orderId, phase, pollStatus, startTime]);

  // Execute auto-purchase when crypto is received
  const executePurchase = useCallback(async () => {
    if (!account || !orderData || phase !== "crypto_received") return;

    setPhase("purchasing");

    try {
      // Get the received crypto token
      const cryptoToken = NETWORKS.SN_MAIN.paymentTokens.find(
        (t) =>
          t.name === orderData.cryptoCurrency ||
          t.name === `${orderData.cryptoCurrency}.e Bridged`
      );

      if (!cryptoToken) {
        throw new Error("Crypto token not found");
      }

      // Get swap quote for ticket
      const quote = await getSwapQuote(
        -1e18 * orderData.gameCount,
        dungeon.ticketAddress!,
        cryptoToken.address
      );

      if (!quote || quote.total === 0) {
        throw new Error("Failed to get swap quote");
      }

      // Generate swap calls
      const tokenSwapData = {
        tokenAddress: dungeon.ticketAddress!,
        minimumAmount: orderData.gameCount,
        quote,
      };
      const calls = generateSwapCalls(
        routerContract,
        cryptoToken.address,
        tokenSwapData
      );

      // Execute dungeon entry with swap
      await enterDungeon({ paymentType: "Ticket" }, calls);

      setPhase("success");

      // Clean up
      sessionStorage.removeItem("alchemyPayOrder");
    } catch (err) {
      console.error("Purchase failed:", err);
      setPhase("error");
      setError(err instanceof Error ? err.message : "Purchase failed");
    }
  }, [account, orderData, phase, dungeon, routerContract, enterDungeon]);

  // Auto-execute when crypto received
  useEffect(() => {
    if (phase === "crypto_received" && account) {
      executePurchase();
    }
  }, [phase, account, executePurchase]);

  const handleRetry = () => {
    navigate("/survivor");
  };

  const handleEnterDungeon = () => {
    navigate("/survivor/play");
  };

  const getContent = () => {
    switch (phase) {
      case "loading":
        return {
          icon: <CircularProgress size={60} sx={{ color: "#d0c98d" }} />,
          title: "Loading...",
          subtitle: "Checking payment status",
        };
      case "waiting_crypto":
        return {
          icon: <HourglassTopIcon sx={{ fontSize: 60, color: "#FFD700" }} />,
          title: "Waiting for Crypto",
          subtitle: `Your ${orderData?.cryptoCurrency || "crypto"} is on its way`,
        };
      case "crypto_received":
        return {
          icon: <CheckCircleIcon sx={{ fontSize: 60, color: "#4caf50" }} />,
          title: "Crypto Received!",
          subtitle: `${orderData?.cryptoAmount || ""} ${orderData?.cryptoCurrency || ""} received`,
        };
      case "purchasing":
        return {
          icon: <CircularProgress size={60} sx={{ color: "#d0c98d" }} />,
          title: "Purchasing Tickets",
          subtitle: `Buying ${orderData?.gameCount || 1} game ticket${(orderData?.gameCount || 1) > 1 ? "s" : ""}...`,
        };
      case "success":
        return {
          icon: <CheckCircleIcon sx={{ fontSize: 60, color: "#4caf50" }} />,
          title: "Success!",
          subtitle: `${orderData?.gameCount || 1} game${(orderData?.gameCount || 1) > 1 ? "s" : ""} ready to play`,
        };
      case "error":
        return {
          icon: <ErrorIcon sx={{ fontSize: 60, color: "#f44336" }} />,
          title: "Something went wrong",
          subtitle: error || "Please try again",
        };
    }
  };

  const content = getContent();

  return (
    <Box sx={styles.container}>
      <Box sx={styles.card}>
        <Box sx={styles.iconContainer}>{content.icon}</Box>

        <Typography sx={styles.title}>{content.title}</Typography>
        <Typography sx={styles.subtitle}>{content.subtitle}</Typography>

        {(phase === "loading" || phase === "waiting_crypto") && (
          <CircularProgress size={24} sx={{ color: "#d0c98d", mt: 3 }} />
        )}

        {phase === "error" && (
          <Button variant="contained" onClick={handleRetry} sx={styles.button}>
            Back to Game
          </Button>
        )}

        {phase === "success" && (
          <Button
            variant="contained"
            onClick={handleEnterDungeon}
            sx={styles.button}
          >
            Enter Dungeon
          </Button>
        )}
      </Box>
    </Box>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(180deg, #0a1a0a 0%, #1a2f1a 100%)",
    p: 2,
  },
  card: {
    width: "400px",
    maxWidth: "90vw",
    p: 4,
    borderRadius: 3,
    background: "linear-gradient(145deg, #1a2f1a 0%, #0f1f0f 100%)",
    border: "2px solid rgba(208, 201, 141, 0.4)",
    boxShadow:
      "0 24px 64px rgba(0, 0, 0, 0.8), 0 0 40px rgba(208, 201, 141, 0.1)",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    textAlign: "center" as const,
  },
  iconContainer: {
    mb: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    letterSpacing: 0.5,
    mb: 1,
    color: "#fff",
  },
  subtitle: {
    fontSize: 14,
    color: "#FFD700",
    opacity: 0.8,
    letterSpacing: 0.5,
  },
  button: {
    mt: 3,
    background: "#d0c98d",
    color: "#1a2f1a",
    px: 4,
    py: 1.5,
    fontWeight: 600,
    fontSize: 14,
    "&:hover": {
      background: "#e6df9a",
    },
  },
};
