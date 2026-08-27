import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch('https://zengin-code.github.io/api/banks.json', {
      next: { revalidate: 86400 }, // 1日キャッシュ
    });
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch banks from source' }, { status: 500 });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    console.error('Error in proxy banks route:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
