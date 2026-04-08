import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { signToken } from '@/lib/auth';
import { findUserByEmail } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body ?? {};

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const user = await findUserByEmail(email);

    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json({ error: 'Account is inactive. Contact your administrator.' }, { status: 403 });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const token = await signToken({
      userId: user.id,
      email: user.email,
      role: user.role as any,
      firstName: user.firstName,
      lastName: user.lastName,
    });

    const res = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
      },
    });

    const isProduction = process.env.NODE_ENV === 'production';
    res.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    return res;
  } catch (err) {
    console.error('[auth/login]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
