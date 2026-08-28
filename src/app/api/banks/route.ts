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

    // 最新の金融機関情報への動的マッピング適用 (2026年8月3日変更等)
    if (data['0038']) {
      data['0038'] = {
        ...data['0038'],
        name: 'ドコモＳＭＴＢネット銀行',
        name_kana: 'ドコモエスエムテイービイネツト',
        hira: 'どこもえすえむてぃーびーねっと',
        roma: 'dokomosmtbnet',
      };
    }

    return NextResponse.json(data);
  } catch (e) {
    console.error('Error in proxy banks route:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
