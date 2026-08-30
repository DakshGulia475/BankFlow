# BankFlow

Banking transaction management system — an educational/portfolio prototype (not a real banking system).

## Stack

- Backend: Node.js, Express, TypeScript, MongoDB (Mongoose)
- Tests: Vitest + Supertest
- Frontend (later phase): React + Vite + TypeScript

## Architecture

A single Express application, layered so business rules live in one place:

```
routes  ->  middleware (requireAuth)  ->  controllers  ->  services  ->  models (Mongoose)
                                             |                              |
                                     validation utils            MongoDB (replica set)
                                             |
                                    ApiError -> errorHandler -> JSON error envelope
```

- **Routes** only wire paths to controllers and attach `requireAuth`.
- **Controllers** are thin: validate the request body, pull `req.user.id`, call a service, send JSON.
- **Services** (`auth`, `account`, `transaction`) own all business logic and are the only layer that touches models.
- **Errors** are thrown as `ApiError` anywhere and turned into one consistent envelope by the centralized `errorHandler`; unknown errors become a generic 500 with no internals.

### Authentication flow

1. `POST /api/auth/register` validates input, normalizes the email, hashes the password with bcrypt (10 rounds) and stores a `User` with `passwordHash`.
2. `POST /api/auth/login` looks up the user, compares the password with bcrypt and returns a JWT signed with `JWT_SECRET` (`sub` = user id, `JWT_EXPIRES_IN` lifetime). Unknown email and wrong password return the identical 401 so accounts cannot be enumerated.
3. `requireAuth` requires an `Authorization: Bearer <token>` header, verifies the token, reloads the user and attaches `{ id, name, email }` to `req.user`. Missing, malformed, expired or invalid tokens all get 401.
4. `passwordHash` is stripped in `User.toJSON` and services return explicit public shapes, so it is never serialized.

### Account model

One account per user: `Account.userId` is unique, so a second `POST /api/accounts` returns 409. Account numbers are 12 random digits generated with `crypto.randomInt` and checked against the unique index (retried a few times). Balance starts at 0. Every account lookup is keyed by the authenticated user's id or by account number for transfer destinations — there is no account-id route parameter, so one user's account can never be addressed by another.

### Transaction flow

| Operation | Steps |
| --------- | ----- |
| Deposit   | validate amount -> atomic `$inc` on own account -> write `DEPOSIT` record |
| Withdraw  | validate amount -> conditional atomic debit (`balance >= amount`) -> write `WITHDRAWAL` record |
| Transfer  | validate amount and destination, reject self-transfer -> conditional atomic debit of source -> atomic credit of destination -> write `TRANSFER` record with both account numbers |
| History   | transactions where the user's account number is source or destination, newest first |

Records carry a unique `referenceId` (`TXN-<uuid>`), type, amount, source/destination, status and timestamp.

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

`backend/scripts/smoke.sh` exercises the main flows over HTTP against an already running build (`BASE_URL`, default `http://127.0.0.1:4100`).

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

## Consistency, sessions and concurrency

Balances are never read into the application, checked, and written back later. Every balance change is a single conditional atomic update in MongoDB:

```js
// withdrawal / transfer debit — the balance check is part of the write
Account.findOneAndUpdate({ _id, balance: { $gte: amount } }, { $inc: { balance: -amount } })
```

If the account no longer has enough money when the write executes, the update matches nothing and the request fails with 422 instead of overdrawing. Two concurrent withdrawals therefore cannot both succeed against the same funds.

Each operation (balance change plus transaction record) runs inside one MongoDB session transaction, so a transfer either debits the source, credits the destination, and writes the record — or does none of those. Failed operations leave balances untouched.

### Known limitations (prototype)

- Monetary values use JavaScript floating point numbers rounded to cents, not integer minor units or `Decimal128`.
- MongoDB sessions require replica-set support; without it the operations are not atomic across documents.
- Failed operations return API errors and do not create `FAILED` transaction records.
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

Validation failures add a `details` array of `{ field, message }`. Status codes used:

| Status | When |
| ------ | ---- |
| 400 | invalid input, malformed JSON body, self-transfer |
| 401 | missing, malformed, expired or invalid token |
| 404 | account, destination account or route not found |
| 409 | duplicate email, second account for a user |
| 422 | insufficient balance |
| 503 | database unavailable, account number could not be allocated |

## Security notes

- Passwords are only stored as bcrypt hashes and never serialized.
- `JWT_SECRET` and `MONGODB_URI` come from the environment; production start-up fails if they are missing, and `.env` is gitignored (only `.env.example` is committed).
- Every endpoint except `/api/health` and the two auth endpoints requires a valid JWT, and all resources are resolved from the token's user id.
- Request bodies are capped at 10 kb and transaction amounts must be finite, positive, at most two decimal places and below a maximum.

## Project structure

```
backend/
  src/
    config/      env + mongoose connection
    controllers/
    middleware/  centralized error handling
    models/      User, Account, Transaction
    routes/      health, auth, accounts, transactions
    services/
    utils/       ApiError
    app.ts
    server.ts
  tests/
```
