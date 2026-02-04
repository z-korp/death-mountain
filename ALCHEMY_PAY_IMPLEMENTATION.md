# Alchemy Pay Fiat Onramp Integration

## Overview
Integration of Alchemy Pay On-Ramp to allow users to purchase USDC or STRK on Starknet via fiat payment, then automatically buy dungeon tickets and mint games.

## Credentials (Sandbox)
- **appId**: `f83Is2y7L425rxl8`
- **appSecret**: `8Z2wt0dYslDH2z6x`
- **Sandbox URL**: `https://openapi-test.alchemypay.org`
- **Production URL**: `https://openapi.alchemypay.org`

## Configuration (To Verify with Production)
- **Network Code**: `STARKNET` (needs verification)
- **Supported Cryptos**: `USDC`, `STRK` (needs verification)
- **Minimum Amount**: $1 USD

## User Flow
```
1. User clicks "Enter Dungeon"
2. PaymentOptionsModal shows "Pay with Card" option
3. User selects: game count + crypto (USDC/STRK)
4. Frontend calls POST /api/alchemy/create-order
5. Backend creates Alchemy Pay order with user's wallet address
6. User redirected to Alchemy Pay payment page
7. User completes payment (+ KYC if first time)
8. Alchemy Pay sends crypto to user's wallet
9. User redirected back to app
10. Frontend polls for crypto arrival
11. Auto-execute: Swap crypto → Ticket → Mint game
12. User enters dungeon
```

---

## Implementation Checklist

### Phase 1: Backend Infrastructure
- [x] **1.1** Setup Vercel API directory structure
- [x] **1.2** Create Alchemy Pay signature utility (`api/lib/alchemyPay.ts`)
- [x] **1.3** Create get-token endpoint (`api/alchemy/get-token.ts`)
- [x] **1.4** Create create-order endpoint (`api/alchemy/create-order.ts`)
- [x] **1.5** Create order-status endpoint (`api/alchemy/order-status.ts`)
- [x] **1.6** Create webhook handler (`api/alchemy/webhook.ts`)
- [x] **1.7** Update vercel.json for API routes

### Phase 2: Frontend API Layer
- [x] **2.1** Create Alchemy Pay API client (`src/api/alchemyPay.ts`)
- [x] **2.2** Create types for Alchemy Pay (`src/types/alchemyPay.ts`)

### Phase 3: UI Components
- [x] **3.1** Create FiatPaymentView component for PaymentOptionsModal
- [x] **3.2** Create PaymentStatusModal component
- [x] **3.3** Update PaymentOptionsModal to include fiat option
- [x] **3.4** Create PaymentCallback page

### Phase 4: State Management
- [~] **4.1** Create AlchemyPayContext (Skipped - using sessionStorage instead)
- [~] **4.2** Update ControllerContext with fiat payment methods (Using existing context)
- [x] **4.3** Implement token balance polling (In PaymentCallback)

### Phase 5: Auto-Purchase Flow
- [x] **5.1** Implement crypto detection logic (via webhook + polling)
- [x] **5.2** Implement auto-swap and ticket purchase (in PaymentCallback)
- [x] **5.3** Handle edge cases (insufficient gas, swap failures)

### Phase 6: Routes & Integration
- [x] **6.1** Add /payment/callback route
- [x] **6.2** Wire up all components
- [ ] **6.3** Add environment variables (Deployment step)

### Phase 7: Testing
- [ ] **7.1** Test order creation flow
- [ ] **7.2** Test webhook handling
- [ ] **7.3** Test complete end-to-end flow
- [ ] **7.4** Test error handling

---

## File Structure

```
client/
├── api/                              # Vercel serverless functions
│   ├── lib/
│   │   └── alchemyPay.ts            # [1.2] Signature utils, constants
│   └── alchemy/
│       ├── get-token.ts             # [1.3] POST /api/alchemy/get-token
│       ├── create-order.ts          # [1.4] POST /api/alchemy/create-order  
│       ├── order-status.ts          # [1.5] GET /api/alchemy/order-status
│       └── webhook.ts               # [1.6] POST /api/alchemy/webhook
├── src/
│   ├── api/
│   │   └── alchemyPay.ts            # [2.1] Frontend API client
│   ├── types/
│   │   └── alchemyPay.ts            # [2.2] TypeScript types
│   ├── components/
│   │   ├── FiatPaymentView.tsx      # [3.1] Fiat payment UI
│   │   ├── PaymentStatusModal.tsx   # [3.2] Status/polling modal
│   │   └── PaymentOptionsModal.tsx  # [3.3] Updated with fiat option
│   ├── contexts/
│   │   └── alchemyPay.tsx           # [4.1] Alchemy Pay state
│   └── pages/
│       └── PaymentCallback.tsx      # [3.4] Redirect handler page
└── vercel.json                       # [1.7] API routes config
```

