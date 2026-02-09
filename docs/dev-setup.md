# GOCHISOKOJI 開発環境セットアップガイド

このドキュメントでは、GOCHISOKOJIアプリの開発環境をゼロから構築する手順を説明します。

---

## 前提条件

以下のツールがインストールされていること。

| ツール | バージョン | 用途 |
|---|---|---|
| Node.js | v20 以上 | JavaScript実行環境 |
| npm | v10 以上 | パッケージ管理 |
| Git | 最新版 | バージョン管理 |
| Vercel CLI | v50 以上 | デプロイ |

### Vercel CLI のインストール

```bash
npm install -g vercel
```

---

## リポジトリ構成

このプロジェクトは **2つのリポジトリ** で構成されています。

| リポジトリ | 内容 | 本番URL |
|---|---|---|
| `koji-recipe-app-expo` | フロントエンド（Expo/React Native） | https://www.gochisokoji.com |
| `01-koji-project` | APIサーバー（Next.js） | https://api.gochisokoji.com |

### Git リモート構成（フロントエンド）

フロントエンドには2つのリモートが設定されています。

| リモート名 | URL | 用途 |
|---|---|---|
| `origin` | https://github.com/rerailoffice-max/koji-recipe-app-expo.git | 開発者用リポジトリ |
| `client` | https://github.com/GOCHISOKOJ/GOCHISOKOJI-recipe-app.git | クライアント用リポジトリ |

> **運用ルール**: 変更をコミットしたら、`origin` と `client` の両方にプッシュしてください。
>
> ```bash
> git push origin main && git push client main
> ```

---

## クローンとセットアップ

### 1. フロントエンド

```bash
# リポジトリをクローン
git clone https://github.com/rerailoffice-max/koji-recipe-app-expo.git
cd koji-recipe-app-expo

# クライアント用リモートを追加
git remote add client https://github.com/GOCHISOKOJ/GOCHISOKOJI-recipe-app.git

# 依存パッケージのインストール
npm install
```

### 2. APIサーバー

```bash
# リポジトリをクローン（またはZIPファイルから展開）
cd 01-koji-project

# 依存パッケージのインストール
npm install
```

---

## 環境変数の設定

### フロントエンド（`koji-recipe-app-expo/.env.local`）

```env
# Supabase設定
SUPABASE_URL=https://xvzwvwyjyiykdqvpxppf.supabase.co
SUPABASE_SERVICE_KEY=<Supabaseサービスロールキー>

# Google AI設定
GEMINI_API_KEY=<Gemini APIキー>
```

> **注意**: `EXPO_PUBLIC_SUPABASE_URL` と `EXPO_PUBLIC_SUPABASE_ANON_KEY` はコード内（`lib/supabase.ts`）にフォールバック値がハードコードされているため、`.env.local`での設定は任意です。

### APIサーバー（`01-koji-project/.env.local`）

```env
# Gemini API
GEMINI_API_KEY=<Gemini APIキー>

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xvzwvwyjyiykdqvpxppf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<Supabase匿名キー>
SUPABASE_SERVICE_ROLE_KEY=<Supabaseサービスロールキー>
```

### 環境変数の取得元

| 変数名 | 取得場所 |
|---|---|
| `GEMINI_API_KEY` | https://aistudio.google.com/apikey から取得 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabaseダッシュボード → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabaseダッシュボード → Settings → API → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabaseダッシュボード → Settings → API → service_role（**秘密情報**） |

---

## ローカル開発サーバーの起動

### フロントエンド

```bash
cd koji-recipe-app-expo

# Web版で起動
npm run web

# または
npx expo start --web
```

ブラウザで `http://localhost:8081` が開きます。

### APIサーバー

```bash
cd 01-koji-project

# 開発サーバー起動
npm run dev
```

`http://localhost:3000` でAPIサーバーが起動します。

> **注意**: フロントエンドのAPIリクエスト先は `https://api.gochisokoji.com` にハードコードされています（`lib/supabase.ts` の `API_BASE_URL`）。ローカルのAPIサーバーに向ける場合は、この値を `http://localhost:3000` に変更してください。

---

## デプロイ手順

### フロントエンドのデプロイ

```bash
cd koji-recipe-app-expo

# 本番環境にデプロイ
vercel deploy --prod
```

デプロイ完了後、`https://www.gochisokoji.com` に反映されます（約2分）。

### APIサーバーのデプロイ

```bash
cd 01-koji-project

# 本番環境にデプロイ
vercel deploy --prod
```

デプロイ完了後、`https://api.gochisokoji.com` に反映されます。

### Vercel環境変数の更新

環境変数を変更した場合、Vercel上にも反映が必要です。

```bash
# APIキーの例（productionに設定）
echo "新しいAPIキー" | vercel env add GEMINI_API_KEY production --force

# 変更後は再デプロイが必要
vercel deploy --prod
```

