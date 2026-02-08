# GOCHISOKOJI インフラ取り扱いガイド

このドキュメントでは、GOCHISOKOJIアプリで使用しているインフラサービス（Supabase・Vercel）の概要と基本操作を説明します。

---

## サービス構成の全体像

```
ユーザー
  ↓ アクセス
www.gochisokoji.com（Vercel）← アプリ画面の表示
  ↓ データ取得
Supabase ← ユーザー情報・レシピ・画像の保存
  ↓ AI連携
api.gochisokoji.com（APIサーバー）← AIレシピ生成・メール認証
```

| サービス | 役割 | URL |
|---|---|---|
| Vercel | アプリ画面の配信（ホスティング） | https://vercel.com |
| Supabase | データベース・認証・画像保存 | https://supabase.com |
| APIサーバー | AI連携・メール認証などの処理 | https://api.gochisokoji.com |

---

## Supabase（スーパベース）

### Supabaseとは

Supabaseは、アプリのデータを保存・管理するためのクラウドサービスです。
以下の3つの機能をこのアプリで使用しています。

1. **データベース**: レシピ、ユーザー情報、お気に入りなどのデータを保存
2. **認証（Auth）**: ログイン/新規登録の管理
3. **ストレージ**: レシピ写真やプロフィール画像の保存

### ダッシュボードへのアクセス

1. https://supabase.com/dashboard にアクセス
2. アカウントでログイン
3. プロジェクト「GOCHISOKOJI」を選択

---

### データベース（テーブル一覧）

左メニューの「Table Editor」からテーブルの中身を確認・編集できます。

#### users（ユーザー情報）

アプリに登録したユーザーの情報です。

| カラム名 | 内容 | 例 |
|---|---|---|
| id | ユーザーID | `a1b2c3d4-...` |
| email | メールアドレス | `user@example.com` |
| display_name | 表示名 | `山田太郎` |
| avatar_url | プロフィール画像のURL | `https://...` |
| bio | 自己紹介 | `麹料理が大好きです` |
| created_at | 登録日時 | `2026-01-15 10:30:00` |

#### posts（レシピ投稿）

投稿されたレシピと下書きのデータです。

| カラム名 | 内容 | 例 |
|---|---|---|
| id | レシピID | `e5f6g7h8-...` |
| user_id | 投稿者のユーザーID | `a1b2c3d4-...` |
| title | レシピ名 | `ささみの旨塩和え` |
| description | 説明文 | `さっぱりとした...` |
| image_url | レシピ写真のURL | `https://...` |
| koji_type | 麹タイプ | `たまねぎ麹` / `中華麹` / `コンソメ麹` |
| difficulty | 難易度 | `かんたん` / `ふつう` / `こだわり` |
| ingredients | 材料（JSON形式） | `[{"name":"ささみ","amount":"2本"}]` |
| steps | 手順（JSON形式） | `[{"order":1,"description":"ささみを..."}]` |
| tips | コツ・ポイント | `仕上げにごま油で...` |
| is_public | 公開状態 | `true`（公開）/ `false`（下書き） |
| is_ai_generated | AI生成かどうか | `true` / `false` |
| cooking_time_min | 調理時間（分） | `10` |
| servings | 人数 | `2` |
| tags | タグ | `{和食,時短,ヘルシー}` |
| view_count | 閲覧数 | `42` |
| created_at | 作成日時 | `2026-01-20 15:00:00` |

#### likes（お気に入り）

ユーザーがお気に入りに保存したレシピの記録です。

| カラム名 | 内容 |
|---|---|
| id | 記録ID |
| user_id | お気に入りしたユーザーのID |
| post_id | お気に入りされたレシピのID |
| created_at | 保存日時 |

#### tags（タグマスター）

レシピに付けられるタグの一覧です。

| カラム名 | 内容 | 例 |
|---|---|---|
| id | タグID | `t1u2v3w4-...` |
| name | タグ名 | `和食` |
| category | カテゴリ | `ingredient` / `style` / `diet` / `dish_type` |
| emoji | 絵文字 | `🍳` |
| display_order | 表示順 | `1` |

#### ai_feedbacks（AIフィードバック）

AIメニュー画面で送信された「いいね/バッド」フィードバックです。

