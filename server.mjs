/**
 * Pay Widget Demo — A Nevermined-protected agent with a chatbot UI that
 * demonstrates the NeverminedPay embedded checkout widget.
 *
 * This is a complete, self-contained example:
 * - An Express server with an LLM-powered /ask endpoint protected by x402 paymentMiddleware
 * - A chatbot frontend that talks to /ask directly
 * - When the user hasn't paid → 402 → frontend opens the NeverminedPay widget
 * - User pays via guest checkout → gets an x402 accessToken → retries → 200
 *
 * Environment variables (create a .env file from .env.example):
 *   NVM_API_KEY        — Nevermined API key (the agent owner's key)
 *   NVM_PLAN_ID        — The plan ID protecting the /ask endpoint
 *   NVM_AGENT_ID       — The agent DID
 *   NVM_ENVIRONMENT    — sandbox or production (default: sandbox)
 *   ANTHROPIC_API_KEY  — Anthropic key for the LLM
 *   EXTERNAL_ID        — Your app's user identifier for guest checkout
 *   PORT               — Server port (default: 5555)
 *
 * Usage:
 *   cp .env.example .env   # fill in your values
 *   npm install
 *   npm start
 *
 * Also run the Nevermined webapp (for the widget):
 *   cd ../../ && yarn webapp
 */

import 'dotenv/config'
import express from 'express'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { Payments } from '@nevermined-io/payments'
import { paymentMiddleware } from '@nevermined-io/payments/express'
import Anthropic from '@anthropic-ai/sdk'

const __dirname = dirname(fileURLToPath(import.meta.url))

const NVM_API_KEY = process.env.NVM_API_KEY || ''
const NVM_PLAN_ID = process.env.NVM_PLAN_ID || ''
const NVM_AGENT_ID = process.env.NVM_AGENT_ID || '' // optional — paymentMiddleware includes it in 402 headers
const NVM_ENVIRONMENT = process.env.NVM_ENVIRONMENT || 'sandbox'
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''
const EXTERNAL_ID = process.env.EXTERNAL_ID || 'demo-user-001'
const PORT = parseInt(process.env.PORT || '5555', 10)

if (!NVM_API_KEY || !NVM_PLAN_ID) {
  console.error('NVM_API_KEY and NVM_PLAN_ID are required. Create a .env file.')
  process.exit(1)
}
if (!ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY is required. Create a .env file.')
  process.exit(1)
}

// --- Nevermined Payments ---
const payments = Payments.getInstance({
  nvmApiKey: NVM_API_KEY,
  environment: NVM_ENVIRONMENT,
})

// --- Anthropic ---
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY })

// --- Express app ---
const app = express()
app.use(express.json())

// Expose the payment-required header so the browser can read it from fetch responses
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Expose-Headers', 'payment-required, payment-response')
  next()
})

app.use(express.static(__dirname))

// x402 payment middleware — protects POST /ask
// No scheme override — the middleware auto-detects from the plan type:
// fiat plans → nvm:card-delegation, crypto plans → nvm:erc4337
app.use(
  paymentMiddleware(payments, {
    'POST /ask': {
      planId: NVM_PLAN_ID,
      credits: 1,
      ...(NVM_AGENT_ID && { agentId: NVM_AGENT_ID }),
    },
  })
)

// --- POST /ask — The protected agent endpoint ---
app.post('/ask', async (req, res) => {
  try {
    const { query } = req.body
    if (!query) return res.status(400).json({ error: 'Missing "query" in request body' })

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      system: 'You are a helpful AI assistant. Provide concise, insightful answers. Keep responses under 200 words.',
      messages: [{ role: 'user', content: query }],
    })

    const response = message.content[0].text
    res.json({ response })
  } catch (err) {
    console.error('[/ask] Error:', err.message)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// --- GET /api/config ---
// Returns the widget configuration for the frontend.
app.get('/api/config', (_req, res) => {
  res.json({
    agentId: NVM_AGENT_ID,
    externalId: EXTERNAL_ID,
  })
})

app.listen(PORT, () => {
  console.log(`\n=== Pay Widget Demo ===`)
  console.log(`Server:       http://localhost:${PORT}`)
  console.log(`Agent DID:    ${NVM_AGENT_ID || '(not set)'}`)
  console.log(`Plan ID:      ${NVM_PLAN_ID}`)
  console.log(`External ID:  ${EXTERNAL_ID}`)
  console.log(`Environment:  ${NVM_ENVIRONMENT}`)
  console.log(`\nEndpoints:`)
  console.log(`  POST /ask        — Protected agent (x402)`)
  console.log(`  GET  /api/config — Guest external ID`)
  console.log(`\nAlso run the webapp for the widget: cd ../../ && yarn webapp`)
})
