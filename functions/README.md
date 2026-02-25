# Cloudflare Pages Functions

This directory contains serverless functions that run on Cloudflare's edge network.

## `/drop/[[token]]/_middleware.js`

**Purpose:** Bot detection and redirect for link previews

**How it works:**
1. Runs before serving any `/drop/*` page
2. Detects bot user-agents (Facebook, WhatsApp, iMessage, etc.)
3. If bot: redirects to `drop.dannycasio.com` (SSR server with proper og:title)
4. If human: serves static page from Cloudflare Pages

**Result:** Link previews show actual filenames instead of "File Share"

**Deployment:** Auto-deploys with every push to main (via Cloudflare Pages)
