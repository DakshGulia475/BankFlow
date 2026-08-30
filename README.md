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

Requires a running MongoDB instance reachable at `MONGODB_URI`. Transfers use MongoDB multi-document transactions, which need a replica set — a single-node one is enough:

```bash
# /etc/mongod.conf
replication:
  replSetName: rs0
# then, once: rs.initiate()
```

On a standalone server the API still works, but transfers fall back to non-atomic sequential updates (see Consistency below).

## Tests

```bash
cd backend
npm test    # Vitest + Supertest, needs a local MongoDB
```

Tests use `TEST_MONGODB_URI` (default `mongodb://127.0.0.1:27017/bankflow_test?replicaSet=rs0`) and drop that database when the run finishes.

## Endpoints

| Method | Path                 | Auth   | Description                     |
| ------ | -------------------- | ------ | ------------------------------- |
| GET    | `/api/health`        | no     | Service + database health       |
| POST   | `/api/auth/register` | no     | Create a user                   |
| POST   | `/api/auth/login`    | no     | Exchange credentials for a JWT  |
| GET    | `/api/auth/me`       | Bearer | Current authenticated user      |
| POST   | `/api/accounts`      | Bearer | Create the user's account       |
| GET    | `/api/accounts/me`   | Bearer | Retrieve the user's account     |
| POST   | `/api/transactions/deposit`  | Bearer | Deposit into own account |
| POST   | `/api/transactions/withdraw` | Bearer | Withdraw from own account |
| POST   | `/api/transactions/transfer` | Bearer | Transfer to another account |
| GET    | `/api/transactions`  | Bearer | Own transaction history, newest first |

One account per user: `Account.userId` is unique, so a second `POST /api/accounts` returns 409.

## Consistency and concurrency

Balances are never read into the application, checked, and written back later. Every balance change is a single conditional atomic update in MongoDB:

```js
// withdrawal / transfer debit — the balance check is part of the write
Account.findOneAndUpdate({ _id, balance: { $gte: amount } }, { $inc: { balance: -amount } })
```

If the account no longer has enough money when the write executes, the update matches nothing and the request fails with 422 instead of overdrawing. Two concurrent withdrawals therefore cannot both succeed against the same funds.

Each operation (balance change plus transaction record) runs inside one MongoDB session transaction, so a transfer either debits the source, credits the destination, and writes the record — or does none of those. Failed operations leave balances untouched.

Limitations:

- Multi-document transactions require a replica set. On a standalone `mongod` the service detects this and runs the same operations without a session: individual balance updates stay atomic, but a crash between the debit and the credit could leave a transfer half-applied. Run a replica set for the atomic behaviour.
- Balances are stored as floating point numbers rounded to cents after each `$inc`. A production system would use integer minor units or `Decimal128`.
- Transaction records are only written for successful operations; failures are surfaced as API errors rather than `FAILED` rows.

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
