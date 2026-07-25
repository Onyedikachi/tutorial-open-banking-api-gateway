import type { Request } from 'express';

/**
 * req.path/req.url reflect the current mount point, not the original
 * request - and NestJS's `forRoutes('*path')` wildcard middleware
 * mounting means req.path inside this app's middlewares comes back as
 * just "/" (the wildcard consumes the whole path as the "mount prefix").
 * req.originalUrl is unaffected by mounting and always has the real path,
 * so route-catalog matching must use this instead of req.path.
 */
export function requestPath(req: Request): string {
  return req.originalUrl.split('?')[0];
}
