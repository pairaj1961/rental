import { NextRequest, NextResponse } from 'next/server';
import { getSharedProducts } from '@/lib/shared-db';

export async function GET(req: NextRequest) {
  if (!req.headers.get('x-user-id')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const products = await getSharedProducts();
    return NextResponse.json({ data: products });
  } catch (err) {
    console.error('[shared/products]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
