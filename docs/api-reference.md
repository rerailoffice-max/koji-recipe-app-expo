# GOCHISOKOJI API リファレンス

**ベースURL**: `https://api.gochisokoji.com`

このドキュメントでは、GOCHISOKOJIのAPIサーバーが提供する全エンドポイントの仕様を記載します。

---

## エンドポイント一覧

| メソッド | パス | 機能 | 認証 |
|---|---|---|---|
| POST | `/api/chat` | AIチャット（レシピ生成） | 不要 |
| POST | `/api/extract-recipe` | チャットからレシピ情報を抽出 | 不要 |
| POST | `/api/quick-menu-idea` | クイックメニュー案の生成 | 不要 |
| GET | `/api/tags` | タグ一覧の取得 | 不要 |
| POST | `/api/posts/view` | 閲覧数のカウントアップ | 不要 |
| GET | `/api/weekly-recipes` | 今週のおすすめレシピ | 不要 |
| POST | `/api/auth/email-login` | メールアドレスでログイン | 不要 |
| POST | `/api/auth/email-signup` | メールアドレスで新規登録 | 不要 |
| POST | `/api/auth/delete-account` | アカウント削除 | Bearer Token |

---

## AI関連

### POST `/api/chat`

AIとのチャットでレシピを生成・相談する。

#### リクエスト

```json
{
  "messages": [
    {
      "role": "user",
      "text": "簡単な旨塩麹の和え物を教えて",
      "attachments": [
        {
          "kind": "image",
          "mimeType": "image/jpeg",
          "dataBase64": "..."
        }
      ]
    }
  ],
  "kojiType": "旨塩風こうじ調味料",
  "firstTurn": true,
  "isQuickRecipeMode": false
}
```

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| messages | Array | はい | チャット履歴 |
| messages[].role | `"user"` or `"ai"` | はい | メッセージの送信者 |
| messages[].text | string | はい | メッセージ本文 |
| messages[].attachments | Array | いいえ | 画像添付（Base64） |
| kojiType | string | いいえ | 麹タイプの指定 |
| firstTurn | boolean | いいえ | 最初のメッセージかどうか |
| isQuickRecipeMode | boolean | いいえ | クイックレシピモード |

#### レスポンス（成功: 200）

```json
{
  "success": true,
  "reply": "旨塩麹の和え物、さっぱりしてて美味しいよね！✨\nどんなお野菜を使って作りたいかな？😊",
  "suggestions": [
    { "label": "きゅうり", "text": "きゅうり" },
    { "label": "キャベツ", "text": "キャベツ" }
  ],
  "shouldShowCreateButton": false,
  "suggestedKoji": "旨塩風こうじ調味料",
  "popular": [
    {
      "id": "uuid-xxx",
      "title": "ささみの旨塩和え",
      "imageUrl": "https://...",
      "kojiType": "たまねぎ麹",
      "viewCount": 42
    }
  ]
}
```

| フィールド | 型 | 説明 |
|---|---|---|
| reply | string | AIの返答テキスト |
| suggestions | Array | 候補ボタン（ラベルとテキスト） |
| shouldShowCreateButton | boolean | 「下書きを作成」ボタンを表示するか |
| suggestedKoji | string or null | 推奨する麹タイプ |
| popular | Array | 人気のレシピ（初回ターンのみ） |

---

### POST `/api/extract-recipe`

チャット履歴からレシピ情報を構造化データとして抽出する。

#### リクエスト

```json
{
  "messages": [
    { "role": "user", "text": "ささみの旨塩和え教えて" },
    { "role": "ai", "text": "ささみの旨塩和えのレシピはこちらです！..." }
  ]
}
```

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| messages | Array | はい | チャット履歴 |

#### レスポンス（成功: 200）

