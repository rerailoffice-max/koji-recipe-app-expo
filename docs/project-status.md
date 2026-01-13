# GOCHISOKOJI プロジェクト状況

最終更新: 2026年1月14日

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

### AI・データ機能
- [x] 栄養情報（塩分/カロリー/調理時間）AI出力 + 表示（目安表記）
- [x] タグ検索機能強化（DBから動的取得、カテゴリ別表示、もっと見るUI）

### PWA・パフォーマンス
- [x] PWA設定（manifest.json強化、shortcuts追加）
- [x] 表示スピード改善（FlatList最適化、キャッシュ、並列API）

---

## 依頼者対応待ち

| タスク | 内容 | 対応者 |
|--------|------|--------|
| Google Search Console設定 | 依頼者のGoogleアカウントで設定が必要 | 依頼者 |

---

## 将来実装候補

| タスク | 優先度 | 備考 |
|--------|--------|------|
| 材料写真からメニュー考案（画像認識AI）| 中 | 複雑・要検討 |
| ホーム画面追加の説明ポップ | 低 | |

---

## 技術スタック

### フロントエンド
- **フレームワーク**: Expo (React Native)
- **ルーティング**: Expo Router
- **スタイリング**: React Native StyleSheet
- **ホスティング**: Vercel

### バックエンド
- **フレームワーク**: Next.js (App Router)
- **AI**: Google Gemini API
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

| ファイル | 説明 |
|----------|------|
| `app/(tabs)/index.tsx` | ホーム画面 |
| `app/(tabs)/compose.tsx` | AIレシピ生成画面 |
| `app/(tabs)/profile.tsx` | プロフィール画面 |
| `app/compose/edit.tsx` | レシピ編集画面 |
| `app/posts/[id].tsx` | レシピ詳細画面 |
| `components/ui/SearchFilter.tsx` | 検索フィルターコンポーネント |
| `components/ui/LoadingOverlay.tsx` | ローディングアニメーション |
| `public/manifest.json` | PWA設定 |
| `supabase/add_tags.sql` | タグテーブルSQL |
| `supabase/add_nutrition_columns.sql` | 栄養情報カラムSQL |
