import type { Role } from "../middleware/rbac.js";

declare global {
  namespace Express {
    interface User {
      id: string;
      roles: Role[];
      email: string;
      sessionId?: string;
    }

    interface Request {
      user?: User;
    }
  }
}

export {};
