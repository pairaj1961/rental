import { NextRequest, NextResponse } from 'next/server';
import { getCustomerSites } from '@/lib/shared-db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!req.headers.get('x-user-id')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const sites = await getCustomerSites(id);
    return NextResponse.json({ data: sites });
  } catch (err) {
    console.error('[shared/customers/[id]/sites]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
