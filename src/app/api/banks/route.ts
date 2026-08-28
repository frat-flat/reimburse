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

    // 銀行名に「銀行」「信用金庫」などを自動付与して正式名称化するパッチ
    for (const code of Object.keys(data)) {
      const bank = data[code];
      let name = bank.name;
      const codeNum = parseInt(code, 10);

      if (codeNum >= 1000 && codeNum <= 1999) {
        if (!name.includes('金庫') && !name.includes('信用金庫')) {
          name += '信用金庫';
        }
      } else if (codeNum >= 2000 && codeNum <= 2999) {
        if (!name.includes('組合') && !name.includes('信用組合')) {
          name += '信用組合';
        }
      } else if (codeNum >= 3000 && codeNum <= 3099) {
        if (!name.includes('金庫') && !name.includes('労働金庫')) {
          name += '労働金庫';
        }
      } else if (codeNum >= 1 && codeNum <= 999) {
        if (!name.includes('銀行')) {
          name += '銀行';
        }
      }
      bank.name = name;
    }

    // 最新の金融機関情報への動的マッピング適用 (2026年8月3日変更等)
    if (data['0038']) {
      data['0038'] = {
        ...data['0038'],
        name: 'ドコモＳＭＴＢネット銀行',
        name_kana: 'ドコモエスエムテイービイネツト',
        kana: 'ドコモＳＭＴＢネツト',
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