---

## API Endpoints

### POST /api/alchemy/get-token
```typescript
// Request
{ uid: string }  // User's wallet address

// Response
{ 
  accessToken: string,
  id: string 
}
```

### POST /api/alchemy/create-order
```typescript
// Request
{
  walletAddress: string,     // Starknet address to receive crypto
  fiatAmount: number,        // Amount in fiat currency
  fiatCurrency: string,      // "USD", "EUR", etc.
  cryptoCurrency: string,    // "USDC" or "STRK"
  gameCount: number          // Number of games to purchase (for tracking)
}

// Response
{
  success: boolean,
  merchantOrderNo: string,   // Our order ID
  orderNo: string,           // Alchemy Pay order ID
  payUrl: string            // Redirect URL for payment
}
```

### GET /api/alchemy/order-status
```typescript
// Request
?merchantOrderNo={id}

// Response
{
  status: "PENDING" | "PAY_SUCCESS" | "FINISHED" | "FAILED",
  cryptoReceived: boolean,
  cryptoAmount?: string,
  txHash?: string,
  gameCount: number
}
```

### POST /api/alchemy/webhook
```typescript
// Request (from Alchemy Pay)
{
  orderNo: string,
  merchantOrderNo: string,
  status: string,
  crypto: string,
  cryptoQuantity: string,
  txHash: string,
  // ... other fields
}

// Response
{ success: true }
```

---

## Environment Variables

### Server-side (Vercel)
```env
ALCHEMY_APP_ID=f83Is2y7L425rxl8
ALCHEMY_APP_SECRET=8Z2wt0dYslDH2z6x
ALCHEMY_ENV=sandbox
FRONTEND_URL=https://your-domain.com
```

### Client-side
```env
VITE_ALCHEMY_ENABLED=true
VITE_API_BASE_URL=/api
```

---

## Progress Log

### 2026-02-04
- [x] Read Alchemy Pay documentation
- [x] Analyzed existing codebase
- [x] Created implementation plan
- [x] Tested sandbox API (Starknet not in sandbox, needs production verification)
- [x] Created this tracking document
- [x] Phase 1: Backend Infrastructure - COMPLETE
- [x] Phase 2: Frontend API Layer - COMPLETE
- [x] Phase 3: UI Components - COMPLETE
- [x] Phase 4-5: State Management & Auto-Purchase - COMPLETE (simplified approach)
- [x] Phase 6: Routes & Integration - COMPLETE (except env vars)
- [x] Fixed lint errors in Alchemy Pay files
- [x] Build passing

---

## Notes

### Starknet Support
- Sandbox API does not list Starknet (STARKNET network code)
- Need to verify with production credentials
- Available networks in sandbox: ETH, BSC, ARBITRUM, OPTIMISM, SOL, etc.

### Order Storage
- Using simple in-memory Map for MVP
- Orders auto-expire after 24 hours (Alchemy Pay payment link validity)
- Consider Vercel KV for production

### Signature Algorithm
- HMAC-SHA256 with Base64 encoding
- Format: `timestamp + httpMethod + requestPath + sortedJsonBody`
- Body keys must be sorted alphabetically
- Empty values removed from body

### Webhook Security
- Verify `newSignature` field in webhook payload
- Timestamp validation (5 minute window)
- Only process FINISHED status for auto-purchase

---

## Testing Checklist

### Sandbox Testing (< $50, no KYC)
- [ ] Create order with test credentials
- [ ] Complete payment with real card
- [ ] Verify crypto delivery
- [ ] Test webhook receipt
- [ ] Test redirect flow

### Error Cases
- [ ] Payment cancelled
- [ ] Payment failed
- [ ] Webhook timeout
- [ ] Insufficient gas for swap
- [ ] Swap fails (liquidity)
