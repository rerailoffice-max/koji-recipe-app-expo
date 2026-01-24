# 次回セッション用タスク一覧

**最終更新**: 2026年1月24日

---

## 完了済みタスク（本日 2026/01/24）

- ✅ AIフィードバック機能（いいね/バッド + 理由選択 + コメント）
- ✅ ご意見ボックス機能（Supabase保存）
- ✅ 検索欄プレースホルダー変更
- ✅ チップの改行修正
- ✅ 挨拶・ローディング・完了メッセージのフィードバック非表示
- ✅ ホーム画面高速化（試行 → Hydrationエラーでロールバック）

---

## 未完了タスク

### 🔴 優先度：高（ユーザー体験に直結）

#### 1. Googleアカウント完全削除対応
**現状**: レシピなどのデータは削除されるが、Supabase Authのアカウント自体は残っている

**対応**: APIサーバー側で `auth.admin.deleteUser()` を呼び出すよう修正

**実装箇所**:
- APIサーバー: `/api/auth/delete-account` エンドポイント
- フロント側: `app/settings.tsx` の `handleDeleteAccount` は既に実装済み

**手順**:
1. APIサーバーで Supabase Admin API を使用
2. `SUPABASE_SERVICE_ROLE_KEY` を環境変数に設定
3. テスト: Googleアカウントでログイン→削除→再ログイン試行

---

#### 2. Gmail/メールログイン後の動作統一
**現状**: メールアドレスログインでは、ログイン前のAIメニュー生成が編集画面に表示されるが、Gmailログインでは表示されない

**対応**: ログイン後のレシピ保存・編集画面表示のロジックを統一

**実装箇所**:
- `app/auth/callback.tsx` - OAuth コールバック処理
- LocalStorage/AsyncStorageに保存されている一時レシピデータの取得ロジック

**手順**:
1. ログイン方法別の動作フローを確認
2. Google OAuth後のコールバック処理を確認
3. `PENDING_RECIPE_KEY` の読み込みタイミングを検証

---

### 🟡 優先度：中（パフォーマンス・機能追加）

#### 3. ホーム画面高速化（再実装）
**現状**: 高速化を試みたが、Hydrationエラー（React error #418）が発生してロールバック

**原因**: `Promise.all`で`supabase.auth.getUser()`を並列実行すると、SSRとCSRで状態が不一致

**安全な実装方法**:
```javascript
// 認証は単独で先に実行
React.useEffect(() => {
  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id ?? null);
    // 認証完了後に他のデータを取得（ここで並列化はOK）
  };
  init();
}, []);
```

**実装内容**:
- 認証を単独で先に実行
- タグ取得は認証後に並列化可能
- ページネーション（30件ずつ読み込み）
- 無限スクロール（FlatListの`onEndReached`）

---

#### 4. タブ切替時の画像キャッシュ問題
**現状**: 新着⇔人気を切り替えた際、既に取得した画像が再読み込みされて遅い

**原因**: `activeTab`が変わると`fetchPosts`が再実行され、同じ画像でも再取得

**対応案**:
1. 投稿データをタブごとにキャッシュ（`recentPosts`, `popularPosts`）
2. 画像コンポーネントにキャッシュ機能を追加
3. React Queryなどのキャッシュライブラリを導入

---

#### 5. ホームからメニュー共有機能
**現状**: レシピ詳細画面からのみ共有可能

**対応**: ホーム画面のレシピカードに共有アイコンを追加

**実装箇所**:
- `components/ui/CardPost.tsx` - カードコンポーネント

**参考実装**:
```javascript
// posts/[id].tsxの共有機能を参考
const handleShare = async () => {
  const url = `${APP_URL}/posts/${post.id}`;
  await Clipboard.setStringAsync(url);
  showToast('URLをコピーしました');
};
```

---

## 依頼者対応待ち

| タスク | 内容 | 対応者 |
|--------|------|--------|
| Google Search Console設定 | 依頼者のGoogleアカウントで設定が必要 | 依頼者 |

---

## 参考ファイル

### フロントエンド（koji-recipe-app-expo）
| ファイル | 説明 |
|----------|------|
| `app/settings.tsx` | アカウント削除機能 |
| `app/auth/callback.tsx` | OAuth コールバック |
| `app/(tabs)/index.tsx` | ホーム画面 |
| `app/(tabs)/compose.tsx` | レシピ作成画面 |
| `app/posts/[id].tsx` | レシピ詳細画面（共有機能参考） |
| `components/ui/CardPost.tsx` | レシピカードコンポーネント |
| `lib/supabase.ts` | Supabaseクライアント |

### APIサーバー（01-koji-project）
| ファイル | 説明 |
|----------|------|
| `src/app/api/auth/delete-account/route.ts` | アカウント削除エンドポイント |
| `src/app/api/chat/route.ts` | AIチャットエンドポイント |

---

## 本番URL

- **クライアント**: https://www.gochisokoji.com
- **APIサーバー**: https://api.gochisokoji.com

---

## メモ

- 2026-01-24: フィードバック機能実装完了、高速化はHydrationエラーでロールバック
- Supabaseに新規テーブル追加済み: `ai_feedbacks`, `feedbacks`
- Git最新コミット: 高速化ロールバック（安定版に戻す）
