# Fiverr Keyword Intelligence & Market Research Engine

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Ibeuk/fiverr-keyword-intelligence)
![Node.js](https://img.shields.io/badge/Node.js-22+-emerald.svg)
![License](https://img.shields.io/badge/License-MIT-blue.svg)
![Status](https://img.shields.io/badge/Data_Integrity-Zero_Fabrication-brightgreen.svg)

> **Core Foundational Rule:**
> **FIVERR ITSELF IS THE PRIMARY SOURCE OF TRUTH.**
> The system obtains real Fiverr search-result data directly from live pages and derives its conclusions strictly from verified information. It **never** invents, estimates, or hallucinates missing numbers.

---

## ⚡ Overview

The **Fiverr Keyword Intelligence & Market Research Engine** is a high-performance market research platform built to replace manual spreadsheet analysis for Fiverr sellers and freelancers.

It automatically extracts, parses, verifies, and analyzes first-page search results on Fiverr, applying the user's exact mathematical research methodology:

$$\text{Average} = \frac{\text{Tno} \times \text{Nso}}{\text{Tns}}$$

- **Tns (Total Number of Sellers)**: Total verified search count visibly reported by Fiverr (e.g. `1,100+`).
- **Nsf (First-Page Listings)**: Actual count of unique listings parsed on the first page.
- **Nfc (Fiverr Choice)**: Visible Fiverr Choice badges count.
- **Nso (Sellers with Orders)**: Number of sellers demonstrating visible order queue activity ($orders > 0$).
- **Tno (Total Visible Orders)**: Sum of all visible active orders in queue.
- **Average**: Rounded deterministically to 2 decimal places.
- **30+ Order Opportunity Filter**: Automatic PASS / FAIL evaluation.
- **Master Ranking Table**: Real-time auto-sorted table where **Highest Average = Rank #1**.

---

## 🚀 1-Click Cloud Deployment

Deploy this engine to the cloud with **zero manual configuration**:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Ibeuk/fiverr-keyword-intelligence)

Render reads the included `render.yaml` Blueprint and deploys:
- **Build Command**: `npm install`
- **Start Command**: `node src/server/server.js`
- **Port**: Automatic cloud binding (`0.0.0.0`)

---

## 🏗️ Architecture

```
User Browser (Chrome)
  ├── Searches Fiverr: fiverr.com/search/gigs?query=...
  └── Chrome Extension ("Fiverr Intelligence Collector")
        ├── Extracts Tns, listings, seller levels, ratings, orders
        └── Transmits payload via HTTPS to Cloud Backend

Cloud Backend (Render / Node.js)
  ├── POST /api/v1/ingest
  ├── Validation Engine (Integrity checks, math reconciliation, anti-duplication)
  ├── Exact Formula Engine: Average = (Tno * Nso) / Tns
  ├── Market Behavior & Concentration Classifier (Gini / Top 2 Seller Share)
  └── Persistent Database (JSON / SQLite)

Web Dashboard (Publicly Accessible)
  ├── Master Ranking Table (Live sort: Highest Average = Rank #1)
  ├── First 5 Rows Scoped vs. Full First Page Switcher
  ├── 30+ Order Opportunity Filter Indicator
  ├── Seller Level Breakdown (Top Rated, Level 2, Level 1, New Seller)
  └── Forensic Raw Evidence Inspector (Traceable back to live gigs)
```

---

## 🧩 Chrome Extension Setup

1. Open Chrome and go to `chrome://extensions/`.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** (top-left) and select the `extension/` folder from this repository.
4. Click the extension icon in your toolbar, and set your **Server URL** to your live Cloud URL (e.g. `https://fiverr-keyword-intelligence.onrender.com`) or `http://localhost:3001` for local testing.
5. On any Fiverr search page, click **`[⚡ Analyze with Intelligence Engine]`**.

---

## 🧪 Automated Test Suite

Run unit tests verifying the mathematical engine and integrity invariants:
```bash
npm test
```

Verifies:
- Benchmark test: $(35 \times 7) / 1,100 = 0.22$
- 30+ threshold evaluation: Pass ($Tno \ge 30$) vs. Fail ($Tno < 30$)
- Rejection of missing order queue indicators (`INSUFFICIENT_DATA`)
- De-duplication of duplicate or promoted gigs
- Master Ranking sort order (Highest Average = Rank #1)

---

## 📄 License
MIT License. Crafted for verified Fiverr market intelligence.
