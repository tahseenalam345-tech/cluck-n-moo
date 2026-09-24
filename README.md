# Cluck N Moo (CNM)

A modern full-stack web application, online ordering platform, and operations management system for Cluck N Moo restaurant in Kharian, Pakistan. Built with Next.js, React 19, TypeScript, Tailwind/Vanilla CSS, SQLite (WAL mode), and Cloudinary.

---

## Features

- **Storefront & Menu Navigation**: Dynamic artisan round pizzas, smash burgers, zinger burgers, sides, drinks, and custom value deals.
- **Custom Deal Builder**: Interactive step-by-step combo and deal selection with live pricing updates.
- **Online Checkout & Order Tracker**: Real-time order status tracking with automated status progression and WhatsApp confirmation integration.
- **Kitchen & Admin Panels**: Role-based access control for kitchen display and order status management.
- **High-Performance Database**: Local zero-dependency SQLite architecture using Node.js `node:sqlite` in WAL mode with atomic transactions.
- **Optimized Media Delivery**: Cloudinary CDN integration for automated WebP/AVIF compression and responsive image delivery.

---

## Local Setup Overview

### Prerequisites

- **Node.js**: v22.x or later (recommended for native `node:sqlite` support)
- **npm**: v10.x or later
- **Git**

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/tahseenalam345-tech/cluck-n-moo.git
   cd cluck-n-moo
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Copy the example environment configuration file to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   Populate the variables with your local or staging credentials (see below).

4. **Initialize and Seed the Database:**
   ```bash
   npm run db:seed
   ```

5. **Start Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Required Environment Variables

Configure these variables in your private `.env.local` file. **Never commit `.env.local` to version control.**

| Variable Name | Description | Environment |
|---|---|---|
| `JWT_SECRET` | Secret key used for signing and verifying JWT authentication tokens | Server-side only |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud identifier for media storage and synchronization | Server-side only |
| `CLOUDINARY_API_KEY` | Cloudinary access API key for asset sync operations | Server-side only |
| `CLOUDINARY_API_SECRET` | Cloudinary access API secret for asset sync operations | Server-side only |
| `CLOUDINARY_URL` | Full Cloudinary connection string (optional convenience format) | Server-side only |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Cloud identifier exposed to the browser for CDN image delivery URLs | Client-side & Server-side |

---

## Available Scripts

- `npm run dev`: Starts the Next.js development server on port 3000.
- `npm run build`: Compiles and builds the production Next.js application.
- `npm run start`: Runs the built Next.js production server.
- `npm run lint`: Runs ESLint checks.
- `npm run db:seed`: Initializes SQLite schema, executes migrations, and seeds baseline menu and user data.
- `npm run menu:import:dry-run`: Performs a dry-run check of the verified menu database import.
- `npm run menu:import`: Applies verified menu data into the active SQLite database.
- `npm run cloudinary:dry-run`: Discovers Cloudinary menu assets and reports mapping status without modifying database.
- `npm run cloudinary:sync`: Synchronizes mapped Cloudinary image URLs into the SQLite database.

---

## Documentation

Full architectural and operational guides are available in the [`docs/`](./docs) folder:

- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md): System architecture, database choice, state machines, and security boundary.
- [`docs/DATABASE_SCHEMA.md`](./docs/DATABASE_SCHEMA.md): Complete table specifications, foreign keys, indexes, and constraints.
- [`docs/CLOUDINARY_SYNC_SETUP.md`](./docs/CLOUDINARY_SYNC_SETUP.md): Image synchronization workflow and asset naming conventions.
- [`docs/UI_DESIGN_SYSTEM.md`](./docs/UI_DESIGN_SYSTEM.md): Visual hierarchy, typography, palette tokens, and component guidelines.

---

## License

Private and proprietary. All rights reserved.
