# tutorial-open-banking-api-gateway

The bank's API gateway - simulates what IBM API Connect / Azure API
Management does in front of a real core banking API: mTLS termination,
OAuth2 bearer verification, product entitlement, rate limiting, and access
logging, in front of [tutorial-open-api](../tutorial-open-api).

```
TPP backend --mTLS--> nginx (:8443, TLS/mTLS termination)
                          |  X-SSL-Client-*, X-Gateway-Secret
                          v
                       gateway-app (:4000)
                          |  identity -> entitlement -> jwt verify -> rate limit -> access log
                          |  X-Internal-Gateway-Secret, X-TPP-Client-Id, X-TPP-Access-Rules
                          v
                       tutorial-open-api (:3000, internal routes only)
```

## What it actually enforces

- **Identity**: trusts nginx's mTLS verification (shared secret, fails
  closed) and resolves the certificate's CN against tutorial-open-api's
  registry (`GET /internal/registry/participants/:clientId`).
- **Entitlement**: the published route catalog (`src/modules/entitlement/route-catalog.ts`)
  maps each operation to a CBN "product" (PIST/PIFT/PAST); a TPP not
  entitled to a product gets 403, an unpublished route gets 404.
- **Bearer verification**: fetches and caches the bank's `/auth/jwks`,
  verifies the token's RS256 signature independently, and checks the
  token's `client_id` matches the mTLS certificate's identity
  (certificate-bound access token, per FAPI).
- **Rate limiting**: per clientId + product, fixed window in Redis.
- **Access logging**: one structured JSON line per request.

## Setup

```bash
./certs/generate-dev-certs.sh          # dev CA + server cert + TPP client certs
echo "MTLS_GATEWAY_SECRET=$(openssl rand -hex 32)" > .env
cp .env.example .env.local             # fill in INTERNAL_GATEWAY_SECRET (matches tutorial-open-api's) etc.

docker compose up -d                   # redis + nginx
npm install
npm run start:dev                      # gateway-app on :4000, behind nginx on :8443
```

## Testing it directly

```bash
curl --cacert certs/ca.crt --cert certs/client-acme-fintech.crt --key certs/client-acme-fintech.key \
     -X POST https://matls.openbanking.local:8443/payments \
     -H "Authorization: Bearer <token from tutorial-open-api /auth/token>" \
     -H "Content-Type: application/json" -H "Idempotency-Key: $(uuidgen)" \
     -d '{...}' \
     --resolve matls.openbanking.local:8443:127.0.0.1
```
