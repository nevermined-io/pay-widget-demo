# Pay Widget Demo

A complete, self-contained demo of the [NeverminedPay](https://docs.nevermined.app/docs/integrate/patterns/embedded-checkout) embedded checkout widget.

It includes:

- An **Express.js** backend with an LLM-powered `/ask` endpoint protected by [x402 `paymentMiddleware`](https://docs.nevermined.app/docs/integrate/add-to-your-agent/express)
- A **chatbot frontend** that calls `/ask` directly
- When the user hasn't paid, the agent returns **402 Payment Required** and the frontend opens the **NeverminedPay widget** inside an iframe
- The user pays via **guest checkout** (no Nevermined account needed), gets an x402 access token, and the original request is retried automatically

## How it works

```
Your App                        Your Agent
  │                                │
  │  1. POST /ask (no token)       │
  │───────────────────────────────>│
  │                                │
  │  2. 402 Payment Required       │
  │<───────────────────────────────│
  │                                │
  │  3. NeverminedPay.open(...)    │
  │  ┌────────────────────────┐    │
  │  │ Embedded checkout      │    │
  │  │ - Select plan          │    │
  │  │ - Pay (Stripe/crypto)  │    │
  │  └────────────────────────┘    │
  │                                │
  │  4. Returns { accessToken }    │
  │                                │
  │  5. POST /ask + token          │
  │───────────────────────────────>│
  │                                │
  │  6. 200 OK + response          │
  │<───────────────────────────────│
```

## Prerequisites

- A [Nevermined](https://nevermined.app) account with an agent and a plan
- An [NVM API key](https://docs.nevermined.app/docs/getting-started/get-your-api-key)
- An [Anthropic API key](https://console.anthropic.com/) (powers the chatbot)

## Quick start

```bash
# 1. Clone and install
git clone https://github.com/nevermined-io/pay-widget-demo.git
cd pay-widget-demo
npm install

# 2. Configure
cp .env.example .env
# Edit .env with your keys (see below)

# 3. Run
npm start
# Server starts at http://localhost:5555
```

The widget iframe loads from `https://pay.nevermined.app`. If you're running the Nevermined webapp locally, update the `<script>` tag in `index.html` to point to your local instance (e.g. `http://localhost:4200/widget.js`).

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NVM_API_KEY` | Yes | Your Nevermined API key |
| `NVM_PLAN_ID` | Yes | The plan ID protecting the `/ask` endpoint |
| `NVM_AGENT_ID` | No | The agent DID (included in 402 headers for the widget) |
| `NVM_ENVIRONMENT` | No | `sandbox` or `live` (default: `sandbox`) |
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for Claude |
| `EXTERNAL_ID` | No | Your app's user identifier for guest checkout (default: `demo-user-001`) |
| `PORT` | No | Server port (default: `5555`) |

## Project structure

```
.
├── index.html      # Chatbot frontend with NeverminedPay widget integration
├── server.mjs      # Express backend with x402 paymentMiddleware
├── widget.js       # NeverminedPay widget script (loaded by index.html)
├── .env.example    # Environment variable template
└── package.json
```

## Learn more

- [Embedded Checkout docs](https://docs.nevermined.app/docs/integrate/patterns/embedded-checkout) - Full integration guide for HTML and React
- [Express.js integration](https://docs.nevermined.app/docs/integrate/add-to-your-agent/express) - x402 payment middleware reference
- [Fiat payments](https://docs.nevermined.app/docs/integrate/patterns/fiat-payments) - Stripe and card delegation flows
- [x402 protocol](https://docs.nevermined.app/docs/development-guide/nevermined-x402) - How the payment protocol works

## License

Apache-2.0
