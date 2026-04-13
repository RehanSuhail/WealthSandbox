# WealthSandbox 💰

> **Simulate Your Wealth. Decide with Confidence.**

WealthSandbox is a full-stack financial planning platform that empowers clients and advisors to model wealth scenarios through Monte Carlo simulations, AI-driven insights, and an interactive sandbox environment.

---

## 🏗️ Project Structure

```
WealthSandbox/
├── wealthsandbox/          # Next.js 16 – Main web application
│   ├── app/                # App Router pages & API routes
│   │   ├── (routes)/       # Protected routes (advisor, client, sandbox, etc.)
│   │   └── api/            # Backend API endpoints
│   ├── components/         # Shared UI components (shadcn/ui)
│   ├── lib/                # Utilities, types, auth helpers, LLM integration
│   └── hooks/              # Custom React hooks
│
├── MonteCarloSimulation/   # Python FastAPI – Simulation engine
│   ├── main.py             # FastAPI entry point
│   ├── simulation.py       # Core Monte Carlo logic
│   ├── engines/            # Simulation engines per asset class
│   │   ├── retirement_engine.py
│   │   ├── equity_engine.py
│   │   ├── real_estate_engine.py
│   │   ├── college_engine.py
│   │   └── emergency_engine.py
│   └── routers/            # FastAPI route handlers
│
└── frontend/               # Standalone prototype frontend (legacy)
```

---

## ✨ Features

- **Financial Sandbox** – Create and manage custom financial scenarios with adjustable parameters
- **Monte Carlo Engine** – Run thousands of simulations across retirement, equity, real estate, college funding, and emergency savings
- **Crisis Stress Testing** – Model historical market crises (Great Depression, Dot-Com 2000, Financial 2008, COVID-2020, etc.)
- **AI Insights** – Powered by Google Gemini to generate natural-language financial insights
- **Advisor Portal** – Advisors can manage client profiles, connect with clients, and review sandboxes
- **Client Portal** – Clients can run their own simulations and share results with advisors
- **Authentication** – Secure user auth via [Clerk](https://clerk.com)
- **Real-time Charts** – Interactive wealth trajectory charts (Recharts + Lightweight Charts)

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) ≥ 20 and [pnpm](https://pnpm.io/)
- [Python](https://python.org/) ≥ 3.11
- A [Clerk](https://clerk.com) account (for authentication)
- A [Google Gemini](https://ai.google.dev/) API key (for AI insights)

---

### 1. Clone the repository

```bash
git clone https://github.com/RehanSuhail/WealthSandbox.git
cd WealthSandbox
```

---

### 2. Next.js Web Application

```bash
cd wealthsandbox
pnpm install
```

Create a `.env.local` file in the `wealthsandbox/` directory:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/onboarding/client
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/onboarding/client

# Google Gemini
GEMINI_API_KEY=AIza...

# JWT Secret
JWT_SECRET=your_jwt_secret_here

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Run the development server:

```bash
pnpm dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

---

### 3. Monte Carlo Simulation API

```bash
cd MonteCarloSimulation
python -m venv venv
venv\Scripts\activate      # Windows
# source venv/bin/activate  # macOS/Linux

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The simulation API will be available at [http://localhost:8000](http://localhost:8000).  
API docs (Swagger UI): [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 🧪 Simulation Endpoints

| Endpoint | Description |
|---|---|
| `POST /simulate` | Core retirement Monte Carlo simulation |
| `POST /retirement/simulate` | Retirement accumulation & distribution |
| `POST /equity/simulate` | Stock portfolio projections |
| `POST /real-estate/simulate` | Real estate investment analysis |
| `POST /college/simulate` | College savings planning |
| `POST /emergency/simulate` | Emergency fund adequacy |

---

## 🛠️ Tech Stack

### Frontend / Web
| Technology | Purpose |
|---|---|
| Next.js 16 | Full-stack React framework |
| TypeScript | Type safety |
| Tailwind CSS v4 | Styling |
| shadcn/ui | UI component library |
| Clerk | Authentication |
| Recharts / Lightweight Charts | Data visualization |
| Google Gemini | AI-powered insights |
| Prisma | ORM |
| Redis (ioredis) | Caching |
| Zod | Schema validation |

### Simulation Backend
| Technology | Purpose |
|---|---|
| Python 3.11+ | Language |
| FastAPI | REST API framework |
| NumPy | Numerical simulation |
| Uvicorn | ASGI server |

---

## 📁 Environment Variables Reference

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk public key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `GEMINI_API_KEY` | Google Gemini API key |
| `JWT_SECRET` | Secret for JWT signing |
| `NEXT_PUBLIC_APP_URL` | Base URL of the application |
