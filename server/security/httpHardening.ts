// CoachTactics — HTTP response hardening (no helmet dependency needed for this surface).
import type { Request, Response, NextFunction } from 'express';

export interface HardeningOptions {
  isProd: boolean;
  frameAncestors: string;
}

export function securityHeaders(opts: HardeningOptions) {
  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    // Tailwind output is a static file; React style={{}} props need inline style attributes.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    ...(opts.frameAncestors ? [`frame-ancestors ${opts.frameAncestors}`] : []),
  ].join('; ');

  return (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'microphone=(self), camera=(), geolocation=(), payment=(), usb=()');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

    if (req.path.startsWith('/api/')) {
      res.setHeader('Cache-Control', 'no-store');
    }

    // CSP only in production: the Vite dev server injects inline HMR scripts.
    if (opts.isProd) {
      res.setHeader('Content-Security-Policy', csp);
      if (req.secure) {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      }
    }
    next();
  };
}
