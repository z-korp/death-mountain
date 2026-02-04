import { getOrderStatus } from "@/api/alchemyPay";
import type { OrderStatus, SupportedCrypto } from "@/types/alchemyPay";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloseIcon from "@mui/icons-material/Close";
import ErrorIcon from "@mui/icons-material/Error";
import HourglassTopIcon from "@mui/icons-material/HourglassTop";
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Typography,
} from "@mui/material";
import { AnimatePresence, motion } from "framer-motion";
import { memo, useCallback, useEffect, useState } from "react";

interface PaymentStatusModalProps {
  open: boolean;
  onClose: () => void;
  merchantOrderNo: string;
  gameCount: number;
  cryptoCurrency: SupportedCrypto;
  onCryptoReceived: (cryptoAmount: string) => void;
}

type StatusPhase =
  | "waiting_payment"
  | "payment_processing"
  | "waiting_crypto"
  | "crypto_received"
  | "purchasing_tickets"
  | "success"
  | "error";

const POLL_INTERVAL = 5000; // 5 seconds
const MAX_POLL_TIME = 30 * 60 * 1000; // 30 minutes

export const PaymentStatusModal = memo(
  ({
    open,
    onClose,
    merchantOrderNo,
    gameCount,
    cryptoCurrency,
    onCryptoReceived,
  }: PaymentStatusModalProps) => {
    const [phase, setPhase] = useState<StatusPhase>("waiting_payment");
    const [error, setError] = useState<string | null>(null);
    const [cryptoAmount, setCryptoAmount] = useState<string | null>(null);
    const startTime = useState(() => Date.now())[0];

    // Poll for order status
    const pollStatus = useCallback(async () => {
      if (!merchantOrderNo) return;

      try {
        const result = await getOrderStatus(merchantOrderNo);

        if (!result.success) {
          console.error("Failed to get order status:", result.error);
          return;
        }

        const status = result.status as OrderStatus;

        if (status === "FINISHED" && result.cryptoReceived) {
          setCryptoAmount(result.cryptoAmount || "");
          setPhase("crypto_received");
          onCryptoReceived(result.cryptoAmount || "");
        } else if (status === "PAY_SUCCESS") {
          setPhase("waiting_crypto");
        } else if (status === "PAY_FAIL") {
          setPhase("error");
          setError("Payment failed. Please try again.");
        }
      } catch (err) {
        console.error("Error polling status:", err);
      }
    }, [merchantOrderNo, onCryptoReceived]);

    // Start polling when modal opens
    useEffect(() => {
      if (!open || !merchantOrderNo) return;

      // Initial poll
      pollStatus();

      // Set up interval
      const interval = setInterval(() => {
        // Check if we've exceeded max poll time
        if (Date.now() - startTime > MAX_POLL_TIME) {
          clearInterval(interval);
          setPhase("error");
          setError("Payment timeout. Please check your order status.");
          return;
        }

        // Don't poll if we're past the waiting phase
        if (phase === "crypto_received" || phase === "success" || phase === "error") {
          clearInterval(interval);
          return;
        }

        pollStatus();
      }, POLL_INTERVAL);

      return () => clearInterval(interval);
    }, [open, merchantOrderNo, phase, pollStatus, startTime]);

    const getStatusContent = () => {
      switch (phase) {
        case "waiting_payment":
          return {
            icon: <HourglassTopIcon sx={{ fontSize: 60, color: "#FFD700" }} />,
            title: "Waiting for Payment",
            subtitle: "Complete your payment in the Alchemy Pay window",
            showSpinner: true,
          };
        case "payment_processing":
          return {
            icon: <CircularProgress size={60} sx={{ color: "#d0c98d" }} />,
            title: "Processing Payment",
            subtitle: "Your payment is being processed...",
            showSpinner: false,
          };
        case "waiting_crypto":
          return {
            icon: <HourglassTopIcon sx={{ fontSize: 60, color: "#FFD700" }} />,
            title: "Waiting for Crypto",
            subtitle: `Your ${cryptoCurrency} is on its way to your wallet`,
            showSpinner: true,
          };
        case "crypto_received":
          return {
            icon: <CheckCircleIcon sx={{ fontSize: 60, color: "#4caf50" }} />,
            title: "Crypto Received!",
            subtitle: `${cryptoAmount} ${cryptoCurrency} received`,
            showSpinner: false,
          };
        case "purchasing_tickets":
          return {
            icon: <CircularProgress size={60} sx={{ color: "#d0c98d" }} />,
            title: "Purchasing Tickets",
            subtitle: `Swapping ${cryptoCurrency} for ${gameCount} ticket${gameCount > 1 ? "s" : ""}...`,
            showSpinner: false,
          };
        case "success":
          return {
            icon: <CheckCircleIcon sx={{ fontSize: 60, color: "#4caf50" }} />,
            title: "Success!",
            subtitle: `${gameCount} game${gameCount > 1 ? "s" : ""} ready to play`,
            showSpinner: false,
          };
        case "error":
          return {
            icon: <ErrorIcon sx={{ fontSize: 60, color: "#f44336" }} />,
            title: "Something went wrong",
            subtitle: error || "Please try again",
            showSpinner: false,
          };
      }
    };

    const content = getStatusContent();

    return (
      <AnimatePresence>
        {open && (
          <Box sx={styles.overlay}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <Box sx={styles.modal}>
                <IconButton onClick={onClose} sx={styles.closeBtn} size="small">
                  <CloseIcon sx={{ fontSize: 20 }} />
                </IconButton>

                <Box sx={styles.content}>
                  <Box sx={styles.iconContainer}>{content.icon}</Box>

                  <Typography sx={styles.title}>{content.title}</Typography>
                  <Typography sx={styles.subtitle}>{content.subtitle}</Typography>

                  {content.showSpinner && (
                    <CircularProgress
                      size={24}
                      sx={{ color: "#d0c98d", mt: 2 }}
                    />
                  )}

                  {phase === "error" && (
                    <Button
                      variant="contained"
                      onClick={onClose}
                      sx={styles.button}
                    >
                      Close
                    </Button>
                  )}

                  {phase === "success" && (
                    <Button
                      variant="contained"
                      onClick={onClose}
                      sx={styles.button}
                    >
                      Enter Dungeon
                    </Button>
                  )}
                </Box>
              </Box>
            </motion.div>
          </Box>
        )}
      </AnimatePresence>
    );
  }
);

