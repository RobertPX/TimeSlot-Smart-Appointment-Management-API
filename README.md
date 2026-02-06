# TimeSlot API

**Backend REST API for intelligent appointment scheduling and management.**

Built as a production-ready service for managing professional appointments, availability slots, and user roles with strict business rules, transactional safety, and clean architecture.

---

## Overview

TimeSlot is a backend-first API designed to solve a common real-world problem: coordinating schedules between service professionals and their clients without conflicts, double bookings, or manual intervention.

It models the kind of system a healthcare clinic, legal firm, consulting agency, or any appointment-based SaaS would need at its core. The focus is entirely on the backend layer: data integrity, access control, validation, and clean separation of concerns.

This is not a tutorial project. Every design decision reflects how a production backend should handle scheduling logic, from transactional writes to role-based access, to configurable business rules.

---

## Features

- **Authentication & Authorization** - JWT-based auth with access and refresh token flow. Passwords hashed with bcrypt (12 rounds). Three distinct roles: `ADMIN`, `PROFESSIONAL`, `CLIENT`, enforced at the guard level per endpoint.

- **Professional Availability Management** - Professionals define their weekly availability by day of week and time range. Overlapping availability slots for the same professional are rejected.

- **Appointment Booking with Conflict Detection** - Clients book appointments against a professional's availability. The system validates that the requested time falls within an available slot and that no confirmed appointment already occupies that range. Creation runs inside a database transaction to prevent race conditions.

- **Cancellation Rules** - Appointments can only be cancelled with a configurable minimum notice period (default: 24 hours). Only confirmed appointments can be cancelled, and only by the client or the professional involved.

- **Appointment Lifecycle** - Appointments follow a clear status flow: `CONFIRMED` -> `COMPLETED` or `CONFIRMED` -> `CANCELLED`. Only the assigned professional can mark an appointment as completed.

- **Input Validation & Error Handling** - All inputs are validated with `class-validator` and sanitized via `ValidationPipe` with `whitelist` and `forbidNonWhitelisted` enabled. A global exception filter ensures consistent error response format across the entire API.

- **Rate Limiting** - Global throttling at 30 requests per minute per IP via `@nestjs/throttler`.

- **Structured Logging** - HTTP request logging interceptor tracks method, route, status code, and response time for every request.

---

## Architecture & Design

The project follows a modular layered architecture, standard in NestJS applications, with clear separation between transport, business logic, and data access.

```
src/
├── auth/              # Authentication: register, login, refresh, JWT strategy, guards
│   ├── dto/           # Request validation schemas
│   ├── guards/        # JwtAuthGuard, RolesGuard
│   └── strategies/    # Passport JWT strategy
├── users/             # User profile management
├── professionals/     # Professional profile and specialty management
│   └── dto/
├── availability/      # Weekly availability slot management
│   └── dto/
├── appointments/      # Appointment booking, cancellation, completion
│   └── dto/
├── common/
│   ├── filters/       # Global exception filter
│   ├── interceptors/  # Logging interceptor
│   └── decorators/    # @CurrentUser, @Roles
├── prisma/            # Database service (global module)
├── app.module.ts      # Root module with throttling configuration
├── main.ts            # Application bootstrap (local)
└── serverless.ts      # Serverless entry point (Vercel)
```

**Design principles applied:**

- **Single Responsibility** - Each module handles one domain. Services contain business logic. Controllers handle HTTP concerns only.
- **Dependency Injection** - All services injected through NestJS DI container. Prisma is registered as a global module to avoid redundant imports.
- **Transactional Integrity** - Appointment creation uses Prisma `$transaction` to ensure atomicity when checking for conflicts and writing the new record.
- **Guard-based Authorization** - Role checks happen at the decorator level, not buried inside service logic.

---

## Tech Stack

| Layer            | Technology                          |
|------------------|-------------------------------------|
| Runtime          | Node.js 20+                        |
| Framework        | NestJS 11                           |
| Language         | TypeScript                          |
| Database         | PostgreSQL (Neon for production)    |
| ORM              | Prisma 7                            |
| Authentication   | JWT (access + refresh), bcrypt      |
| Validation       | class-validator, class-transformer  |
| Documentation    | Swagger / OpenAPI                   |
| Rate Limiting    | @nestjs/throttler                   |
| Testing          | Jest                                |
| Deployment       | Vercel (serverless)                 |

---

## API Endpoints

### Authentication

| Method | Route                | Auth | Description              |
|--------|----------------------|------|--------------------------|
| POST   | `/api/auth/register` | No   | Register a new user      |
| POST   | `/api/auth/login`    | No   | Login and receive tokens |
| POST   | `/api/auth/refresh`  | No   | Refresh access token     |

### Users

