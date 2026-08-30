#!/usr/bin/env bash
# Manual smoke test against a running production build (see README). Not part of the test suite.
set -euo pipefail
B=${BASE_URL:-http://127.0.0.1:4100}
JSON='content-type: application/json'

reg() { curl -sf -XPOST "$B/api/auth/register" -H "$JSON" -d "{\"name\":\"$1\",\"email\":\"$2\",\"password\":\"password123\"}" >/dev/null; }
tok() { curl -sf -XPOST "$B/api/auth/login" -H "$JSON" -d "{\"email\":\"$1\",\"password\":\"password123\"}" | jq -r .token; }

E1="smoke$RANDOM@example.com"; reg A "$E1"; T1=$(tok "$E1")
A1=$(curl -sf -XPOST "$B/api/accounts" -H "authorization: Bearer $T1" | jq -r .account.accountNumber)
E2="smoke$RANDOM-b@example.com"; reg B "$E2"; T2=$(tok "$E2")
A2=$(curl -sf -XPOST "$B/api/accounts" -H "authorization: Bearer $T2" | jq -r .account.accountNumber)

echo "health                 $(curl -s -o /dev/null -w '%{http_code}' "$B/api/health")"
echo "deposit balance        $(curl -s -XPOST "$B/api/transactions/deposit" -H "authorization: Bearer $T1" -H "$JSON" -d '{"amount":100}' | jq -r .balance)"
echo "withdraw balance       $(curl -s -XPOST "$B/api/transactions/withdraw" -H "authorization: Bearer $T1" -H "$JSON" -d '{"amount":30}' | jq -r .balance)"
echo "overdraft status       $(curl -s -o /dev/null -w '%{http_code}' -XPOST "$B/api/transactions/withdraw" -H "authorization: Bearer $T1" -H "$JSON" -d '{"amount":9999}')"
echo "transfer balance       $(curl -s -XPOST "$B/api/transactions/transfer" -H "authorization: Bearer $T1" -H "$JSON" -d "{\"toAccountNumber\":\"$A2\",\"amount\":20}" | jq -r .balance)"
echo "self-transfer status   $(curl -s -o /dev/null -w '%{http_code}' -XPOST "$B/api/transactions/transfer" -H "authorization: Bearer $T1" -H "$JSON" -d "{\"toAccountNumber\":\"$A1\",\"amount\":1}")"
echo "unknown dest status    $(curl -s -o /dev/null -w '%{http_code}' -XPOST "$B/api/transactions/transfer" -H "authorization: Bearer $T1" -H "$JSON" -d '{"toAccountNumber":"000000000000","amount":1}')"
echo "recipient balance      $(curl -s "$B/api/accounts/me" -H "authorization: Bearer $T2" | jq -r .account.balance)"
echo "history count          $(curl -s "$B/api/transactions" -H "authorization: Bearer $T1" | jq '.transactions | length')"
echo "recipient history      $(curl -s "$B/api/transactions" -H "authorization: Bearer $T2" | jq '.transactions | length')"
echo "unauthenticated status $(curl -s -o /dev/null -w '%{http_code}' "$B/api/transactions")"
echo "malformed json status  $(curl -s -o /dev/null -w '%{http_code}' -XPOST "$B/api/auth/login" -H "$JSON" -d '{')"
echo "password hash leak     $(curl -s "$B/api/auth/me" -H "authorization: Bearer $T1" | grep -c passwordHash || true)"
