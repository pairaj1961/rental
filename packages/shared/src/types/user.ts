export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  REP = 'REP',
  PRODUCT_MANAGER = 'PRODUCT_MANAGER',
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  iat?: number;
  exp?: number;
}