| カラム名 | 内容 | 例 |
|---|---|---|
| id | フィードバックID | |
| user_id | 送信したユーザーのID | |
| message_text | AIのメッセージ内容 | `ささみの旨塩和え...` |
| feedback_type | 評価タイプ | `like` / `dislike` |
| reasons | 理由（複数選択） | `{美味しそう,簡単そう}` |
| comment | 自由コメント | `もう少し辛い方が好み` |
| created_at | 送信日時 | |

#### feedbacks（ご意見ボックス）

プロフィール画面の「ご意見ボックス」から送信された意見です。

| カラム名 | 内容 | 例 |
|---|---|---|
| id | 意見ID | |
| user_id | 送信したユーザーのID | |
| email | メールアドレス | |
| content | 意見の内容 | `検索が使いやすいです` |
| created_at | 送信日時 | |

---

### 認証（Authentication）

左メニューの「Authentication」→「Users」から、登録済みユーザーの一覧を確認できます。

**確認できる情報:**
- メールアドレス
- ログイン方法（Google / メール）
- 最終ログイン日時
- アカウント作成日時

**操作:**
- ユーザーの無効化（Ban User）
- ユーザーの削除（Delete User）

> 注意: ユーザーを削除すると、そのユーザーの投稿やお気に入りデータも削除されます。

---

### ストレージ（Storage）

左メニューの「Storage」から、アップロードされた画像ファイルを確認できます。

**バケット名**: `recipe-images`

**保存されている画像:**
- レシピ写真: `{ユーザーID}/{タイムスタンプ}.jpg`
- プロフィール画像: `{ユーザーID}/avatar-{タイムスタンプ}.jpg`

**操作:**
- 画像の閲覧
- 画像の削除（不適切な画像がある場合）
- 画像のURLコピー

---

### SQL Editor

左メニューの「SQL Editor」から、データベースに対してSQLコマンドを直接実行できます。

> この機能は上級者向けです。誤った操作をするとデータが消える可能性がありますので、慎重に扱ってください。

**使用例:**
- データの一括更新
- テーブル構造の変更
- RLSポリシー（アクセス権限）の変更

---

### RLS（Row Level Security）について

RLSは「誰がどのデータにアクセスできるか」を制御する仕組みです。

**このアプリでのルール:**

| テーブル | 閲覧 | 作成 | 更新 | 削除 |
|---|---|---|---|---|
| users | 全員 | 自分のみ | 自分のみ | - |
| posts | 公開投稿は全員、下書きは自分のみ | 自分のみ | 自分のみ | 自分 or 管理者 |
| likes | 自分のみ | 自分のみ | - | 自分のみ |
| tags | 全員 | - | - | - |
| ai_feedbacks | 自分のみ | 全員 | - | - |
| feedbacks | 自分のみ | 全員 | - | - |

> 管理者（admin@gochisokoji.com）は、他のユーザーの投稿を削除できる特別な権限を持っています。

---

## Vercel（ヴァーセル）

### Vercelとは

Vercelは、Webアプリケーションを公開するためのホスティングサービスです。
GitHubにコードをプッシュすると、自動的にビルド・デプロイされます。

### ダッシュボードへのアクセス

1. https://vercel.com にアクセス
2. アカウントでログイン
3. プロジェクト「gochisokoji-recipe-app」を選択

---

### デプロイの仕組み

```
開発者がコードを修正
    ↓
GitHubにプッシュ（git push）
    ↓
Vercelが自動的にビルド開始（約2分）
    ↓
ビルド成功 → www.gochisokoji.com に反映
```

**ポイント:**
- GitHubの `main` ブランチにプッシュすると、自動的に本番環境にデプロイされます
- ビルドには約2分かかります
- ビルドが失敗した場合、前回の正常なバージョンが維持されます

### 手動デプロイ方法

開発者がターミナルから手動でデプロイする場合:

```bash
vercel deploy --prod
```

---

### デプロイ履歴の確認

1. Vercelダッシュボードにログイン
2. プロジェクトを選択
3. 「Deployments」タブをクリック
4. 過去のデプロイ一覧が表示されます

各デプロイには以下の情報が表示されます:
- デプロイ日時
- コミットメッセージ（変更内容の概要）
- ビルドの成功/失敗状態
- プレビューURL

