import { NextRequest, NextResponse } from 'next/server';
import { getSharedUsers } from '@/lib/shared-db';

export async function GET(req: NextRequest) {
  if (!req.headers.get('x-user-id')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const role = req.nextUrl.searchParams.get('role') ?? undefined;
    const users = await getSharedUsers(role);
    return NextResponse.json({ data: users });
  } catch (err) {
    console.error('[shared/users]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