```json
{
  "success": true,
  "recipe": {
    "title": "ささみの旨塩和え",
    "description": "さっぱりとした旨味が広がる一品",
    "koji_type": "たまねぎ麹",
    "difficulty": "かんたん",
    "ingredients": [
      { "name": "ささみ", "amount": "2本" },
      { "name": "旨塩麹", "amount": "大さじ1" }
    ],
    "steps": [
      { "order": 1, "description": "ささみを茹でてほぐす" },
      { "order": 2, "description": "旨塩麹と和える" }
    ],
    "tips": "仕上げにごま油を少し垂らすと風味アップ",
    "cooking_time_min": 10,
    "tags": ["和食", "時短"]
  }
}
```

---

### POST `/api/quick-menu-idea`

カテゴリを指定して、AIがメニュー案を即座に生成する。

#### リクエスト（単一カテゴリ）

```json
{
  "promptCategory": "5分で簡単レシピ"
}
```

#### リクエスト（全カテゴリ一括）

```json
{
  "allCategories": true
}
```

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| promptCategory | string | いいえ | カテゴリ名（3案生成） |
| allCategories | boolean | いいえ | 全カテゴリ一括生成 |

> `promptCategory` か `allCategories` のどちらか一方が必要。

**利用可能なカテゴリ:**
- `5分で簡単レシピ`
- `主菜を考える`
- `副菜を考える`
- `スープ・汁物`
- `おつまみ`
- `お弁当おかず`

#### レスポンス（成功: 200 - 単一カテゴリ）

```json
{
  "success": true,
  "menuIdeas": [
    {
      "kojiType": "旨塩風こうじ調味料",
      "title": "豆腐とニラの旨塩風ナムル",
      "summary": "旨塩風のコクでごま油香る本格派。",
      "keyIngredients": ["豆腐", "ニラ", "旨塩風"],
      "steps": [
        "ニラはさっと茹でて水気を切る",
        "旨塩風とごま油を混ぜる",
        "野菜と調味料を和えて完成"
      ],
      "timeMinutes": 5,
      "caloriesKcal": 66,
      "saltG": 0.6
    }
  ]
}
```

#### レスポンス（成功: 200 - 全カテゴリ）

```json
{
  "success": true,
  "results": {
    "5分で簡単レシピ": {
      "menuIdeas": [...]
    },
    "主菜を考える": {
      "menuIdeas": [...]
    }
  }
}
```

---

### GET `/api/weekly-recipes`

今週のおすすめレシピ（7日分）を取得する。AIが生成し、キャッシュされる。

#### レスポンス（成功: 200）

```json
{
  "recipes": [
    {
      "id": "uuid-xxx",
      "day": "月",
      "title": "ささみの旨塩和え",
      "image": "https://..."
    },
    {
      "id": "uuid-yyy",
      "day": "火",
      "title": "中華風キャベツ炒め",
      "image": null
    }
  ],
  "generatedAt": "2026-01-31T10:00:00.000Z",
  "cached": true,
  "source": "ai"
}
```

| フィールド | 型 | 説明 |
|---|---|---|
| recipes | Array | 7日分のレシピ |
| recipes[].day | string | 曜日（月〜日） |
| generatedAt | string | 生成日時（ISO 8601） |
| cached | boolean | キャッシュから返したか |
| source | `"ai"` or `"fallback"` | 生成元 |

---

## データ関連

### GET `/api/tags`

レシピに付けられるタグの一覧を取得する。

#### レスポンス（成功: 200）

```json
{
  "success": true,
  "tags": [
    {
      "id": "uuid-xxx",
      "name": "和食",
      "category": "style",
      "emoji": "🍱",
      "display_order": 1
    }
  ],
  "byCategory": {
    "ingredient": [...],
    "style": [...],
    "diet": [...],
    "dish_type": [...]
  },
  "fromDb": true
}
```

| フィールド | 型 | 説明 |
|---|---|---|
| tags | Array | 全タグのフラットリスト |
| byCategory | Object | カテゴリ別に分類されたタグ |
| fromDb | boolean | DBから取得できたか |

