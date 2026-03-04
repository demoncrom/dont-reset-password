# Don't Reset Password

A Chrome extension that crowdsources and displays password composition rules next to password input fields — so you never have to reset your password again.

每次忘记某个网站的密码规则而被迫重置密码？这个 Chrome 插件会在密码输入框旁边显示该网站的密码规则，帮你一次就输对密码。

## Features

- Automatically detects password input fields on any website
- Displays password rules (min/max length, required character types, etc.) in a tooltip
- Crowdsourced rules — anyone can contribute rules for any website
- Voting system to ensure rule accuracy
- 30+ popular websites pre-loaded (Google, GitHub, Apple, Amazon, etc.)
- Dark mode support
- Bilingual UI (English & 中文)

## Architecture

```
Content Script → chrome.runtime.sendMessage → Service Worker → Cache → Supabase Edge Functions → PostgreSQL
```

- **Manifest V3** Chrome Extension
- **Supabase** backend (Edge Functions + PostgreSQL + RLS)
- **Shadow DOM** tooltip — isolated from page styles
- **No build step** — pure vanilla JS

## Install

### From Source

1. Clone this repo
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** → select the `extension/` directory

### Configure Backend

Edit `extension/utils/api.js` — replace `SUPABASE_URL` and `SUPABASE_ANON_KEY` with your Supabase project values.

## Backend Setup

### Database

Run these SQL files in order in the [Supabase SQL Editor](https://supabase.com/dashboard):

```sql
-- 1. Create tables
supabase/migrations/001_initial_schema.sql

-- 2. Seed data (30+ popular websites)
supabase/seed.sql
```

### Edge Functions

```bash
supabase functions deploy get-rules --no-verify-jwt
supabase functions deploy submit-rules --no-verify-jwt
supabase functions deploy vote --no-verify-jwt
supabase functions deploy report --no-verify-jwt
```

## Testing

```bash
npm test
```

116 unit tests covering domain extraction, rule validation, caching, API client, and i18n — using Node.js built-in `node:test` (zero dependencies).

## Pre-loaded Websites

Google, Apple, Microsoft, Amazon, Facebook, GitHub, X (Twitter), Netflix, LinkedIn, Chase Bank, Bank of America, PayPal, Dropbox, Adobe, Spotify, Reddit, Discord, Slack, Notion, Steam, Outlook, Zoom, eBay, Walmart, Instagram, 淘宝, 支付宝, 微信, 京东, 百度, Bilibili

## How It Works

1. Content script detects `<input type="password">` fields (including dynamic ones via MutationObserver)
2. Requests rules from the service worker, which checks cache then Supabase
3. Renders a Shadow DOM tooltip below the password input
4. Users can vote on rules or contribute new ones via the popup

## License

MIT
