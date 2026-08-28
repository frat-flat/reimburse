'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Landmark, Smartphone, AlertCircle, HelpCircle } from 'lucide-react';
import ImageCropper from './ImageCropper';

interface ProfileFormProps {
  initialData: {
    receiptIssuerName: string | null;
    receiptIssuerZip: string | null;
    receiptIssuerAddress: string | null;
    receiptIssuerTel: string | null;
    receiptIssuerRegNo: string | null;
    bankCode: string | null;
    bankName: string | null;
    branchCode: string | null;
    branchName: string | null;
    accountType: string | null;
    accountNumber: string | null;
    accountHolder: string | null;
    paypayUrl: string | null;
    showBankAccount: boolean | null;
    showPaypay: boolean | null;
    stampImage: string | null;
    stampSize: number | null;
  };
  updateAction: (formData: FormData) => Promise<{ success?: boolean; error?: string }>;
}

export default function ProfileForm({ initialData, updateAction }: ProfileFormProps) {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<boolean>(false);
  const [isPending, setIsPending] = useState<boolean>(false);

  // フォームステート
  const [bankCode, setBankCode] = useState(initialData.bankCode || '');
  const [bankName, setBankName] = useState(initialData.bankName || '');
  const [branchCode, setBranchCode] = useState(initialData.branchCode || '');
  const [branchName, setBranchName] = useState(initialData.branchName || '');
  const [accountType, setAccountType] = useState(initialData.accountType || '普通');
  const [accountNumber, setAccountNumber] = useState(initialData.accountNumber || '');
  const [accountHolder, setAccountHolder] = useState(initialData.accountHolder || '');
  const [paypayUrl, setPaypayUrl] = useState(initialData.paypayUrl || '');
  const [showBankAccount, setShowBankAccount] = useState(initialData.showBankAccount !== false);
  const [showPaypay, setShowPaypay] = useState(initialData.showPaypay !== false);
  const [stampImage, setStampImage] = useState(initialData.stampImage || '');
  const [stampSize, setStampSize] = useState(initialData.stampSize || 60);
  const [cropperSrc, setCropperSrc] = useState<string | null>(null);

  // API解決用およびサジェスト検索用の状態
  interface ZenginItem {
    code: string;
    name: string;
    name_kana: string;
  }
  const [banksList, setBanksList] = useState<Record<string, ZenginItem>>({});
  const [branchesList, setBranchesList] = useState<Record<string, ZenginItem>>({});
  const [bankSuggestions, setBankSuggestions] = useState<ZenginItem[]>([]);
  const [branchSuggestions, setBranchSuggestions] = useState<ZenginItem[]>([]);
  const [showBankSuggestions, setShowBankSuggestions] = useState(false);
  const [showBranchSuggestions, setShowBranchSuggestions] = useState(false);
  const [loadingBank, setLoadingBank] = useState(false);
  const [loadingBranch, setLoadingBranch] = useState(false);
  const [holderError, setHolderError] = useState<string | null>(null);

  const bankRef = useRef<HTMLDivElement>(null);
  const branchRef = useRef<HTMLDivElement>(null);

  // 主要銀行のクイック入力用定義
  const MAJOR_BANKS = [
    { code: '0009', name: '三井住友銀行' },
    { code: '0005', name: '三菱UFJ銀行' },
    { code: '0001', name: 'みずほ銀行' },
    { code: '9900', name: 'ゆうちょ銀行' },
    { code: '0010', name: 'りそな銀行' },
  ];

  // 口座名義（カナ）のクライアント側リアルタイムバリデーション
  useEffect(() => {
    if (accountHolder) {
      const isValid = /^[ァ-ヶーｱ-ﾝﾞﾟ\s　]+$/.test(accountHolder);
      if (!isValid) {
        setHolderError('口座名義はカナ表記（カタカナ・スペース）で入力してください（漢字・アルファベットは不可）。');
      } else {
        setHolderError(null);
      }
    } else {
      setHolderError(null);
    }
  }, [accountHolder]);

  // 初回ロード時に zengin banks.json を取得キャッシュ
  useEffect(() => {
    const fetchBanks = async () => {
      setLoadingBank(true);
      try {
        const res = await fetch('/api/banks');
        if (res.ok) {
          const data = await res.json();
          setBanksList(data);
        }
      } catch (e) {
        console.error('Error fetching banks.json:', e);
      } finally {
        setLoadingBank(false);
      }
    };
    fetchBanks();
  }, []);

  // 金融機関コードが4桁になったら支店リストを一括取得
  useEffect(() => {
    if (bankCode.length === 4) {
      const fetchBranches = async () => {
        setLoadingBranch(true);
        try {
          const res = await fetch(`/api/branches/${bankCode}`);
          if (res.ok) {
            const data = await res.json();
            setBranchesList(data);
          } else {
            setBranchesList({});
          }
        } catch (e) {
          console.error('Error fetching branches:', e);
          setBranchesList({});
        } finally {
          setLoadingBranch(false);
        }
      };
      fetchBranches();
    } else {
      setBranchesList({});
      setBranchCode('');
      setBranchName('');
    }
  }, [bankCode]);

  // 金融機関コード/名入力の相互補完サジェストロジック
  const handleBankInputChange = (value: string, isCode: boolean) => {
    if (isCode) {
      const cleanVal = value.replace(/\D/g, '').slice(0, 4);
      setBankCode(cleanVal);
      
      if (cleanVal.length === 4 && banksList[cleanVal]) {
        setBankName(banksList[cleanVal].name);
        setShowBankSuggestions(false);
      } else {
        const matched = Object.values(banksList).filter((b) => b.code.startsWith(cleanVal));
        setBankSuggestions(matched.slice(0, 10));
        setShowBankSuggestions(true);
      }
    } else {
      setBankName(value);
      if (value.trim()) {
        const query = value.toLowerCase();
        const matched = Object.values(banksList).filter(
          (b) =>
            b.name.toLowerCase().includes(query) ||
            b.name_kana.toLowerCase().includes(query) ||
            b.code.includes(query)
        );
        setBankSuggestions(matched.slice(0, 10));
        setShowBankSuggestions(true);
      } else {
        setBankSuggestions([]);
        setShowBankSuggestions(false);
      }
    }
  };

  // 支店コード/名入力の相互補完サジェストロジック
  const handleBranchInputChange = (value: string, isCode: boolean) => {
    if (isCode) {
      const cleanVal = value.replace(/\D/g, '').slice(0, 3);
      setBranchCode(cleanVal);
      
      if (cleanVal.length === 3 && branchesList[cleanVal]) {
        setBranchName(branchesList[cleanVal].name);
        setShowBranchSuggestions(false);
      } else {
        const matched = Object.values(branchesList).filter((b) => b.code.startsWith(cleanVal));
        setBranchSuggestions(matched.slice(0, 10));
        setShowBranchSuggestions(true);
      }
    } else {
      setBranchName(value);
      if (value.trim()) {
        const query = value.toLowerCase();
        const matched = Object.values(branchesList).filter(
          (b) =>
            b.name.toLowerCase().includes(query) ||
            b.name_kana.toLowerCase().includes(query) ||
            b.code.includes(query)
        );
        setBranchSuggestions(matched.slice(0, 10));
        setShowBranchSuggestions(true);
      } else {
        setBranchSuggestions([]);
        setShowBranchSuggestions(false);
      }
    }
  };

  // フォーカスアウト時の銀行情報自動補完
  const handleBankBlur = () => {
    // 1. コードが4桁入力されているが、名前が空または一致しない場合、コードから名前を補完
    if (bankCode.length === 4 && banksList[bankCode]) {
      if (bankName !== banksList[bankCode].name) {
        setBankName(banksList[bankCode].name);
      }
      return;
    }

    // 2. 名前が入力されている場合、名前からコードを検索・補完
    const query = bankName.trim().toLowerCase();
    if (!query) return;

    // 完全一致
    let matched = Object.values(banksList).find(
      (b) => b.name.toLowerCase() === query || b.name_kana.toLowerCase() === query
    );
    // 部分一致 (前方一致優先)
    if (!matched) {
      const candidates = Object.values(banksList).filter(
        (b) => b.name.toLowerCase().includes(query) || b.name_kana.toLowerCase().includes(query)
      );
      if (candidates.length > 0) {
        matched = candidates.find(
          (c) => c.name.toLowerCase().startsWith(query) || c.name_kana.toLowerCase().startsWith(query)
        ) || candidates[0];
      }
    }

    if (matched) {
      setBankCode(matched.code);
      setBankName(matched.name); // 正式名称（〜銀行、〜信用金庫など）を補完
    }
  };

  // フォーカスアウト時の支店情報自動補完
  const handleBranchBlur = () => {
    // 1. コードが3桁入力されているが、名前が空または一致しない場合、コードから名前を補完
    if (branchCode.length === 3 && branchesList[branchCode]) {
      if (branchName !== branchesList[branchCode].name) {
        setBranchName(branchesList[branchCode].name);
      }
      return;
    }

    // 2. 名前が入力されている場合、名前からコードを検索・補完
    const query = branchName.trim().toLowerCase();
    if (!query) return;

    // 完全一致
    let matched = Object.values(branchesList).find(
      (b) => b.name.toLowerCase() === query || b.name_kana.toLowerCase() === query
    );
    // 部分一致
    if (!matched) {
      const candidates = Object.values(branchesList).filter(
        (b) => b.name.toLowerCase().includes(query) || b.name_kana.toLowerCase().includes(query)
      );
      if (candidates.length > 0) {
        matched = candidates.find(
          (c) => c.name.toLowerCase().startsWith(query) || c.name_kana.toLowerCase().startsWith(query)
        ) || candidates[0];
      }
    }

    if (matched) {
      setBranchCode(matched.code);
      setBranchName(matched.name); // 正式名称（〜支店、〜営業部など）を補完
    }
  };

  // サジェストドロップダウン用のエリア外クリックハンドラ
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (bankRef.current && !bankRef.current.contains(e.target as Node)) {
        setShowBankSuggestions(false);
      }
      if (branchRef.current && !branchRef.current.contains(e.target as Node)) {
        setShowBranchSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // クイック主要銀行選択ハンドラ
  const handleSelectMajorBank = (code: string, name: string) => {
    setBankCode(code);
    setBankName(name);
    setBranchCode('');
    setBranchName('');
    setShowBankSuggestions(false);
  };

  // 印影画像の選択（トリミング調整モーダル起動用）
  const handleStampSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setCropperSrc(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // フォーム送信
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (holderError) {
      setErrorMsg('入力内容にエラーがあります。修正してください。');
      return;
    }

    setIsPending(true);
    setErrorMsg(null);
    setSuccessMsg(false);

    const formData = new FormData(e.currentTarget);
    formData.set('stampImage', stampImage);
    formData.set('stampSize', stampSize.toString());
    try {
      const res = await updateAction(formData);
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        router.refresh();
      }
    } catch (err: any) {
      setErrorMsg('更新中に予期しないエラーが発生しました。');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="space-y-6">
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold p-3.5 rounded-xl animate-fade">
          プロフィール情報を更新しました！
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-xs font-bold p-3.5 rounded-xl flex items-center gap-2 animate-fade">
          <AlertCircle className="h-4 w-4 text-red-650 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* 1. 領収書発行元情報 */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="border-b border-gray-100 pb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-800 border-l-4 border-indigo-600 pl-2">
              領収書の発行元情報
            </h2>
            <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-bold">
              インボイス対応
            </span>
          </div>
          <p className="text-[11px] text-gray-500 leading-relaxed font-semibold">
            精算金を受け取る際に発行される領収書の署名欄（発行者情報）に印字されます。
          </p>

          <div className="space-y-3.5 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                発行元 氏名または会社名・屋号
              </label>
              <input
                type="text"
                name="receiptIssuerName"
                defaultValue={initialData.receiptIssuerName || ''}
                placeholder="例: たろう / 合同会社たろう企画"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1.5">
                <span>適格請求書発行事業者登録番号 (インボイス番号)</span>
                <span className="text-[9px] bg-slate-100 text-slate-500 border border-slate-200 px-1 py-0.2 rounded font-semibold">任意</span>
              </label>
              <input
                type="text"
                name="receiptIssuerRegNo"
                defaultValue={initialData.receiptIssuerRegNo || ''}
                placeholder="例: T1234567890123"
                maxLength={14}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  郵便番号
                </label>
                <input
                  type="text"
                  name="receiptIssuerZip"
                  defaultValue={initialData.receiptIssuerZip || ''}
                  placeholder="例: 100-0001"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  電話番号
                </label>
                <input
                  type="tel"
                  name="receiptIssuerTel"
                  defaultValue={initialData.receiptIssuerTel || ''}
                  placeholder="例: 090-0000-0000"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                住所
              </label>
              <input
                type="text"
                name="receiptIssuerAddress"
                defaultValue={initialData.receiptIssuerAddress || ''}
                placeholder="例: 東京都千代田区千代田1-1"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium"
              />
            </div>
          </div>
        </div>

        {/* 1.5 印影（ハンコ）設定 */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="border-b border-gray-100 pb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-800 border-l-4 border-indigo-600 pl-2 flex items-center gap-1.5">
              <span>領収書用の登録印影 (ハンコ) の設定</span>
            </h2>
            <span className="text-[9px] bg-slate-100 text-slate-500 border border-slate-200 px-1 py-0.2 rounded font-semibold">任意</span>
          </div>
          <p className="text-[11px] text-gray-500 leading-relaxed font-semibold">
            紙に押印したハンコを撮影・アップロードすると、背景の白色部分を自動的に透過処理し、領収書の発行元に重ねて配置できます。
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-3">
              <label className="block text-slate-700 font-bold mb-1">
                印影画像のアップロード方法を選択:
              </label>
              
              <div className="flex flex-col gap-2">
                {/* カメラ起動 */}
                <label className="flex items-center justify-center gap-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold py-2 px-3 rounded-lg cursor-pointer transition">
                  <span>📷 スマホのカメラで撮影する</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleStampSelect}
                    className="hidden"
                  />
                </label>

                {/* ファイル選択 */}
                <label className="flex items-center justify-center gap-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold py-2 px-3 rounded-lg cursor-pointer transition">
                  <span>📁 画像ファイルを選択する</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleStampSelect}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-3">
              <span className="text-[9px] text-slate-450 font-bold">印影プレビュー (透過済)</span>
              {stampImage ? (
                <div className="relative flex flex-col items-center gap-3 w-full">
                  <div className="border border-slate-200 bg-white rounded-lg shadow-sm w-32 h-32 flex items-center justify-center relative overflow-hidden bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:8px_8px]">
                    <img 
                      src={stampImage} 
                      alt="印影プレビュー" 
                      className="object-contain transition-all" 
                      style={{ 
                        width: `${stampSize}px`, 
                        height: `${stampSize}px` 
                      }} 
                    />
                  </div>

                  {/* 表示サイズ調整用スライダー */}
                  <div className="w-full max-w-[160px] space-y-1">
                    <div className="flex justify-between text-[8px] text-slate-500 font-bold">
                      <span>領収書上の押印サイズ</span>
                      <span>{stampSize}px</span>
                    </div>
                    <input
                      type="range"
                      min="40"
                      max="120"
                      step="5"
                      value={stampSize}
                      onChange={(e) => setStampSize(parseInt(e.target.value, 10))}
                      className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-650"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setStampImage('')}
                    className="text-[10px] text-red-655 hover:text-red-750 font-bold transition"
                  >
                    削除する
                  </button>
                </div>
              ) : (
                <p className="text-[10px] text-slate-400 font-bold py-6">印影未設定</p>
              )}
            </div>
          </div>
        </div>

        {/* 2. PayPay送金用設定 */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="border-b border-gray-100 pb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-800 border-l-4 border-indigo-600 pl-2 flex items-center gap-1.5">
              <Smartphone className="h-4.5 w-4.5 text-indigo-650" />
              <span>PayPay 支払いリンクの設定</span>
            </h2>
            <span className="text-[9px] bg-slate-100 text-slate-500 border border-slate-200 px-1 py-0.2 rounded font-semibold">任意</span>
          </div>
          <p className="text-[11px] text-gray-500 leading-relaxed font-semibold">
            PayPayの「受け取りリンク（マイコードURL）」を設定すると、送金者が精算画面からPayPayを起動して即座に送金できるようになります。
          </p>

          <div className="text-xs space-y-1.5">
            <label className="block text-slate-700 font-bold mb-1">
              PayPay 受取用リンク / PayPay ID
            </label>
            <input
              type="text"
              name="paypayUrl"
              value={paypayUrl}
              onChange={(e) => setPaypayUrl(e.target.value)}
              placeholder="例: https://paypay.me/YourPayPayName または PayPay ID"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium"
            />
            <p className="text-[9px] text-gray-400 mt-1 leading-normal font-semibold">
              ※ PayPayアプリ内の「送る・受け取る」＞「マイコード」＞「受け取りリンクをコピー」したURLを入力してください。
            </p>

            <input type="hidden" name="showPaypay" value={showPaypay ? 'true' : 'false'} />
          </div>
        </div>

        {/* 3. 金融機関振込口座情報 */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="border-b border-gray-100 pb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-800 border-l-4 border-indigo-600 pl-2 flex items-center gap-1.5">
              <Landmark className="h-4.5 w-4.5 text-indigo-650" />
              <span>振込先銀行口座情報</span>
            </h2>
            <span className="text-[9px] bg-slate-100 text-slate-500 border border-slate-200 px-1 py-0.2 rounded font-semibold">任意</span>
          </div>
          <p className="text-[11px] text-gray-500 leading-relaxed font-semibold">
            設定すると、他のクルーが精算ルート画面で「振込先口座」を確認してスムーズに銀行振込を行えます。
          </p>

          {/* クイック主要銀行選択 */}
          <div className="space-y-1 text-xs">
            <span className="block text-gray-500 font-bold mb-1">主要銀行クイック入力:</span>
            <div className="flex flex-wrap gap-1.5">
              {MAJOR_BANKS.map((b) => (
                <button
                  key={b.code}
                  type="button"
                  onClick={() => handleSelectMajorBank(b.code, b.name)}
                  className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-bold py-1 px-2 rounded-lg transition"
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 relative" ref={bankRef}>
              {/* 銀行コード */}
              <div className="md:col-span-1">
                <label className="block text-slate-700 font-bold mb-1">
                  金融機関コード (4桁)
                </label>
                <input
                  type="text"
                  name="bankCode"
                  value={bankCode}
                  onChange={(e) => handleBankInputChange(e.target.value, true)}
                  onFocus={() => bankCode.length > 0 && setShowBankSuggestions(true)}
                  onBlur={handleBankBlur}
                  placeholder="例: 0005"
                  maxLength={4}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium font-mono"
                />
              </div>

              {/* 銀行名 */}
              <div className="md:col-span-2">
                <label className="block text-slate-700 font-bold mb-1">
                  金融機関名 (サジェスト候補あり) {loadingBank && <span className="text-[9px] text-indigo-650 animate-pulse">(取得中...)</span>}
                </label>
                <input
                  type="text"
                  name="bankName"
                  value={bankName}
                  onChange={(e) => handleBankInputChange(e.target.value, false)}
                  onFocus={() => setShowBankSuggestions(true)}
                  onBlur={handleBankBlur}
                  placeholder="カタカナ・ひらがな・漢字で検索可能"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-bold"
                />
              </div>

              {/* サジェストドロップダウン */}
              {showBankSuggestions && bankSuggestions.length > 0 && (
                <div className="absolute top-[56px] left-0 w-full z-30 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg">
                  {bankSuggestions.map((b) => (
                    <button
                      key={b.code}
                      type="button"
                      onClick={() => {
                        setBankCode(b.code);
                        setBankName(b.name);
                        setBranchCode('');
                        setBranchName('');
                        setShowBankSuggestions(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 border-b border-slate-100 last:border-0 font-bold text-slate-700 flex justify-between items-center"
                    >
                      <span>{b.name} <span className="text-[9px] text-slate-400">({b.name_kana})</span></span>
                      <span className="font-mono text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{b.code}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 relative" ref={branchRef}>
              {/* 支店コード */}
              <div className="md:col-span-1">
                <label className="block text-slate-700 font-bold mb-1">
                  支店コード (3桁)
                </label>
                <input
                  type="text"
                  name="branchCode"
                  value={branchCode}
                  onChange={(e) => handleBranchInputChange(e.target.value, true)}
                  onFocus={() => branchCode.length > 0 && setShowBranchSuggestions(true)}
                  onBlur={handleBranchBlur}
                  disabled={bankCode.length !== 4}
                  placeholder={bankCode.length === 4 ? "例: 001" : "金融機関を先に選択"}
                  maxLength={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium font-mono disabled:bg-slate-50 disabled:text-slate-400"
                />
              </div>

              {/* 支店名 */}
              <div className="md:col-span-2">
                <label className="block text-slate-700 font-bold mb-1">
                  支店名 (サジェスト候補あり) {loadingBranch && <span className="text-[9px] text-indigo-650 animate-pulse">(取得中...)</span>}
                </label>
                <input
                  type="text"
                  name="branchName"
                  value={branchName}
                  onChange={(e) => handleBranchInputChange(e.target.value, false)}
                  onFocus={() => setShowBranchSuggestions(true)}
                  onBlur={handleBranchBlur}
                  disabled={bankCode.length !== 4}
                  placeholder={bankCode.length === 4 ? "カタカナ・ひらがな・漢字で検索可能" : "金融機関を先に選択してください"}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-bold disabled:bg-slate-50 disabled:text-slate-400"
                />
              </div>

              {/* サジェストドロップダウン */}
              {showBranchSuggestions && branchSuggestions.length > 0 && (
                <div className="absolute top-[56px] left-0 w-full z-30 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg">
                  {branchSuggestions.map((b) => (
                    <button
                      key={b.code}
                      type="button"
                      onClick={() => {
                        setBranchCode(b.code);
                        setBranchName(b.name);
                        setShowBranchSuggestions(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 border-b border-slate-100 last:border-0 font-bold text-slate-700 flex justify-between items-center"
                    >
                      <span>{b.name} <span className="text-[9px] text-slate-400">({b.name_kana})</span></span>
                      <span className="font-mono text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{b.code}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* 口座種別 */}
              <div className="md:col-span-1">
                <label className="block text-slate-700 font-bold mb-1">
                  口座種別
                </label>
                <select
                  name="accountType"
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-bold bg-white"
                >
                  <option value="普通">普通</option>
                  <option value="当座">当座</option>
                  <option value="貯蓄">貯蓄</option>
                </select>
              </div>

              {/* 口座番号 */}
              <div className="md:col-span-2">
                <label className="block text-slate-700 font-bold mb-1">
                  口座番号 (7桁)
                </label>
                <input
                  type="text"
                  name="accountNumber"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 7))}
                  placeholder="例: 1234567"
                  maxLength={7}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium font-mono"
                />
              </div>
            </div>

            {/* 口座名義 (カナ表記) */}
            <div>
              <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1">
                <span>口座名義 (カタカナ)</span>
                <span className="text-[8px] bg-indigo-50 border border-indigo-150 text-indigo-750 px-1 py-0.2 rounded font-extrabold">カナ必須</span>
              </label>
              <input
                type="text"
                name="accountHolder"
                value={accountHolder}
                onChange={(e) => setAccountHolder(e.target.value)}
                placeholder="例: ヤマダ タロウ"
                className={`w-full border rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-bold ${
                  holderError ? 'border-red-300 bg-red-50/20' : 'border-gray-300'
                }`}
              />
              {holderError ? (
                <p className="text-[10px] text-red-600 font-bold mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>{holderError}</span>
                </p>
              ) : (
                <p className="text-[9px] text-gray-400 mt-1 leading-normal font-semibold">
                  ※ 銀行振込時に不整合が起きないよう、必ず全角または半角カタカナで登録してください。
                </p>
              )}
            </div>

            <input type="hidden" name="showBankAccount" value={showBankAccount ? 'true' : 'false'} />
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isPending || !!holderError}
            className="w-full bg-indigo-600 hover:bg-indigo-750 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-sm disabled:opacity-50 active:scale-98 cursor-pointer"
          >
            {isPending ? '保存処理中...' : 'プロフィール情報を保存する'}
          </button>
        </div>

        {cropperSrc && (
          <ImageCropper
            imageSrc={cropperSrc}
            onCropComplete={(croppedBase64) => {
              setStampImage(croppedBase64);
              setCropperSrc(null);
            }}
            onCancel={() => setCropperSrc(null)}
          />
        )}
      </form>
    </div>
  );
}
