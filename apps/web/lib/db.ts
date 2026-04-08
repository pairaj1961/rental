import { Pool } from 'pg';

// Singleton pool — reused across hot-reloads in Next.js dev mode
const globalForPg = globalThis as unknown as { pgPool?: Pool };

export const pool: Pool =
  globalForPg.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 5,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPg.pgPool = pool;
}

export interface DbUser {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  passwordHash: string;
  isActive: boolean;
}

/** Look up a user by email (for login). Returns password_hash included. */
export async function findUserByEmail(email: string): Promise<DbUser | null> {
  const { rows } = await pool.query<{
    id: string;
    email: string;
    role: string;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
    password_hash: string;
    is_active: boolean;
  }>(
    `SELECT id, email, role, first_name, last_name, avatar_url, password_hash, is_active
     FROM users
     WHERE email = $1
     LIMIT 1`,
    [email.toLowerCase().trim()],
  );

  if (!rows[0]) return null;
  const r = rows[0];
  return {
    id: r.id,
    email: r.email,
    role: r.role,
    firstName: r.first_name,
    lastName: r.last_name,
    avatarUrl: r.avatar_url,
    passwordHash: r.password_hash,
    isActive: r.is_active,
  };
}

/** Look up a user by ID (for /api/auth/me). No password hash returned. */
export async function findUserById(id: string): Promise<Omit<DbUser, 'passwordHash'> | null> {
  const { rows } = await pool.query<{
    id: string;
    email: string;
    role: string;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
    is_active: boolean;
  }>(
    `SELECT id, email, role, first_name, last_name, avatar_url, is_active
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [id],
  );

  if (!rows[0]) return null;
  const r = rows[0];
  return {
    id: r.id,
    email: r.email,
    role: r.role,
    firstName: r.first_name,
    lastName: r.last_name,
    avatarUrl: r.avatar_url,
    isActive: r.is_active,
  };
}