PaymentStatusModal.displayName = "PaymentStatusModal";

const styles = {
  overlay: {
    position: "fixed" as const,
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    bgcolor: "rgba(0, 0, 0, 0.7)",
    zIndex: 3000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backdropFilter: "blur(8px)",
  },
  modal: {
    width: "360px",
    maxWidth: "90vw",
    p: 4,
    borderRadius: 3,
    background: "linear-gradient(145deg, #1a2f1a 0%, #0f1f0f 100%)",
    border: "2px solid rgba(208, 201, 141, 0.4)",
    boxShadow:
      "0 24px 64px rgba(0, 0, 0, 0.8), 0 0 40px rgba(208, 201, 141, 0.1)",
    position: "relative" as const,
  },
  closeBtn: {
    position: "absolute" as const,
    top: 12,
    right: 12,
    color: "#d0c98d",
    background: "rgba(208, 201, 141, 0.1)",
    "&:hover": {
      background: "rgba(208, 201, 141, 0.2)",
    },
  },
  content: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    textAlign: "center" as const,
    pt: 2,
  },
  iconContainer: {
    mb: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    letterSpacing: 0.5,
    mb: 1,
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
    py: 1,
    fontWeight: 600,
    "&:hover": {
      background: "#e6df9a",
    },
  },
};
