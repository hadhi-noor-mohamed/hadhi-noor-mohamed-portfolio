import type { SessionUser } from '../services/auth.js';

declare global {
  namespace Express {
    interface Request {
      /** Populated by the `attachSession` middleware when a valid session exists. */
      user?: SessionUser;
      sessionId?: string;
      csrfToken?: string;
    }
  }
}

export {};
