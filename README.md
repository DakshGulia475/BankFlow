# BankFlow

Banking transaction management system — an educational/portfolio prototype (not a real banking system).

## Stack

- Backend: Node.js, Express, TypeScript, MongoDB (Mongoose)
- Tests: Vitest + Supertest
- Frontend (later phase): React + Vite + TypeScript

## Backend setup

```bash
cd backend
npm install
cp .env.example .env   # then edit values
npm run dev            # tsx watch on src/server.ts
```

Other scripts: `npm run build`, `npm run typecheck`, `npm start`, `npm test`.

Requires a running MongoDB instance reachable at `MONGODB_URI`.

## Tests

```bash
cd backend
npm test    # Vitest + Supertest, needs a local MongoDB
```

Tests use `TEST_MONGODB_URI` (default `mongodb://127.0.0.1:27017/bankflow_test`) and drop that database when the run finishes.

## Endpoints

| Method | Path                 | Auth   | Description                     |
| ------ | -------------------- | ------ | ------------------------------- |
| GET    | `/api/health`        | no     | Service + database health       |
| POST   | `/api/auth/register` | no     | Create a user                   |
| POST   | `/api/auth/login`    | no     | Exchange credentials for a JWT  |
| GET    | `/api/auth/me`       | Bearer | Current authenticated user      |
| POST   | `/api/accounts`      | Bearer | Create the user's account       |
| GET    | `/api/accounts/me`   | Bearer | Retrieve the user's account     |

One account per user: `Account.userId` is unique, so a second `POST /api/accounts` returns 409.

## Health check

```
GET /api/health -> { "status": "ok", "database": "connected", "uptime": 12.3 }
```

Returns 503 when the database connection is not established.

## Error format

```json
{ "error": { "code": "NOT_FOUND", "message": "Route GET /api/nope not found" } }
```

## Project structure

```
backend/
  src/
    config/      env + mongoose connection
    controllers/
    middleware/  centralized error handling
    models/      User, Account, Transaction
    routes/      health check (more in later phases)
    services/
    utils/       ApiError
    app.ts
    server.ts
  tests/
```
