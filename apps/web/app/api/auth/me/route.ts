import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { findUserById } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const cookieToken = req.cookies.get('auth-token')?.value;
    const headerToken = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    const token = cookieToken ?? headerToken ?? null;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch fresh user data from xCRM shared users table
    const user = await findUserById(payload.userId);
    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 401 });
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
    });
  } catch (err) {
    console.error('[auth/me]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
