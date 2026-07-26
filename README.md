# cSocial

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white&style=for-the-badge)
![React Native](https://img.shields.io/badge/React_Native-20232A?logo=react&logoColor=61DAFB&style=for-the-badge)
![Expo](https://img.shields.io/badge/Expo-000020?logo=expo&logoColor=white&style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white&style=for-the-badge)
![Express](https://img.shields.io/badge/Express-000000?logo=express&logoColor=white&style=for-the-badge)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white&style=for-the-badge)
![Redis](https://img.shields.io/badge/Redis-FF4438?logo=redis&logoColor=white&style=for-the-badge)
![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white&style=for-the-badge)

## About

**cSocial** is a production-quality social platform for boulder climbers — Strava for climbing. Built with **React Native** and **Expo** on mobile and a **Node.js/Express** backend backed by **PostgreSQL** and **Redis**, it lets climbers log every send, track grade progression, compete on leaderboards, and follow friends through a chronological social feed.

## Features

- Climb logging with grade, result, attempts, and media uploads
- Auto-generated grade pyramid showing sends, flashes, and attempts per grade
- 365-day GitHub-style activity heatmap and climbing calendar
- Proprietary Climber Rating combining hardest sends, flash rate, volume, consistency, and recent activity
- Chronological social feed of friend sends with no algorithmic ranking
- Global, gym, and friends leaderboards across multiple metrics
- 25+ achievements rewarding milestones, grade breakthroughs, and streaks
- Route database with community stats, beta, ratings, and per-route leaderboards

## Technology Stack

- **Mobile**: React Native, Expo, Expo Router, TanStack Query, Zustand
- **Backend**: Node.js, TypeScript, Express.js, Prisma ORM
- **Database**: PostgreSQL 16, Redis 7
- **Auth**: JWT, Zod validation
- **Infrastructure**: Docker Compose
