# cSocial — The Climbing Community Platform

> **"Strava for climbing."** Log every boulder, track your progression, compete with friends, and build a verified climbing profile.

---

## What is cSocial?

cSocial is a **production-quality social platform for boulder climbers**. It's a climbing log first — the social experience grows naturally from real climbing data.

Every feature answers one question: **Does this make climbers want to climb more?**

### Core Features

| Feature | Description |
|---------|-------------|
| **Climb Logging** | Log every boulder with grade, result, attempts, photos & video |
| **Grade Pyramid** | Auto-generated pyramid showing sends, flashes & attempts per grade |
| **Climbing Calendar** | 365-day GitHub-style heatmap of your climbing activity |
| **Climber Rating** | Proprietary score combining hardest sends, flash rate, consistency & improvement |
| **Social Feed** | Chronological feed of friend sends — no algorithm, no rage bait |
| **Leaderboards** | Friends, gym, and global rankings across 5+ metrics |
| **Achievements** | 25+ achievements rewarding consistency, improvement, and effort |
| **XP & Levels** | Earn XP for climbing — never for buying or spam |
| **Route Database** | Every gym route with community stats, beta, ratings & leaderboards |
| **Gym Discovery** | Find gyms near you with active routes and community |
| **Challenges** | Weekly and monthly challenges to stay motivated |
| **Verification** | Video, friend, and community route verification |

---

## Tech Stack

### Backend
| Technology | Purpose |
|-----------|---------|
| Node.js + TypeScript | Server runtime |
| Express.js | HTTP framework |
| Prisma ORM | Database access |
| PostgreSQL 16 | Primary database |
| Redis 7 | Caching & sessions |
| JWT | Authentication |
| Zod | Input validation |
| Multer | File uploads |

### Mobile
| Technology | Purpose |
|-----------|---------|
| React Native + Expo | Cross-platform mobile |
| TypeScript | Type safety |
| Expo Router | File-based navigation |
| TanStack Query | Server state & caching |
| Zustand | Client state |
| Expo Secure Store | Token storage |
| Expo Image | Optimized images |

---

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL 16
- Redis 7
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator or Android Emulator (or Expo Go app)

### Quickstart (Docker)

```bash
git clone https://github.com/aprameyak/csocial.git
cd csocial

# Start PostgreSQL + Redis
npm run docker:up

# Setup & seed database
cd backend
npm install
cp .env.example .env        # Edit DB/Redis URLs if needed
npm run db:migrate
npm run db:seed

# Start API server
npm run dev
```

In a new terminal:

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with Expo Go, or press `i` for iOS / `a` for Android.

**Demo credentials:**
- Email: `demo@csocial.app`
- Password: `Demo1234!`

---

## Project Structure

```
csocial/
├── backend/                    # Node.js API
│   ├── prisma/
│   │   ├── schema.prisma       # Full database schema (15 models)
│   │   └── seed.ts             # Sample data + achievements
│   ├── src/
│   │   ├── config/             # DB, Redis, env validation
│   │   ├── middleware/         # Auth, validation, rate limiting
│   │   ├── routes/             # API route handlers (12 modules)
│   │   ├── services/           # Business logic layer
│   │   ├── types/              # TypeScript types
│   │   └── utils/              # JWT, XP, climber rating
│   └── index.ts                # Express server entry point
│
├── mobile/                     # React Native app
│   ├── app/
│   │   ├── (auth)/             # Login, Register, Forgot Password
│   │   ├── (tabs)/             # Feed, Discover, Log, Leaderboard, Profile
│   │   ├── climb/[id].tsx      # Climb detail + comments
│   │   ├── route/[id].tsx      # Route detail + beta + leaderboard
│   │   ├── gym/[id].tsx        # Gym detail + routes + leaderboard
│   │   ├── profile/[id].tsx    # User profile + stats + pyramid
│   │   ├── notifications.tsx   # Notification center
│   │   └── settings/           # Profile edit, privacy, account
│   └── src/
│       ├── components/         # Reusable UI components
│       ├── constants/          # Theme (colors, spacing, fonts)
│       ├── services/           # Typed API client
│       ├── store/              # Zustand auth store
│       ├── types/              # API type definitions
│       └── utils/              # Formatting, grade utilities
│
├── docker-compose.yml          # PostgreSQL + Redis
└── package.json                # Workspace root
```

---

## API Documentation

See [backend/API.md](backend/API.md) for the full endpoint reference.

**Base URL:** `http://localhost:3000/api/v1`

**Authentication:** JWT Bearer tokens (`Authorization: Bearer <token>`)

### Key Endpoints

```
POST   /auth/register          Create account
POST   /auth/login             Authenticate
GET    /users/me               Own profile
GET    /users/:id/grade-pyramid Grade pyramid
GET    /feed                   Social feed
POST   /climbs                 Log a climb
GET    /leaderboards/global    Global rankings
GET    /leaderboards/friends   Friend rankings
GET    /gyms?q=...             Search gyms
GET    /search?q=...           Unified search
```

---

## Database Schema

15 Prisma models:

`User` `Gym` `Wall` `Route` `Climb` `Session` `Media` `Achievement` `UserAchievement` `Follow` `Comment` `Like` `Congratulation` `Rating` `Notification` `Challenge` `UserChallenge` `RefreshToken` `CheckIn`

---

## Climber Rating Algorithm

The proprietary **Climber Rating** combines:

| Component | Weight | Description |
|-----------|--------|-------------|
| Hardest Sends | 40% | Top 10 sends with exponential grade weighting |
| Flash Rate | 15% | % of sends completed on first attempt |
| Volume | 15% | Log-weighted total sends |
| Consistency | 10% | Sessions per 90 days |
| Grade Diversity | 5% | Spread across grade levels |
| Recent Activity | 5% | Decay bonus for recent climbs |
| Improvement | 10% | Grade progression over 90 days |

The score is NOT just "hardest grade" — it rewards well-rounded, consistent climbers.

---

## Achievement Categories

- **Milestone:** First Send, 10/50/100/500/1000 Sends
- **Grade:** First V3/V5/V7/V8/V10/V12
- **Flash:** First Flash, Flash Machine, Flash V7+
- **Streak:** 7 Day, 30 Day, 100 Day Streak
- **Session:** 10/100 Sessions
- **Style:** Roof Master, Slab Specialist
- **Project:** Project Crusher (10+ attempt send)
- **Social:** Traveler (5 gyms)

---

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

*Built for climbers, by climbers. Send hard. Log everything.*