| Method | Route             | Auth | Role  | Description            |
|--------|-------------------|------|-------|------------------------|
| GET    | `/api/users`      | Yes  | ADMIN | List all users         |
| GET    | `/api/users/me`   | Yes  | Any   | Get own profile        |
| GET    | `/api/users/:id`  | Yes  | ADMIN | Get user by ID         |

### Professionals

| Method | Route                     | Auth | Role  | Description                      |
|--------|---------------------------|------|-------|----------------------------------|
| POST   | `/api/professionals`      | Yes  | ADMIN | Create professional profile      |
| GET    | `/api/professionals`      | No   | -     | List active professionals        |
| GET    | `/api/professionals/:id`  | No   | -     | Get professional with availability |

### Availability

| Method | Route                                    | Auth | Role         | Description               |
|--------|------------------------------------------|------|--------------|---------------------------|
| POST   | `/api/availability`                      | Yes  | PROFESSIONAL | Create availability slot  |
| GET    | `/api/availability/:professionalId`      | No   | -            | Get professional schedule |
| DELETE | `/api/availability/:id`                  | Yes  | PROFESSIONAL | Remove availability slot  |

### Appointments

| Method | Route                              | Auth | Role         | Description              |
|--------|------------------------------------|------|--------------|--------------------------|
| POST   | `/api/appointments`                | Yes  | CLIENT       | Book an appointment      |
| GET    | `/api/appointments/my`             | Yes  | Any          | Get own appointments     |
| DELETE | `/api/appointments/:id`            | Yes  | Any          | Cancel an appointment    |
| PATCH  | `/api/appointments/:id/complete`   | Yes  | PROFESSIONAL | Mark as completed        |

---

## Environment Variables

Create a `.env` file in the project root. Reference `.env.example` for the required variables:

```env
# Database connection string
DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"

# JWT configuration
JWT_SECRET="your-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret-key"
JWT_EXPIRATION="15m"
JWT_REFRESH_EXPIRATION="7d"

# Business rules
MIN_CANCEL_HOURS=24

# Server
PORT=3001
NODE_ENV=development
```

---

## Local Setup

### Prerequisites

- Node.js 20+
- PostgreSQL (local via Docker, or a cloud provider like Neon)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd timeslot

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database URL and secrets
```

### Database

```bash
# Option A: Local PostgreSQL with Docker
docker compose up -d

# Option B: Cloud PostgreSQL (Neon, Supabase, Railway)
# Just set your DATABASE_URL in .env
```

### Migrations & Start

```bash
# Generate Prisma client and apply migrations
npx prisma generate
npx prisma migrate dev --name init

# Start development server
npm run start:dev
```

The API will be available at `http://localhost:3001/api`.

### Running Tests

```bash
npm test
```

---

## Deployment

The API is deployed on **Vercel** as a serverless function, with **Neon** as the managed PostgreSQL provider.

The serverless entry point (`src/serverless.ts`) wraps the NestJS application with `@vendia/serverless-express` and caches the app instance between invocations to minimize cold starts.

Prisma automatically uses the Neon WebSocket adapter in production and the standard `pg` adapter for local development.

**Required Vercel environment variables:**

- `DATABASE_URL` - Neon connection string
- `JWT_SECRET` / `JWT_REFRESH_SECRET` - Token signing secrets
- `NODE_ENV` - Set to `production`

---

## Documentation

Interactive API documentation is available via **Swagger UI**:

- **Local:** `http://localhost:3001/docs`
- **Production:** `<your-vercel-url>/docs`

All endpoints are documented with request/response schemas, authentication requirements, and role restrictions.

---

## Testing

The project includes unit tests for the two most critical services:

**AuthService** (5 tests)
- Rejects duplicate email registration
- Registers new users and returns tokens
- Rejects invalid credentials on login
- Returns tokens on valid login

**AppointmentsService** (8 tests)
- Rejects invalid time ranges
- Rejects past dates
- Rejects inactive or missing professionals
- Rejects bookings outside availability
- Detects and rejects overlapping appointments
- Creates appointments when all validations pass
- Rejects cancellation of non-existent appointments
- Rejects cancellation of already cancelled appointments

```
Test Suites: 2 passed, 2 total
Tests:       13 passed, 13 total
```

---

## Project Status

The API is **functional and stable**. All core features are implemented, tested, and deployed.

**Potential future improvements:**

- Notification system (email/SMS via queues)
- Pagination with cursor-based approach for large datasets
- Admin dashboard endpoints (statistics, audit logs)
- Multi-tenant support with organization-level isolation
- CI/CD pipeline with GitHub Actions

---

## Author

**Robert**
Backend Developer

- GitHub: [github.com/your-username](https://github.com/your-username)
- LinkedIn: [linkedin.com/in/your-profile](https://linkedin.com/in/your-profile)
