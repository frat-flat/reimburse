import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ bankCode: string }> }
) {
  try {
    // Next.js 15+ での非同期 params の正しいアンラップ処理
    const { bankCode } = await params;
    if (!bankCode || bankCode.length !== 4) {
      return NextResponse.json({ error: 'Invalid bank code' }, { status: 400 });
    }

    const res = await fetch(`https://zengin-code.github.io/api/banks/${bankCode}/branches.json`, {
      next: { revalidate: 86400 }, // 1日キャッシュ
    });
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch branches from source' }, { status: 500 });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    console.error('Error in proxy branches route:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
