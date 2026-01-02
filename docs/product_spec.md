# Product Specification: Lunar Axel - Agentic AI Trading System

## 1. Overview

**Lunar Axel** adalah sistem trading berbasis AI Agent yang terintegrasi dengan MetaTrader 5 (MT5). Sistem ini menggunakan arsitektur pull-based dimana MT5 Expert Advisor secara aktif melakukan sync ke backend untuk mengirim data dan menerima trading signals.

### 1.1 Goals
- Mengumpulkan data trading secara komprehensif dari MT5
- Menjalankan AI Agent setiap interval 1 menit untuk analisis
- Generate trading signals (BUY/SELL/HOLD) tanpa auto-execution
- Gratis/low-cost dengan memanfaatkan MT5 EA sebagai data pusher

### 1.2 Non-Goals
- Auto-execution trades (eksekusi manual oleh trader)
- Real-time streaming (menggunakan polling interval)
- Multi-broker aggregation (single MT5 instance)

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         LUNAR AXEL SYSTEM                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐         ┌──────────────────────────────────────┐ │
│  │              │         │           BACKEND (Bun.js)           │ │
│  │     MT5      │  HTTP   │  ┌────────────┐  ┌────────────────┐  │ │
│  │   Expert     │ ◄─────► │  │   Sync     │  │   Database     │  │ │
│  │   Advisor    │  POST   │  │  Endpoint  │  │  (SQLite/      │  │ │
│  │              │         │  │  /api/sync │  │   Postgres)    │  │ │
│  └──────────────┘         │  └────────────┘  └────────────────┘  │ │
│        │                  │        │                │             │ │
│        │                  │        ▼                │             │ │
│        │                  │  ┌────────────┐         │             │ │
│        │                  │  │  Data      │ ◄───────┘             │ │
│        │                  │  │  Store     │                       │ │
│        │                  │  └────────────┘                       │ │
│        │                  │        │                              │ │
│        │                  │        ▼                              │ │
│        │                  │  ┌────────────────────────────────┐   │ │
│        │                  │  │        AI AGENT               │   │ │
│        │                  │  │   (Runs every 1 minute)       │   │ │
│        │                  │  │                               │   │ │
│        │                  │  │  ┌─────────┐  ┌────────────┐  │   │ │
│        │                  │  │  │ Market  │  │  Signal    │  │   │ │
│        │                  │  │  │ Analyzer│─►│  Generator │  │   │ │
│        │                  │  │  └─────────┘  └────────────┘  │   │ │
│        │                  │  └────────────────────────────────┘   │ │
│        │                  │        │                              │ │
│        │                  │        ▼                              │ │
│        │  GET /signals    │  ┌────────────┐                       │ │
│        └──────────────────┼─►│  Signals   │                       │ │
│                           │  │  Store     │                       │ │
│                           │  └────────────┘                       │ │
│                           └──────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.1 Data Flow

1. **MT5 EA → Backend (Push Data)**
   - EA melakukan HTTP POST ke `/api/sync` setiap N detik
   - Mengirim: market data, account info, positions, history, indicators

2. **Backend Processing**
   - Menerima dan validasi data
   - Store ke database
   - Trigger AI Agent jika interval terpenuhi

3. **AI Agent Analysis**
   - Berjalan setiap 1 menit
   - Analisis data terkumpul
   - Generate signal: BUY, SELL, atau HOLD

4. **MT5 EA ← Backend (Get Signals)**
   - EA fetch signals dari `/api/signals`
   - Display signal di MT5 chart (tanpa auto-execute)

---

## 3. Tech Stack

| Component | Technology |
|-----------|------------|
| Runtime | Bun.js |
| Language | TypeScript |
| Framework | Elysia / Hono |
| Database | SQLite (dev) / PostgreSQL (prod) |
| AI/LLM | OpenAI API / Anthropic Claude / Local LLM |
| Scheduler | Bun Cron / node-cron |
| MT5 EA | MQL5 |

---

## 4. API Specification

### 4.1 Sync Endpoint

```
POST /api/sync
```

