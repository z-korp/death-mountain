# Alchemy Pay Sandbox - Supported Cryptos

**API Endpoint:** `https://openapi-test.alchemypay.org/open/api/v4/merchant/crypto/list`

## Best Options for Low Minimum (BSC Network)

| Crypto | Network | Min Purchase | Max Purchase | Buy Enabled |
|--------|---------|--------------|--------------|-------------|
| **USDC** | **BSC** | **$1.05** | $1,900 | Yes |
| **USDT** | **BSC** | **$2.10** | $1,900 | Yes |
| BNB | BSC | $1.05 | $1,900 | **No (disabled)** |
| ETH | BSC | $26.25 | $1,900 | Yes |

## All Supported Cryptos (buyEnable=1)

### BSC Network
| Crypto | Min | Max |
|--------|-----|-----|
| USDC | $1.05 | $1,900 |
| USDT | $2.10 | $1,900 |
| ADA | $15.75 | $1,900 |
| BCH | $15.75 | $1,900 |
| BTC | $15.75 | $1,900 |
| DOGE | $15.75 | $1,900 |
| DOT | $15.75 | $1,900 |
| ETH | $26.25 | $1,900 |
| GMT | $15.75 | $1,900 |
| LINK | $15.75 | $1,900 |
| NEAR | $15.75 | $1,900 |
| PHB | $15.75 | $1,900 |
| SAHARA | $15.75 | $1,900 |
| SHIB | $31.50 | $1,900 |
| SOL | $15.75 | $1,900 |
| USD1 | $15.75 | $1,900 |
| XRP | $15.75 | $1,900 |

### Other Networks with Low Minimums
| Crypto | Network | Min | Max |
|--------|---------|-----|-----|
| GOMINING | ETH | $1.05 | $1,900 |
| ETH | ASTRZK | $2.10 | $1,900,000 |
| MTT | MTT | $2.10 | $1,900 |
| RPK | ARBITRUM | $2.10 | $475 |
| SYNCVAULT | BASE | $2.10 | $1,900 |
| USDT | MATIC | $2.10 | $1,900 |

## Current Configuration

For sandbox testing, we use:
- **Network:** BSC
- **Supported Cryptos:** USDC ($1.05 min), USDT ($2.10 min)
- **Default:** USDC (lowest minimum)

## Production Configuration (Future)

For Starknet production:
- **Network:** STARKNET
- **Supported Cryptos:** USDC, STRK (TBD)

---

*Generated from Alchemy Pay sandbox API on 2026-02-04*