---

### ドメイン設定

| ドメイン | 用途 |
|---|---|
| www.gochisokoji.com | アプリ本体（カスタムドメイン） |
| gochisokoji-recipe-xxx.vercel.app | Vercelのデフォルトドメイン |

ドメインの設定は、Vercelダッシュボードの「Settings」→「Domains」から確認できます。

---

### 環境変数

Vercelダッシュボードの「Settings」→「Environment Variables」で管理されています。

**設定済みの環境変数:**

| 変数名 | 用途 |
|---|---|
| EXPO_PUBLIC_SUPABASE_URL | SupabaseプロジェクトのURL |
| EXPO_PUBLIC_SUPABASE_ANON_KEY | Supabaseの匿名キー |

> 環境変数を変更した場合は、再デプロイが必要です。

---

## APIサーバー（api.gochisokoji.com）

APIサーバーは、フロントエンド（アプリ画面）とAI・認証サービスを仲介するサーバーです。

### 主なAPIエンドポイント

| エンドポイント | 機能 |
|---|---|
| `/api/chat` | AIとのチャット（レシピ生成） |
| `/api/extract-recipe` | チャットからレシピ情報を抽出 |
| `/api/quick-menu-idea` | クイックメニュー案の生成 |
| `/api/tags` | タグ一覧の取得 |
| `/api/posts/view` | 閲覧数のカウントアップ |
| `/api/auth/email-login` | メールアドレスでのログイン |
| `/api/auth/email-signup` | メールアドレスでの新規登録 |
| `/api/auth/delete-account` | アカウント削除 |

### AI（Google Gemini API）

- AIレシピ生成にはGoogleの「Gemini」というAIモデルを使用しています
- APIサーバー経由でGemini APIに接続し、レシピを生成しています
- APIキーはサーバー側で管理されているため、アプリ画面からは見えません

---

## トラブルシューティング

### アプリが表示されない / 真っ白になる

**考えられる原因:**
1. Vercelのビルドが失敗している
   - Vercelダッシュボードの「Deployments」でビルド状態を確認
2. Supabaseが停止している
   - Supabaseダッシュボードでプロジェクトの状態を確認

**対処法:**
- Vercelダッシュボードから「Redeploy」を実行
- Supabaseの無料プランは一定期間使わないと停止するため、ダッシュボードで「Resume」

---

### ログインできない

**考えられる原因:**
1. Supabase Authの設定が変更された
2. Google OAuthの設定が無効になっている
3. APIサーバーが停止している

**対処法:**
- Supabaseダッシュボードの「Authentication」→「Providers」でGoogleが有効か確認
- APIサーバーの状態を確認（`https://api.gochisokoji.com` にアクセスして応答があるか）

---

### 画像が表示されない

**考えられる原因:**
1. Supabase Storageの容量制限に達している
2. 画像のURLが無効になっている

**対処法:**
- Supabaseダッシュボードの「Storage」でバケットの状態を確認
- 不要な画像を削除して容量を確保

---

### レシピが削除できない（管理者）

**考えられる原因:**
1. RLSポリシーが正しく設定されていない
2. 管理者アカウント（admin@gochisokoji.com）でログインしていない

**対処法:**
- `admin@gochisokoji.com`でログインし直す
- Supabase SQL Editorで管理者削除ポリシーが存在するか確認:
  ```sql
  SELECT * FROM pg_policies WHERE tablename = 'posts' AND policyname LIKE '%admin%';
  ```

---

## 重要な注意事項

1. **Supabaseの無料プラン**: 一定期間（7日間）データベースへのアクセスがないと自動停止します。停止した場合は、ダッシュボードから手動で「Resume」してください。

2. **バックアップ**: Supabaseの有料プランでは自動バックアップが利用可能です。重要なデータは定期的にエクスポートすることをお勧めします。

3. **環境変数の機密性**: `SUPABASE_SERVICE_KEY`（サービスロールキー）は、すべてのRLSを無視できる強力なキーです。絶対に外部に公開しないでください。

4. **ドメインの更新**: ドメイン（gochisokoji.com）の契約更新を忘れないようにしてください。

---

*最終更新: 2026年1月31日*