**Request Body:**
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "account": {
    "balance": 10000.00,
    "equity": 10250.00,
    "margin": 500.00,
    "free_margin": 9750.00,
    "margin_level": 2050.00,
    "profit": 250.00
  },
  "market": {
    "symbol": "EURUSD",
    "bid": 1.08550,
    "ask": 1.08552,
    "spread": 2,
    "tick_volume": 1234,
    "ohlcv": {
      "timeframe": "M1",
      "open": 1.08540,
      "high": 1.08560,
      "low": 1.08530,
      "close": 1.08550,
      "volume": 5678
    }
  },
  "positions": [
    {
      "ticket": 12345678,
      "symbol": "EURUSD",
      "type": "BUY",
      "volume": 0.1,
      "open_price": 1.08500,
      "current_price": 1.08550,
      "profit": 50.00,
      "open_time": "2024-01-15T09:00:00Z"
    }
  ],
  "history": {
    "last_trades": [
      {
        "ticket": 12345677,
        "symbol": "EURUSD",
        "type": "SELL",
        "volume": 0.1,
        "open_price": 1.08600,
        "close_price": 1.08550,
        "profit": 50.00,
        "open_time": "2024-01-14T14:00:00Z",
        "close_time": "2024-01-15T08:30:00Z"
      }
    ]
  },
  "indicators": {
    "rsi_14": 55.5,
    "macd": {
      "main": 0.00012,
      "signal": 0.00010,
      "histogram": 0.00002
    },
    "ma_20": 1.08520,
    "ma_50": 1.08480,
    "atr_14": 0.00080
  }
}
```

**Response:**
```json
{
  "status": "ok",
  "received_at": "2024-01-15T10:30:00.123Z",
  "next_sync_in": 5
}
```

### 4.2 Signals Endpoint

```
GET /api/signals?symbol=EURUSD
```

**Response:**
```json
{
  "symbol": "EURUSD",
  "signal": "BUY",
  "confidence": 0.75,
  "reasoning": "RSI oversold recovery, MACD bullish crossover, price above MA20",
  "generated_at": "2024-01-15T10:30:00Z",
  "valid_until": "2024-01-15T10:31:00Z",
  "metadata": {
    "agent_version": "1.0.0",
    "model": "gpt-4",
    "analysis_duration_ms": 1250
  }
}
```

### 4.3 Health Endpoint

```
GET /api/health
```

**Response:**
```json
{
  "status": "healthy",
  "uptime": 3600,
  "last_sync": "2024-01-15T10:29:55Z",
  "last_agent_run": "2024-01-15T10:30:00Z",
  "database": "connected"
}
```

---

## 5. AI Agent Specification

### 5.1 Agent Workflow

```
┌─────────────────────────────────────────────────────────┐
│                    AI AGENT CYCLE                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. COLLECT          2. ANALYZE         3. DECIDE       │
│  ┌──────────┐       ┌──────────┐       ┌──────────┐    │
│  │ Fetch    │       │ Process  │       │ Generate │    │
│  │ Latest   │ ───►  │ with LLM │ ───►  │ Signal   │    │
│  │ Data     │       │ Context  │       │ Output   │    │
│  └──────────┘       └──────────┘       └──────────┘    │
│       │                  │                  │           │
│       ▼                  ▼                  ▼           │
│  - Market data      - Technical       - BUY/SELL/HOLD   │
│  - Account info       analysis        - Confidence %    │
│  - Positions        - Pattern         - Reasoning       │
│  - History            recognition                       │
│  - Indicators       - Risk assessment                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 5.2 Agent Prompt Template

```
You are a professional forex trading analyst. Analyze the following market data and provide a trading signal.

## Current Market State
Symbol: {{symbol}}
Current Price: {{bid}}/{{ask}}
Spread: {{spread}} points

## Technical Indicators
- RSI(14): {{rsi_14}}
- MACD: Main={{macd.main}}, Signal={{macd.signal}}, Histogram={{macd.histogram}}
- MA(20): {{ma_20}}
- MA(50): {{ma_50}}
- ATR(14): {{atr_14}}

## Recent Price Action (Last 5 M1 candles)
{{ohlcv_history}}

## Current Positions
{{positions}}

## Account Status
Balance: {{balance}}
Equity: {{equity}}
Free Margin: {{free_margin}}

## Recent Trade History
{{history}}

---

Based on the above data, provide:
1. Signal: BUY, SELL, or HOLD
2. Confidence: 0.0 to 1.0
3. Reasoning: Brief explanation (max 100 words)

Respond in JSON format:
{
  "signal": "BUY|SELL|HOLD",
  "confidence": 0.0-1.0,
  "reasoning": "..."
}
```

