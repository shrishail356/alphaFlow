# AlphaFlow: AI-Powered Trading Platform on Aptos

AlphaFlow is a revolutionary DeFi trading platform built on the Aptos blockchain that combines artificial intelligence, real-time market analysis, and gamified rewards. The platform integrates with Decibel DEX to provide intelligent trading assistance, automated execution, comprehensive portfolio management, and an engaging reward system.

## 🚀 Features

- **AI-Powered Trading Assistant**: Chat with an AI that analyzes market data, news sentiment, and technical indicators to provide actionable trading recommendations
- **Lightning-Fast Execution**: Sub-0.125 second transaction finality through Decibel DEX integration
- **Portfolio Management**: Real-time tracking of positions, P&L, trade history, and performance metrics
- **Gamified Rewards**: Earn points and unlock tiers (Bronze → Silver → Gold → Platinum → VIP) based on trading activity
- **Cryptocurrency News**: Aggregated news feed filtered by sentiment, tickers, and content type
- **Non-Custodial**: Users maintain full control of their funds - all trades execute on-chain through connected wallets

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** - React framework with server-side rendering
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Smooth animations and transitions
- **shadcn/ui** - Beautiful UI components
- **TradingView** - Advanced charting integration

### Backend
- **Node.js** - JavaScript runtime
- **Express** - Web framework
- **TypeScript** - Type-safe development
- **Axios** - HTTP client
- **OpenRouter API** - AI model integration (Claude Sonnet 3.5)
- **Decibel API** - DEX integration
- **CryptoNews API** - News aggregation

### Blockchain
- **Aptos** - High-performance blockchain
- **Decibel DEX** - Decentralized exchange
- **Petra Wallet** - Wallet integration

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **pnpm** (recommended) or npm
- **PostgreSQL** (for database)
- **Git**

## 🔧 Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd aptos-hackathon
```

### 2. Backend Setup

```bash
cd backend
pnpm install
```

### 3. Frontend Setup

```bash
cd ../frontend
pnpm install
```

## ⚙️ Environment Variables

### Backend Environment Variables

Create a `.env` file in the `backend` directory with the following variables:

```env
# Server Configuration
NODE_ENV=development
PORT=4000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/alphafow

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-minimum-16-characters

# Decibel DEX Configuration
DECIBEL_BASE_URL=https://api.testnet.aptoslabs.com/decibel
DECIBEL_API_KEY=your-decibel-api-key

# Photon Integration
PHOTON_BASE_URL=https://stage-api.getstan.app/identity-service/api/v1
PHOTON_API_KEY=your-photon-api-key

# AI Configuration
AI_API_KEY=your-ai-api-key
OPENROUTER_API_KEY=your-openrouter-api-key

# Aptos Node
APTOS_NODE_API_KEY=your-aptos-node-api-key

# Backend Wallet (for delegated trading - optional)
BACKEND_WALLET_PRIVATE_KEY=your-backend-wallet-private-key

# Frontend Origin
FRONTEND_ORIGIN=http://localhost:3000
```

#### Environment Variable Descriptions

- **NODE_ENV**: Environment mode (`development`, `production`, or `test`)
- **PORT**: Backend server port (default: 4000)
- **DATABASE_URL**: PostgreSQL connection string
- **JWT_SECRET**: Secret key for JWT token generation (minimum 16 characters)
- **DECIBEL_BASE_URL**: Decibel API base URL (testnet or mainnet)
- **DECIBEL_API_KEY**: Your Decibel API key for authenticated requests
- **PHOTON_BASE_URL**: Photon identity service base URL
- **PHOTON_API_KEY**: Your Photon API key for user authentication
- **AI_API_KEY**: API key for AI services (optional, if using direct AI API)
- **OPENROUTER_API_KEY**: OpenRouter API key for Claude Sonnet 3.5 access
- **APTOS_NODE_API_KEY**: Aptos fullnode API key to avoid rate limits
- **BACKEND_WALLET_PRIVATE_KEY**: Private key for backend wallet (optional, for delegated trading)
- **FRONTEND_ORIGIN**: Frontend application URL for CORS configuration

### Frontend Environment Variables

Create a `.env.local` file in the `frontend` directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## 🗄️ Database Setup

1. Create a PostgreSQL database:

```bash
createdb alphafow
```

2. Run the database schema:

```bash
psql -d alphafow -f database/schema.sql
```

The schema includes tables for:
- Users and authentication
- Trading data
- Portfolio information
- Reward points and tiers
- AI chat history
- And more...

## 🚀 Running the Application

### Development Mode

#### Start Backend Server

```bash
cd backend
pnpm dev
```

The backend server will start on `http://localhost:4000`

