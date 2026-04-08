# Tools Act — Equipment Rental Management System

A complete equipment rental management system for Tools Act trading company. Covers the full rental lifecycle from order receipt to closure, with 4 roles, inspection checklists, maintenance logs, PDF document generation, and a universal audit log.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **API** | Node.js · Fastify 5 · TypeScript |
| **Frontend** | Next.js 16 · React 19 · TypeScript |
| **Database** | PostgreSQL (Neon cloud / local) |
| **ORM** | Prisma 6 |
| **Auth** | JWT (8-hour sessions) |
| **UI** | Tailwind CSS v4 · shadcn/ui |
| **PDF** | PDFKit |
| **Package Manager** | pnpm (workspace) |

---

## Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9 (`npm install -g pnpm`)
- PostgreSQL (local) **or** a [Neon](https://neon.tech) / [Supabase](https://supabase.com) connection string

---

## Quick Start

### 1. Clone and install

```bash
git clone <repo>
cd rental
pnpm install
```

### 2. Configure environment

**API** (`apps/api/.env`):
```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/toolsact"
JWT_SECRET="your-secret-min-16-chars"
PORT=3001
HOST=0.0.0.0
NODE_ENV=development
UPLOADS_DIR=./uploads
CORS_ORIGIN=http://localhost:3000
```

**Web** (`apps/web/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 3. Set up database

```bash
# Run migrations
pnpm db:migrate

# Seed with demo data (4 users, 10 equipment, 3 customers, 5 rentals)
pnpm db:seed
```

### 4. Start development servers

```bash
# Start API (port 3001) + Web (port 3000) concurrently
pnpm dev:api   # Terminal 1
pnpm dev:web   # Terminal 2
```

Open [http://localhost:3000](http://localhost:3000)

---

## Demo Credentials

| Role | Email | Password |
|---|---|---|
| **Manager** | manager@toolsact.com | manager123 |
| **Admin** | admin@toolsact.com | admin123 |
| **Sales** | sales@toolsact.com | sales123 |
| **Service** | service@toolsact.com | service123 |

---

## Role Permissions

| Action | Manager | Admin | Sales | Service |
|---|:---:|:---:|:---:|:---:|
| Approve / transition order | ✅ | ✅ | ❌ | ❌ |
| Create rental order | ✅ | ✅ | ✅ | ❌ |
| Edit customer / job site | ✅ | ✅ | ✅ | ❌ |
| Add / edit equipment | ✅ | ✅ | ❌ | ❌ |
| Create inspection report | ✅ | ❌ | ❌ | ✅ |
| Log maintenance visit | ✅ | ✅ | ❌ | ✅ |
| Generate PDF documents | ✅ | ✅ | ❌ | ❌ |
| Close rental | ✅ | ✅ | ❌ | ❌ |
| View audit log | ✅ | ✅ | ❌ | ❌ |
| Manage users | ✅ | ❌ | ❌ | ❌ |

---

## Rental Workflow (6 Phases)

```
ORDER_RECEIVED → PREPARING → DELIVERED → ACTIVE → RETURNING → CLOSED
       ↓               ↓           ↓          ↓           ↓
   CANCELLED       CANCELLED   CANCELLED  CANCELLED  (terminal)
```

Status transitions are enforced server-side. No phase can be skipped.

---

## API Reference

Base URL: `http://localhost:3001/api/v1`

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/login` | Login, returns JWT |
| GET | `/auth/me` | Current user |
| GET | `/rentals` | List rentals (role-filtered) |
| POST | `/rentals` | Create rental |
| GET | `/rentals/:id` | Rental detail |
| PUT | `/rentals/:id` | Update rental |
| POST | `/rentals/:id/transition` | Change status |
| POST | `/rentals/:id/swap-equipment` | Replace equipment |
| GET | `/rentals/:id/timeline` | Audit timeline |
| POST | `/rentals/:id/documents` | Generate PDF |
| GET/POST | `/rentals/:id/inspections` | Inspection reports |
| GET/POST | `/rentals/:id/maintenance` | Maintenance logs |
| GET/POST | `/equipment` | Equipment CRUD |
| POST | `/equipment/:id/photos` | Upload photo |
| GET/POST | `/customers` | Customer CRUD |
| GET/POST | `/customers/:id/job-sites` | Job site CRUD |
| GET | `/dashboard` | Role-specific KPIs |
| GET | `/reports/rental-summary` | Rental report |
| GET | `/reports/equipment-usage` | Equipment report |
| GET | `/reports/customers` | Customer report |
| GET | `/audit-logs` | Audit log viewer |
| GET/POST | `/users` | User management |

All responses: `{ success: boolean, data: T, meta: object | null }`

---

## Key Scripts

```bash
pnpm dev:api          # Start API dev server
pnpm dev:web          # Start Web dev server
pnpm build:api        # Build API for production
pnpm build:web        # Build Web for production
pnpm db:migrate       # Run Prisma migrations
pnpm db:seed          # Seed database with demo data
pnpm db:studio        # Open Prisma Studio
```

---

## Project Structure

```
rental/
├── apps/
│   ├── api/                    # Fastify REST API
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # Database schema
│   │   │   ├── migrations/     # Migration files
│   │   │   └── seed.ts         # Seed script
│   │   └── src/
│   │       ├── routes/         # API route handlers
│   │       ├── services/       # Business logic
│   │       ├── plugins/        # Fastify plugins (auth, audit, prisma)
│   │       ├── hooks/          # authenticate + authorize hooks
│   │       └── lib/pdf/        # PDF templates (PDFKit)
│   └── web/                    # Next.js frontend
│       ├── app/
│       │   ├── (auth)/         # Login page
│       │   └── (app)/          # Protected pages
│       │       ├── dashboard/
│       │       ├── rentals/
│       │       │   └── [id]/
│       │       │       └── inspections/   # Inspection forms
│       │       ├── equipment/
│       │       ├── customers/
│       │       ├── reports/
│       │       ├── audit-logs/
│       │       └── users/
│       ├── components/         # Reusable React components
│       ├── hooks/              # React Query hooks
│       ├── lib/                # API client, utils
│       └── providers/          # Auth, Query providers
└── packages/
    └── shared/                 # Shared TypeScript types & constants
        └── src/
            ├── types/          # Enums + interfaces
            └── constants/      # Status transitions, labels, permissions
```

---

## Production Deployment

### Vercel (Web) + Railway/Render (API)

1. **Database:** Create a [Neon](https://neon.tech) PostgreSQL instance
2. **API:** Deploy `apps/api` to Railway or Render
   - Set `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`, `CORS_ORIGIN=<vercel-url>`
3. **Web:** Deploy `apps/web` to Vercel
   - Set `NEXT_PUBLIC_API_URL=<api-url>`

### Environment Variables Summary

| Variable | Where | Description |
|---|---|---|
| `DATABASE_URL` | API | PostgreSQL connection string |
| `JWT_SECRET` | API | Min 32-char random string |
| `PORT` | API | Default 3001 |
| `CORS_ORIGIN` | API | Frontend URL |
| `UPLOADS_DIR` | API | File upload directory |
| `NEXT_PUBLIC_API_URL` | Web | API base URL |
