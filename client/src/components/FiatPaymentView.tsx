import { createAlchemyOrder, redirectToPayment } from "@/api/alchemyPay";
import { useController } from "@/contexts/controller";
import type { SupportedCrypto } from "@/types/alchemyPay";
import AddIcon from "@mui/icons-material/Add";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import RemoveIcon from "@mui/icons-material/Remove";
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { memo, useCallback, useState } from "react";

interface FiatPaymentViewProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  styles: Record<string, any>;
}

const TICKET_PRICE_USD = 1; // Approximate ticket price
const MIN_GAMES = 1;
const MAX_GAMES = 10;

export const FiatPaymentView = memo(
  ({ styles }: FiatPaymentViewProps) => {
    const { address } = useController();
    const [gameCount, setGameCount] = useState(1);
    const [selectedCrypto, setSelectedCrypto] =
      useState<SupportedCrypto>("USDC");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const estimatedAmount = (gameCount * TICKET_PRICE_USD * 1.1).toFixed(2); // 10% buffer

    const handleIncrement = useCallback(() => {
      setGameCount((prev) => Math.min(prev + 1, MAX_GAMES));
    }, []);

    const handleDecrement = useCallback(() => {
      setGameCount((prev) => Math.max(prev - 1, MIN_GAMES));
    }, []);

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

        // Store order info in sessionStorage for callback page
        sessionStorage.setItem(
          "alchemyPayOrder",
          JSON.stringify({
            merchantOrderNo: result.merchantOrderNo,
            gameCount,
            cryptoCurrency: selectedCrypto,
            fiatAmount: estimatedAmount,
          })
        );

        // Redirect to Alchemy Pay payment page
        redirectToPayment(result.payUrl);
      } catch (err) {
        console.error("Payment error:", err);
        setError(err instanceof Error ? err.message : "Payment failed");
        setIsLoading(false);
      }
    }, [address, estimatedAmount, selectedCrypto, gameCount]);

    return (
      <Box sx={styles.paymentCard}>
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

        {/* Game Count Selector */}
        <Box sx={{ px: 2, mb: 2 }}>
          <Typography
            sx={{ fontSize: 12, color: "text.secondary", mb: 1, opacity: 0.8 }}
          >
            Number of Games
          </Typography>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
            }}
          >
            <IconButton
              onClick={handleDecrement}
              disabled={gameCount <= MIN_GAMES}
              sx={{
                border: "1px solid rgba(208, 201, 141, 0.3)",
                "&:hover": { background: "rgba(208, 201, 141, 0.1)" },
              }}
            >
              <RemoveIcon sx={{ color: "#d0c98d", fontSize: 18 }} />
            </IconButton>
            <Typography
              sx={{
                fontSize: 24,
                fontWeight: 700,
                minWidth: 40,
                textAlign: "center",
              }}
            >
              {gameCount}
            </Typography>
            <IconButton
              onClick={handleIncrement}
              disabled={gameCount >= MAX_GAMES}
              sx={{
                border: "1px solid rgba(208, 201, 141, 0.3)",
                "&:hover": { background: "rgba(208, 201, 141, 0.1)" },
              }}
            >
              <AddIcon sx={{ color: "#d0c98d", fontSize: 18 }} />
            </IconButton>
          </Box>
        </Box>

        {/* Crypto Selector */}
        <Box sx={{ px: 2, mb: 2 }}>
          <Typography
            sx={{ fontSize: 12, color: "text.secondary", mb: 1, opacity: 0.8 }}
          >
            Receive as
          </Typography>
          <ToggleButtonGroup
            value={selectedCrypto}
            exclusive
            onChange={handleCryptoChange}
            fullWidth
            sx={{
              "& .MuiToggleButton-root": {
                color: "text.secondary",
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
            <ToggleButton value="STRK">STRK</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Estimated Amount */}
        <Box sx={styles.costDisplay}>
          <Typography sx={styles.costText}>
            Estimated: ~${estimatedAmount} USD
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
        <Box sx={{ display: "flex", justifyContent: "center", px: 2, mb: 2 }}>
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
                {!address ? "Connect Wallet" : `Pay $${estimatedAmount}`}
              </Typography>
            )}
          </Button>
        </Box>
      </Box>
    );
  }
);

FiatPaymentView.displayName = "FiatPaymentView";