#### Start Frontend Server

```bash
cd frontend
pnpm dev
```

The frontend application will start on `http://localhost:3000`

### Production Mode

#### Build Backend

```bash
cd backend
pnpm build
pnpm start
```

#### Build Frontend

```bash
cd frontend
pnpm build
pnpm start
```

## 📁 Project Structure

```
aptos-hackathon/
├── backend/
│   ├── src/
│   │   ├── config/          # Configuration files
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   ├── middleware/      # Express middleware
│   │   └── clients/         # External service clients
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── app/                 # Next.js app directory
│   │   ├── trading/        # Trading page
│   │   ├── portfolio/      # Portfolio page
│   │   ├── news/           # News page
│   │   ├── rewards/        # Rewards page
│   │   └── how-it-works/   # How it works page
│   ├── components/         # React components
│   ├── lib/                # Utilities and helpers
│   └── package.json
├── database/
│   └── schema.sql          # Database schema
├── docs/                   # Documentation
└── README.md
```

## 🔑 Getting API Keys

### Decibel API Key
1. Visit [Decibel DEX](https://app.decibel.trade)
2. Create an account and navigate to API settings
3. Generate an API key

### OpenRouter API Key
1. Visit [OpenRouter](https://openrouter.ai)
2. Sign up and create an API key
3. Add credits to your account

### Aptos Node API Key
1. Visit [Aptos Labs](https://aptoslabs.com)
2. Sign up for API access
3. Generate a node API key

### Photon API Key
1. Visit [Photon](https://getstan.app)
2. Sign up for developer access
3. Get your API key from the dashboard

## 🎯 Usage

### 1. Connect Wallet
- Click "Connect Wallet" in the header
- Select Petra wallet or create an embedded wallet
- Approve the connection

### 2. Start Trading
- Navigate to the Trading page
- Chat with the AI assistant about market conditions
- Review AI trade suggestions
- Execute trades with one click

### 3. View Portfolio
- Go to the Portfolio page
- View open positions, trade history, and performance metrics
- Track P&L in real-time

### 4. Check Rewards
- Visit the Rewards page
- See your current tier and points
- Track progress to the next tier

### 5. Read News
- Go to the News page
- Filter by ticker, sentiment, or type
- Stay updated with market developments

## 🧪 Testing

### Backend Tests
```bash
cd backend
pnpm test
```

### Frontend Tests
```bash
cd frontend
pnpm test
```

## 🐛 Troubleshooting

### Backend Issues

**Port already in use:**
```bash
# Kill process on port 4000
lsof -ti:4000 | xargs kill -9
```

**Database connection error:**
- Verify PostgreSQL is running
- Check DATABASE_URL in .env file
- Ensure database exists

**API rate limiting:**
- Add APTOS_NODE_API_KEY to .env
- Check API key validity
- Monitor rate limit headers

### Frontend Issues

**Port already in use:**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

**API connection error:**
- Verify backend is running on port 4000
- Check NEXT_PUBLIC_API_URL in .env.local
- Check browser console for CORS errors

**Wallet connection issues:**
- Ensure Petra wallet extension is installed
- Check wallet network (should be Testnet)
- Clear browser cache and reload

## 📚 Documentation

- [Decibel Integration Guide](./docs/decibel_integration_guide.md)
- [Trade Execution Flow](./docs/decibel_trade_execution_flow.md)
- [User Onboarding Flow](./docs/decibel_user_onboarding_flow.md)
- [API Documentation](./docs/decible/quick%20start/api_reference.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- **Aptos Labs** - For the high-performance blockchain
- **Decibel DEX** - For the fast decentralized exchange
- **OpenRouter** - For AI model access
- **Photon** - For identity and rewards infrastructure

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

**Built with ❤️ for the Aptos Hackathon**