---

## Supabase管理

### ダッシュボード

https://supabase.com/dashboard からログインし、プロジェクトを選択。

### スキーマ変更手順

1. ダッシュボードの「SQL Editor」を開く
2. SQLを記述して実行
3. 変更内容をSQLファイルとして `supabase/` ディレクトリに保存（履歴管理のため）

### 既存のSQLファイル

| ファイル | 内容 |
|---|---|
| `supabase/schema.sql` | 基本スキーマ（users, posts, likes） |
| `supabase/users_trigger.sql` | ユーザー自動作成トリガー |
| `supabase/add_tags.sql` | タグテーブル |
| `supabase/add_tips_column.sql` | コツ・ポイントカラム |
| `supabase/add_servings_column.sql` | 人数カラム |
| `supabase/add_nutrition_columns.sql` | 栄養情報カラム |
| `supabase/add_feedback_tables.sql` | フィードバックテーブル |
| `supabase/add_admin_delete_policy.sql` | 管理者削除ポリシー |

---

## プロジェクト構成（フロントエンド）

```
koji-recipe-app-expo/
├── app/                    # 画面（Expo Router ファイルベースルーティング）
│   ├── (tabs)/             # タブ画面
│   │   ├── index.tsx       # ホーム画面
│   │   ├── compose.tsx     # AIレシピ生成画面
│   │   └── profile.tsx     # プロフィール画面
│   ├── posts/
│   │   └── [id].tsx        # レシピ詳細画面
│   ├── compose/
│   │   └── edit.tsx        # レシピ編集画面
│   ├── settings.tsx        # 設定画面
│   ├── login.tsx           # ログイン画面
│   └── auth/
│       └── callback.tsx    # OAuthコールバック
├── components/
│   ├── ui/                 # UIコンポーネント（AppBar, CardPost, SearchFilter等）
│   └── chat/               # チャットコンポーネント
├── lib/
│   └── supabase.ts         # Supabaseクライアント + API_BASE_URL
├── constants/
│   └── theme.ts            # テーマ（色、スペーシング等）
├── contexts/
│   └── ToastContext.tsx     # トースト通知
├── hooks/                  # カスタムフック
├── public/                 # 静的ファイル（ロゴ、manifest.json等）
├── supabase/               # SQLファイル
├── docs/                   # ドキュメント
├── vercel.json             # Vercelデプロイ設定
└── package.json
```

## プロジェクト構成（APIサーバー）

```
01-koji-project/
├── src/
│   ├── app/
│   │   └── api/            # APIエンドポイント（Next.js App Router）
│   │       ├── chat/route.ts
│   │       ├── extract-recipe/route.ts
│   │       ├── quick-menu-idea/route.ts
│   │       ├── tags/route.ts
│   │       ├── posts/view/route.ts
│   │       ├── weekly-recipes/route.ts
│   │       └── auth/
│   │           ├── email-login/route.ts
│   │           ├── email-signup/route.ts
│   │           └── delete-account/route.ts
│   └── lib/
│       ├── gemini/
│       │   ├── client.ts   # Gemini API HTTPクライアント
│       │   └── prompts.ts  # AIプロンプト定義
│       └── nutrition/
│           ├── calculator.ts  # 栄養計算ロジック
│           └── database.ts    # 調理時間データベース
├── .env.local              # 環境変数
└── package.json
```

---

## 管理者アカウント

| 項目 | 値 |
|---|---|
| メールアドレス | admin@gochisokoji.com |
| 権限 | 他ユーザーの投稿削除、閲覧数表示 |

---

## よくあるトラブルと対処法

### 「Hydrationエラー（React error #418）」が発生する

**原因**: SSRとCSRで認証状態が不一致になる

**対処**: `supabase.auth.getUser()` は他のAPIコールと並列実行せず、単独で先に実行する。

```typescript
// 安全な実装パターン
React.useEffect(() => {
  const init = async () => {
    // 認証は単独で先に実行
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id ?? null);
    // 認証完了後に他のデータ取得を並列化するのはOK
  };
  init();
}, []);
```

### Vercelのビルドが失敗する

**対処**:
1. ローカルで `npm run build:web` を実行してエラーを確認
2. TypeScriptの型エラーやimportの不備を修正
3. 再デプロイ

### Supabaseが停止している

**原因**: 無料プランは7日間アクセスがないと自動停止

**対処**: Supabaseダッシュボードでプロジェクトを開き、「Resume」をクリック

### ローカルでAPIが呼べない

**原因**: `API_BASE_URL` が本番URL（`https://api.gochisokoji.com`）になっている

**対処**: `lib/supabase.ts` の `API_BASE_URL` を `http://localhost:3000` に一時的に変更

---

*最終更新: 2026年1月31日*
