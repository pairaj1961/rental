import { NextRequest, NextResponse } from 'next/server';
import { getApprovedQuotes } from '@/lib/shared-db';

export async function GET(req: NextRequest) {
  if (!req.headers.get('x-user-id')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const customerId = req.nextUrl.searchParams.get('customerId');
  if (!customerId) {
    return NextResponse.json({ error: 'customerId query param is required' }, { status: 400 });
  }

  try {
    const quotes = await getApprovedQuotes(customerId);
    return NextResponse.json({ data: quotes });
  } catch (err) {
    console.error('[shared/quotes/approved]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
