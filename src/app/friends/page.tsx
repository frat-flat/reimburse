import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { 
  actionSendFriendRequest, 
  actionAcceptFriendRequest, 
  actionRejectFriendRequest 
} from '@/lib/actions';
import DbMigrateButton from '@/components/DbMigrateButton';
import { Users, UserPlus, Check, X, Mail, Clock, AlertCircle } from 'lucide-react';

export default async function FriendsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }

  // 1. 友達一覧 (status === 'accepted') を取得
  let friendships: any[] = [];
  let incomingRequests: any[] = [];
  let outgoingRequests: any[] = [];
  let dbError = false;

  try {
    friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { userId: currentUser.id, status: 'accepted' },
          { friendId: currentUser.id, status: 'accepted' },
        ],
      },
      include: {
        user: true,
        friend: true,
      },
    });

    // 2. 届いている申請 (friendId === 自分のID, status === 'pending')
    incomingRequests = await prisma.friendship.findMany({
      where: {
        friendId: currentUser.id,
        status: 'pending',
      },
      include: {
        user: true,
      },
    });

    // 3. 送信した申請 (userId === 自分のID, status === 'pending')
    outgoingRequests = await prisma.friendship.findMany({
      where: {
        userId: currentUser.id,
        status: 'pending',
      },
      include: {
        friend: true,
      },
    });
  } catch (err) {
    console.error('Failed to fetch friendships. Tables might not exist yet:', err);
    dbError = true;
  }

  const friends = friendships.map((f) => {
    // 自分が申請した側なら相手はfriend、自分が申請された側なら相手はuser
    return f.userId === currentUser.id ? f.friend : f.user;
  });

  // 友達追加アクション
  const handleAddFriend = async (formData: FormData) => {
    'use server';
    const email = formData.get('email') as string;
    await actionSendFriendRequest(email);
  };

  // 承認アクション
  const handleAccept = async (formData: FormData) => {
    'use server';
    const friendshipId = formData.get('friendshipId') as string;
    await actionAcceptFriendRequest(friendshipId);
  };

  // 拒否・キャンセルアクション
  const handleReject = async (formData: FormData) => {
    'use server';
    const friendshipId = formData.get('friendshipId') as string;
    await actionRejectFriendRequest(friendshipId);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-gray-200">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">友達管理</h1>
          <p className="text-sm text-gray-600 mt-1">
            登録ユーザー間で友達になることで、作成したプロジェクトの共有が可能になります。
          </p>
        </div>
        <DbMigrateButton />
      </div>

      {dbError && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 shadow-sm text-sm text-amber-800 space-y-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <h3 className="font-bold">データベースのセットアップが必要です</h3>
          </div>
          <p className="leading-relaxed text-xs">
            新機能（友達機能・プロジェクト共有・重複支出警告）用のテーブルが本番データベースにまだ作成されていません。<br />
            右上の「<strong>データベース接続・テーブル更新</strong>」ボタンを押して、テーブルの自動作成を実行してください。
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 左カラム：友達追加フォーム & 届いている・送信した申請 */}
        <div className="md:col-span-1 space-y-6">
          {/* 友達申請フォーム */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
              <UserPlus className="h-5 w-5 text-indigo-650" />
              <h2 className="text-base font-bold text-gray-900">友達を追加する</h2>
            </div>
            <form action={handleAddFriend} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  メールアドレス
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="example@mail.com"
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-750 text-white font-bold py-2 rounded-lg text-xs transition shadow-sm"
              >
                友達申請を送る
              </button>
            </form>
          </div>

          {/* 届いている申請 */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
              <Clock className="h-5 w-5 text-amber-500" />
              <h2 className="text-base font-bold text-gray-900">届いている申請 ({incomingRequests.length})</h2>
            </div>
            {incomingRequests.length === 0 ? (
              <p className="text-xs text-gray-400 italic text-center py-2">届いている申請はありません</p>
            ) : (
              <ul className="space-y-2">
                {incomingRequests.map((req) => (
                  <li 
                    key={req.id} 
                    className="flex items-center justify-between p-2.5 bg-gray-50 border border-gray-150 rounded-lg text-xs"
                  >
                    <div className="truncate">
                      <p className="font-bold text-gray-800 truncate">{req.user.name}</p>
                      <p className="text-[10px] text-gray-400 truncate">{req.user.email}</p>
                    </div>
                    <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                      <form action={handleAccept}>
                        <input type="hidden" name="friendshipId" value={req.id} />
                        <button
                          type="submit"
                          className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-md transition"
                          title="承認"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      </form>
                      <form action={handleReject}>
                        <input type="hidden" name="friendshipId" value={req.id} />
                        <button
                          type="submit"
                          className="p-1.5 bg-red-50 text-red-650 hover:bg-red-100 border border-red-200 rounded-md transition"
                          title="拒否"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 送信した申請 */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
              <Clock className="h-5 w-5 text-gray-400" />
              <h2 className="text-base font-bold text-gray-900">送信した申請 ({outgoingRequests.length})</h2>
            </div>
            {outgoingRequests.length === 0 ? (
              <p className="text-xs text-gray-400 italic text-center py-2">送信済みの申請はありません</p>
            ) : (
              <ul className="space-y-2">
                {outgoingRequests.map((req) => (
                  <li 
                    key={req.id} 
                    className="flex items-center justify-between p-2.5 bg-gray-50 border border-gray-150 rounded-lg text-xs"
                  >
                    <div className="truncate">
                      <p className="font-bold text-gray-800 truncate">{req.friend.name}</p>
                      <p className="text-[10px] text-gray-400 truncate">{req.friend.email}</p>
                    </div>
                    <form action={handleReject} className="ml-2 flex-shrink-0">
                      <input type="hidden" name="friendshipId" value={req.id} />
                      <button
                        type="submit"
                        className="p-1.5 bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 border border-gray-200 rounded-md transition"
                        title="キャンセル"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* 右カラム：現在の友達一覧 */}
        <div className="md:col-span-2">
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4 h-full">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
              <Users className="h-5 w-5 text-indigo-650" />
              <h2 className="text-base font-bold text-gray-900">友達一覧 ({friends.length})</h2>
            </div>

            {friends.length === 0 ? (
              <div className="text-center py-20 text-gray-500 text-sm">
                <Users className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                <p className="font-semibold text-gray-700">まだ友達はいません</p>
                <p className="text-xs text-gray-400 mt-1">
                  左のフォームから相手のメールアドレスに友達申請を送ってください。
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {friends.map((friend) => (
                  <div 
                    key={friend.id} 
                    className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-xl"
                  >
                    <div className="truncate">
                      <h3 className="font-bold text-gray-900 text-sm truncate">{friend.name}</h3>
                      <p className="text-xs text-gray-500 truncate">{friend.email}</p>
                    </div>
                    <div className="text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full flex-shrink-0">
                      友達
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
