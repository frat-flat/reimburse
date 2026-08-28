import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ bankCode: string }> }
) {
  try {
    const { bankCode } = await params;
    if (!bankCode || bankCode.length !== 4) {
      return NextResponse.json({ error: 'Invalid bank code' }, { status: 400 });
    }

    // 正しい Zengin-code Branches JSON 取得URLの形式
    const res = await fetch(`https://zengin-code.github.io/api/branches/${bankCode}.json`, {
      next: { revalidate: 86400 }, // 1日キャッシュ
    });
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch branches from source' }, { status: 500 });
    }
    const data = await res.json();

    // 支店名に「支店」「営業部」などを自動付与して正式名称化するパッチ
    for (const code of Object.keys(data)) {
      const branch = data[code];
      let name = branch.name;

      if (
        name.includes('支店') ||
        name.includes('営業部') ||
        name.includes('出張所') ||
        name.includes('出張店') ||
        name.includes('事務所') ||
        name.includes('分室') ||
        name.includes('センター')
      ) {
        // すでに正式名称が含まれる場合はそのまま
      } else if (name === '本店') {
        name = '本店営業部';
      } else if (name.endsWith('営業')) {
        name += '部'; // 例: 東京営業 -> 東京営業部
      } else {
        name += '支店'; // 例: 渋谷 -> 渋谷支店
      }
      branch.name = name;
    }

    return NextResponse.json(data);
  } catch (e) {
    console.error('Error in proxy branches route:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