### 5.3 Agent Configuration

```typescript
interface AgentConfig {
  // Execution
  interval: number;           // 60000 (1 minute)
  timeout: number;            // 30000 (30 seconds max per run)

  // LLM Settings
  model: string;              // "gpt-4" | "claude-3" | "local"
  temperature: number;        // 0.3 (lower for consistency)
  maxTokens: number;          // 500

  // Trading Rules
  minConfidence: number;      // 0.6 (minimum to emit signal)
  symbols: string[];          // ["EURUSD", "GBPUSD"]

  // Risk Management
  maxOpenPositions: number;   // 3
  maxDailyTrades: number;     // 10
}
```

---

## 6. Database Schema

### 6.1 Tables

```sql
-- Market data snapshots
CREATE TABLE market_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  symbol VARCHAR(10) NOT NULL,
  timestamp DATETIME NOT NULL,
  bid DECIMAL(10,5) NOT NULL,
  ask DECIMAL(10,5) NOT NULL,
  spread INTEGER NOT NULL,
  open DECIMAL(10,5),
  high DECIMAL(10,5),
  low DECIMAL(10,5),
  close DECIMAL(10,5),
  volume BIGINT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Account snapshots
CREATE TABLE account_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp DATETIME NOT NULL,
  balance DECIMAL(15,2) NOT NULL,
  equity DECIMAL(15,2) NOT NULL,
  margin DECIMAL(15,2),
  free_margin DECIMAL(15,2),
  profit DECIMAL(15,2),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Open positions
CREATE TABLE positions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket BIGINT NOT NULL,
  symbol VARCHAR(10) NOT NULL,
  type VARCHAR(10) NOT NULL,
  volume DECIMAL(10,2) NOT NULL,
  open_price DECIMAL(10,5) NOT NULL,
  current_price DECIMAL(10,5),
  profit DECIMAL(15,2),
  open_time DATETIME NOT NULL,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Trade history
CREATE TABLE trade_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket BIGINT NOT NULL UNIQUE,
  symbol VARCHAR(10) NOT NULL,
  type VARCHAR(10) NOT NULL,
  volume DECIMAL(10,2) NOT NULL,
  open_price DECIMAL(10,5) NOT NULL,
  close_price DECIMAL(10,5) NOT NULL,
  profit DECIMAL(15,2) NOT NULL,
  open_time DATETIME NOT NULL,
  close_time DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indicator values
CREATE TABLE indicators (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  symbol VARCHAR(10) NOT NULL,
  timestamp DATETIME NOT NULL,
  indicator_name VARCHAR(50) NOT NULL,
  indicator_value JSON NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- AI Generated signals
CREATE TABLE signals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  symbol VARCHAR(10) NOT NULL,
  signal VARCHAR(10) NOT NULL,
  confidence DECIMAL(3,2) NOT NULL,
  reasoning TEXT,
  model VARCHAR(50),
  generated_at DATETIME NOT NULL,
  valid_until DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sync logs
CREATE TABLE sync_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp DATETIME NOT NULL,
  payload_size INTEGER,
  processing_time_ms INTEGER,
  status VARCHAR(20),
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 7. MT5 Expert Advisor Specification

### 7.1 EA Features
- HTTP client untuk POST data ke backend
- Configurable sync interval (default: 5 detik)
- Display signals di chart
- Error handling dan retry logic
- Offline queue jika backend tidak available

### 7.2 EA Parameters

```mql5
input string   BackendURL = "http://localhost:3000";  // Backend URL
input int      SyncInterval = 5;                       // Sync interval (seconds)
input string   Symbols = "EURUSD,GBPUSD";             // Symbols to track
input bool     ShowSignalsOnChart = true;              // Display signals
input int      HistoryBars = 100;                      // Bars to send
input int      HistoryTrades = 20;                     // Recent trades to send
```

### 7.3 EA Pseudo-code

```mql5
void OnTimer() {
    // 1. Collect data
    SyncPayload payload = CollectMarketData();
    payload.account = GetAccountInfo();
    payload.positions = GetOpenPositions();
    payload.history = GetTradeHistory(HistoryTrades);
    payload.indicators = CalculateIndicators();

    // 2. Send to backend
    string response = HttpPost(BackendURL + "/api/sync", payload);

    // 3. Fetch signals
    string signals = HttpGet(BackendURL + "/api/signals?symbol=" + Symbol());

    // 4. Display on chart
    if (ShowSignalsOnChart) {
        DisplaySignal(signals);
    }
}
```

---

## 8. Project Structure

```
lunar-axel-agentic-ai/
├── docs/
│   └── product_spec.md
├── src/
│   ├── index.ts              # Entry point
│   ├── config/
│   │   └── index.ts          # Configuration
│   ├── api/
│   │   ├── routes.ts         # API routes
│   │   ├── sync.ts           # Sync endpoint handler
│   │   └── signals.ts        # Signals endpoint handler
│   ├── agent/
│   │   ├── index.ts          # Agent orchestrator
│   │   ├── analyzer.ts       # Market analyzer
│   │   ├── prompts.ts        # LLM prompts
│   │   └── scheduler.ts      # Cron scheduler
│   ├── db/
│   │   ├── index.ts          # Database connection
│   │   ├── schema.ts         # Schema definitions
│   │   └── queries.ts        # Query helpers
│   ├── services/
│   │   ├── llm.ts            # LLM client abstraction
│   │   └── market.ts         # Market data service
│   └── types/
│       └── index.ts          # TypeScript types
├── mt5/
│   └── LunarAxelEA.mq5       # Expert Advisor source
├── tests/
│   └── ...
├── package.json
├── tsconfig.json
├── bunfig.toml
└── README.md
```

---

## 9. Development Phases

### Phase 1: Foundation
- [ ] Project setup (Bun + TypeScript)
- [ ] Database schema implementation
- [ ] Basic API endpoints (sync, signals, health)
- [ ] MT5 EA skeleton

### Phase 2: Data Pipeline
- [ ] Sync endpoint full implementation
- [ ] Data validation & storage
- [ ] MT5 EA data collection
- [ ] Sync testing

### Phase 3: AI Agent
- [ ] LLM integration (OpenAI/Claude)
- [ ] Agent scheduler (1-minute interval)
- [ ] Prompt engineering
- [ ] Signal generation logic

### Phase 4: Integration
- [ ] MT5 EA signal display
- [ ] End-to-end testing
- [ ] Error handling & logging
- [ ] Performance optimization

### Phase 5: Enhancement
- [ ] Multiple symbols support
- [ ] Backtesting capability
- [ ] Dashboard UI (optional)
- [ ] Alert notifications

---

## 10. Configuration

### 10.1 Environment Variables

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=./data/lunar-axel.db

# LLM
LLM_PROVIDER=openai          # openai | anthropic | local
OPENAI_API_KEY=sk-xxx
ANTHROPIC_API_KEY=sk-ant-xxx

# Agent
AGENT_INTERVAL=60000         # 1 minute in ms
AGENT_MIN_CONFIDENCE=0.6
AGENT_MODEL=gpt-4

# Trading
SYMBOLS=EURUSD,GBPUSD
MAX_OPEN_POSITIONS=3
MAX_DAILY_TRADES=10
```

---

## 11. Security Considerations

1. **API Authentication**: Implement API key untuk MT5 EA
2. **Rate Limiting**: Prevent abuse pada sync endpoint
3. **Input Validation**: Validasi semua data dari MT5
4. **Secrets Management**: Jangan hardcode API keys
5. **HTTPS**: Gunakan HTTPS untuk production

---

## 12. Monitoring & Logging

- Log semua sync requests
- Log agent runs dan hasilnya
- Track signal accuracy over time
- Monitor system health
- Alert jika sync gagal berturut-turut

---

## 13. Future Enhancements

- **Multi-timeframe analysis**: Kombinasi M1, M5, M15, H1
- **Sentiment analysis**: News & social media integration
- **Backtesting engine**: Test strategies dengan historical data
- **Web dashboard**: Real-time monitoring UI
- **Mobile notifications**: Push alerts via Telegram/Discord
- **Auto-execution mode**: Optional auto-trading (with safeguards)
