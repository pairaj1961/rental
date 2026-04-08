import { NextRequest, NextResponse } from 'next/server';
import { getSharedCustomers } from '@/lib/shared-db';

export async function GET(req: NextRequest) {
  // x-user-id is injected by proxy.ts after JWT verification
  if (!req.headers.get('x-user-id')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const customers = await getSharedCustomers();
    return NextResponse.json({ data: customers });
  } catch (err) {
    console.error('[shared/customers]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