> エラー時もフォールバックデータを返すため、常に200を返します。

---

### POST `/api/posts/view`

レシピの閲覧数をカウントアップする。RLSをバイパスするためにAPI経由で実行。

#### リクエスト

```json
{
  "postId": "uuid-xxx"
}
```

#### レスポンス（成功: 200）

```json
{
  "success": true,
  "viewCount": 43
}
```

#### レスポンス（エラー: 404）

```json
{
  "success": false,
  "error": "Post not found"
}
```

---

## 認証関連

### POST `/api/auth/email-login`

メールアドレスとパスワードでログインする。

#### リクエスト

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### レスポンス（成功: 200）

```json
{
  "success": true,
  "session": {
    "access_token": "eyJhbGci...",
    "refresh_token": "abc123...",
    "expires_at": 1700000000
  },
  "user": {
    "id": "uuid-xxx",
    "email": "user@example.com"
  }
}
```

#### レスポンス（エラー: 401）

```json
{
  "success": false,
  "error": "メールアドレスまたはパスワードが正しくありません"
}
```

---

### POST `/api/auth/email-signup`

メールアドレスとパスワードで新規登録する。

#### リクエスト

```json
{
  "email": "newuser@example.com",
  "password": "password123"
}
```

| フィールド | 型 | 必須 | 制約 |
|---|---|---|---|
| email | string | はい | 有効なメールアドレス |
| password | string | はい | 6文字以上 |

#### レスポンス（成功: 200 - メール確認が必要）

```json
{
  "success": true,
  "needsEmailConfirmation": true,
  "message": "確認メールを送信しました。メール内のリンクをクリックしてください。"
}
```

#### レスポンス（成功: 200 - 即時ログイン）

```json
{
  "success": true,
  "needsEmailConfirmation": false,
  "session": {
    "access_token": "eyJhbGci...",
    "refresh_token": "abc123...",
    "expires_at": 1700000000
  },
  "user": {
    "id": "uuid-xxx",
    "email": "newuser@example.com"
  }
}
```

#### レスポンス（エラー: 400 - 登録済み）

```json
{
  "success": false,
  "error": "このメールアドレスは既に登録されています",
  "alreadyRegistered": true
}
```

---

### POST `/api/auth/delete-account`

ログイン中のユーザーのアカウントを削除する。

#### リクエストヘッダー

```
Authorization: Bearer <access_token>
```

#### リクエストボディ

なし

#### レスポンス（成功: 200）

```json
{
  "success": true,
  "message": "アカウントを削除しました",
  "deletedUserId": "uuid-xxx"
}
```

#### レスポンス（エラー: 401）

```json
{
  "success": false,
  "error": "認証が必要です"
}
```

---

## エラーレスポンスの共通形式

すべてのエンドポイントで、エラー時は以下の形式で返されます。

```json
{
  "error": "エラーメッセージ",
  "details": "詳細情報（オプション）"
}
```

または

```json
{
  "success": false,
  "error": "エラーメッセージ"
}
```

### HTTPステータスコード

| コード | 意味 |
|---|---|
| 200 | 成功 |
| 400 | リクエスト不正（必須パラメータ不足など） |
| 401 | 認証エラー（トークン不正・期限切れ） |
| 404 | リソースが見つからない |
| 500 | サーバー内部エラー |

---

## 使用しているAIモデル

| モデル | 用途 |
|---|---|
| `gemini-3-flash-preview` | テキスト生成（チャット、レシピ生成） |
| `text-embedding-004` | テキスト埋め込み（RAG用） |

モデル名は `01-koji-project/src/lib/gemini/client.ts` の `getModelName()` で管理されています。
環境変数 `GEMINI_MODEL` で上書き可能です。

---

## CORS設定

APIサーバーはNext.jsのデフォルトCORS設定を使用しています。
`www.gochisokoji.com` からのリクエストは許可されています。

---

*最終更新: 2026年1月31日*
