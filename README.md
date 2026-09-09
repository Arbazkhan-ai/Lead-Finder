# LeadsFlow AI — Autonomous Lead Finder & Deal Closing Outreach Platform

A full-stack, autonomous B2B client acquisition web platform that:
1. **Finds Leads & Scrapes Websites**: Searches prospective businesses by niche and location, and deeply crawls websites to extract verified emails, phone numbers, and social links.
2. **Cold Email Outreach**: Generates high-converting, personalized cold pitches tailored to the prospect's company and website.
3. **AI Autonomous Closer Loop**: Listens for client replies, analyzes objections/intent, and automatically crafts persuasive counter-responses until the client agrees and the deal is marked **Closed Won**.
4. **Visual Pipeline & Website Inspector**: Interactive Kanban pipeline board and CRM showing statuses (`New` → `Contacted` → `Replied` → `Negotiating` → `Closed Won`), live website links/previews, and complete conversation history.

---

## Quick Start (Run in 1 Step)

The backend and built frontend run together on port `5000`:

```bash
# Start the server (serves both API and Web UI)
npm start
```

Then open your browser at:
👉 **[http://localhost:5000](http://localhost:5000)**

---

## Development Mode (With Hot Reload)

To run the backend with live reloading and Vite development server:

```bash
# Terminal 1: Backend Server (Port 5000)
npm run dev:server

# Terminal 2: Frontend Vite (Port 3000)
npm run dev:client
```

---

## Key Features

### 1. Lead Finder & Scraper Engine
- **Search by Niche & Location**: Query real businesses worldwide (via OpenStreetMap business directories and search queries) in any niche (e.g. *Digital Marketing in Austin*, *Dentists in Miami*, *Law Firms in New York*).
- **Deep Website Scraper**: Crawls homepages, `/contact`, `/about`, and team pages to extract:
  - Verified business emails
  - Direct telephone numbers
  - Social media links (LinkedIn, Twitter, Facebook, Instagram)
  - Company titles and meta descriptions
- **1-Click Pipeline Import**: Select discovered prospects and add them directly into your outreach pipeline.

### 2. Autonomous Deal-Closing AI Loop
- **Intent & Sentiment Detection**: Automatically parses client responses:
  - `pricing_inquiry`: Explains ROI and presents special pilot pricing.
  - `budget_objection`: Neutralizes budget hesitations with risk-free trial structures.
  - `trust_objection`: Provides proof, performance guarantees, and case studies.
  - `meeting_request`: Sends booking calendar invitation link (e.g., Calendly).
  - `ready_to_close`: Supplies paperwork/agreement link and marks deal as **Closed Won**!
- **Autopilot Mode**: When turned on, the system responds automatically as soon as a reply arrives.

### 3. Interactive Sandbox Simulator
- Test client replies right from the web dashboard:
  - 💬 *"What is your pricing?"*
  - 💰 *"Budget is too tight right now"*
  - 📅 *"Can we hop on a call tomorrow?"*
  - 🤝 *"Send the contract, let's start!"*
- Watch the AI formulate real-time counter-arguments and advance the pipeline stage live.

### 4. Pipeline & Website Inspector
- Visual Kanban columns: `New Leads`, `Outreach Sent`, `Client Replied`, `In Negotiation`, `Closed Won`, `Closed Lost`.
- Displays deal value ($), contact information, and **live clickable website links** for every prospect.
