import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

// xCRM DB role values
export type UserRole =
  | 'SYSTEM_ADMIN'    // alias for ADMIN in some setups
  | 'ADMIN'
  | 'SALES_MANAGER'
  | 'MANAGER'
  | 'SALES_REP'
  | 'REP'
  | 'PRODUCTION_MANAGER'
  | 'PRODUCT_MANAGER';

export interface AuthPayload extends JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
}

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  return new TextEncoder().encode(secret);
}

/** Sign a new auth-token JWT (24h expiry). */
export async function signToken(payload: Omit<AuthPayload, keyof JWTPayload>): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(getSecret());
}

/**
 * Verify an auth-token JWT.
 * Returns the decoded payload or null if invalid / expired.
 * Safe to call from Edge (middleware) and Node.js (API routes).
 */
export async function verifyToken(token: string): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as AuthPayload;
  } catch {
    return null;
  }
}

/** Role hierarchy helpers */
export const ROLE_WEIGHTS: Record<UserRole, number> = {
  SYSTEM_ADMIN: 100, ADMIN: 100,
  SALES_MANAGER: 60, MANAGER: 60,
  PRODUCTION_MANAGER: 50, PRODUCT_MANAGER: 50,
  SALES_REP: 30, REP: 30,
};

export function hasRole(userRole: UserRole, ...allowed: UserRole[]): boolean {
  return allowed.includes(userRole);
}
