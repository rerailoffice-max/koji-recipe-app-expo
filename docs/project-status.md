# GOCHISOKOJI プロジェクト状況

**最終更新**: 2026年1月24日

---

## 本番環境

| 項目 | URL |
|------|-----|
| クライアント | https://www.gochisokoji.com |
| APIサーバー | https://api.gochisokoji.com |

---

## 完了済みタスク

### 基本機能
- [x] AIによる麹レシピ生成（旨塩・コンソメ・中華対応）
- [x] レシピの投稿・編集・削除
- [x] レシピの検索・フィルタリング
- [x] ユーザー登録・ログイン（Google/メールアドレス）
- [x] プロフィール編集
- [x] レシピのお気に入り保存

### UI/UX改善
- [x] 今週のおすすめの「すべてを見る」削除
- [x] プロフィールの表示数制限解除（無制限化）
- [x] アプリ共有機能（URLコピー）
- [x] 投稿時に写真掲載必須化
- [x] 管理者による他ユーザー投稿削除機能 + 投稿規定表示
- [x] プロフィールからこうじ購入ページへ遷移
- [x] ホームの「麹レシピ」→GOCHISOKOJIロゴに変更
- [x] ホーム画面追加時のアイコン変更（192x192, 512x512, apple-touch-icon）
- [x] タブバーのUI最適化（Web/iOS対応）
- [x] カードレイアウト改善（材料見切れ防止、麹タグ配置）
- [x] 検索の表記ゆれ対応（ひらがな/カタカナ/漢字を統一）
- [x] 検索タグの折りたたみ機能

### AI・データ機能
- [x] 栄養情報AI出力（調理時間のみ表示、カロリー・塩分は削除）
- [x] タグ検索機能強化（DBから動的取得、カテゴリ別表示）
- [x] AIメニュー提案へのフィードバック機能（いいね/バッド + 理由選択 + コメント）
- [x] ご意見ボックス機能（Supabase保存）
- [x] 下書き履歴機能（チャットに戻る/編集/削除）
- [x] レシピの説明・コツを自動生成（データ修正スクリプト実行済み）
- [x] 5分で簡単レシピの時間厳守
- [x] でんぷん質×麹の組み合わせ注意点を追加

### PWA・パフォーマンス
- [x] PWA設定（manifest.json強化、shortcuts追加）
- [x] FlatList最適化
- [x] 今週のおすすめ7日分表示

### ログイン・認証
- [x] ログイン画面のロゴ変更（login-logo.png）
- [x] フッター年号を2024→2026に変更
- [x] 新規登録画面にGoogleで新規登録ボタン追加

---

## 未完了タスク

| # | タスク | 優先度 | 備考 |
|---|--------|--------|------|
| 1 | Googleアカウント完全削除対応 | 高 | auth.usersからも削除 |
| 2 | Gmail/メールログイン後の動作統一 | 高 | OAuth後のリダイレクト処理 |
| 3 | ホーム画面高速化（再実装） | 中 | Hydrationエラーを回避しながら実装 |
| 4 | タブ切替時の画像キャッシュ | 中 | 新着⇔人気で再取得が遅い |
| 5 | ホームからメニュー共有 | 中 | カードから直接URLコピー |

---

## 依頼者対応待ち

| タスク | 内容 | 対応者 |
|--------|------|--------|
| Google Search Console設定 | 依頼者のGoogleアカウントで設定が必要 | 依頼者 |

---

## 技術スタック

### フロントエンド
- **フレームワーク**: Expo (React Native)
- **ルーティング**: Expo Router
- **スタイリング**: React Native StyleSheet
- **ホスティング**: Vercel

### バックエンド
- **フレームワーク**: Next.js (App Router)
- **AI**: Google Gemini API (`gemini-3-flash-preview`)
- **データベース**: Supabase (PostgreSQL)
- **認証**: Supabase Auth
- **ストレージ**: Supabase Storage
- **ホスティング**: Vercel

### 外部サービス
- **Google OAuth**: ログイン連携
- **Gemini API**: AI レシピ生成

---

## 管理者アカウント

- **メール**: admin@gochisokoji.com
- **権限**: 他ユーザーの投稿削除、閲覧数表示

---

## 重要ファイル

### フロントエンド（koji-recipe-app-expo）
| ファイル | 説明 |
|----------|------|
| `app/(tabs)/index.tsx` | ホーム画面 |
| `app/(tabs)/compose.tsx` | AIレシピ生成画面 |
| `app/(tabs)/profile.tsx` | プロフィール画面 |
| `app/compose/edit.tsx` | レシピ編集画面 |
| `app/posts/[id].tsx` | レシピ詳細画面 |
| `app/settings.tsx` | 設定画面（アカウント削除） |
| `app/auth/callback.tsx` | OAuthコールバック |
| `components/chat/` | チャットコンポーネント |
| `components/ui/` | UIコンポーネント |
| `public/manifest.json` | PWA設定 |

### APIサーバー（01-koji-project）
| ファイル | 説明 |
|----------|------|
| `src/app/api/chat/route.ts` | AIチャットエンドポイント |
| `src/app/api/extract-recipe/route.ts` | レシピ抽出 |
| `src/app/api/quick-menu-idea/route.ts` | クイックメニュー |
| `src/lib/gemini/prompts.ts` | AIプロンプト定義 |
| `src/lib/nutrition/` | 栄養計算ロジック |

### Supabase SQL
| ファイル | 説明 |
|----------|------|
| `supabase/schema.sql` | 基本スキーマ |
| `supabase/users_trigger.sql` | ユーザー自動作成トリガー |
| `supabase/add_tags.sql` | タグテーブル |
| `supabase/add_tips_column.sql` | コツ・ポイントカラム |
| `supabase/add_feedback_tables.sql` | フィードバックテーブル |

---

## 既知の問題と対策

### Hydrationエラー（React error #418）
**原因**: 高速化のためにPromise.allでsupabase.auth.getUser()を並列実行すると、SSRとCSRで状態が不一致になる

**対策**: 
1. 認証は単独で先に実行
2. 認証完了後に他のデータを並列取得
3. クライアントサイドのみで実行する処理は`isMounted`フラグで制御

```javascript
// 安全な実装パターン
React.useEffect(() => {
  const init = async () => {
    // 認証は単独で実行
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id ?? null);
    // この後で並列化はOK
  };
  init();
}, []);
```
