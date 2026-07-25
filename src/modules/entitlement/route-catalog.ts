/**
 * The gateway's "API product catalog" (IBM APIC/Azure APIM terms): which
 * published operations exist, which CBN access-rule category ("product")
 * governs each, and whether it needs a Bearer token. Everything reaching
 * gateway-app that doesn't match a rule here is rejected with 404 - the
 * gateway only proxies what it explicitly publishes, it isn't a blind
 * pass-through.
 *
 * MIT (Merchant Initiated Transaction) is a recognized CBN access-rule
 * category with no live endpoint in tutorial-open-api yet, so it's
 * intentionally absent here rather than inventing one.
 */
export type Product = 'PIST' | 'PIFT' | 'PAST';

export const PRODUCT_ACCESS_RULE: Record<Product, string> = {
  PIST: 'pist_access',
  PIFT: 'pift_access',
  PAST: 'past_access',
};

// Requests per minute, per clientId + product. Chosen to be obviously
// demonstrable (trip the limit with a handful of requests) rather than
// production-tuned.
export const PRODUCT_RATE_LIMIT: Record<Product | 'default', number> = {
  PIST: 30,
  PIFT: 10,
  PAST: 60,
  default: 20,
};

export interface RouteRule {
  method: string;
  pattern: RegExp;
  product?: Product;
  requireBearer: boolean;
}

export const ROUTE_RULES: RouteRule[] = [
  // Token exchange: the TPP backend authenticates via mTLS + its
  // client_secret in the body, not a Bearer token (it doesn't have one yet).
  { method: 'POST', pattern: /^\/auth\/token$/, requireBearer: false },

  { method: 'POST', pattern: /^\/payments$/, product: 'PIST', requireBearer: true },
  { method: 'GET', pattern: /^\/payments\/[^/]+\/status$/, product: 'PIST', requireBearer: true },
  { method: 'POST', pattern: /^\/payments\/[^/]+\/reverse$/, product: 'PIST', requireBearer: true },
  { method: 'POST', pattern: /^\/payments\/pift\/schedule$/, product: 'PIFT', requireBearer: true },
  {
    method: 'GET',
    pattern: /^\/past\/accounts\/[^/]+\/statement$/,
    product: 'PAST',
    requireBearer: true,
  },
];

export function matchRoute(method: string, path: string): RouteRule | undefined {
  return ROUTE_RULES.find((r) => r.method === method && r.pattern.test(path));
}
