# レシピデータ一括修正手順

## ステップ1: tipsカラムをデータベースに追加

1. Supabase Dashboardにログイン: https://supabase.com/dashboard
2. プロジェクトを選択
3. 左サイドバーから「SQL Editor」を選択
4. 「New Query」をクリック
5. `supabase/add_tips_column.sql` の内容をコピー＆ペースト
6. 「Run」ボタンをクリックして実行

## ステップ2: 環境変数を設定

スクリプト実行前に、以下の環境変数を設定してください：

```bash
export SUPABASE_URL="https://qsawvvmmmypihunojheo.supabase.co"
export SUPABASE_SERVICE_KEY="your-service-role-key-here"
export GOOGLE_API_KEY="your-google-api-key-here"
```

SUPABASE_SERVICE_KEYは、Supabase Dashboard > Settings > API > service_role key から取得できます。

## ステップ3: 依存パッケージをインストール

```bash
npm install --save-dev @supabase/supabase-js ts-node
```

## ステップ4: スクリプトを実行

```bash
npx ts-node scripts/fix-recipe-data.ts
```

## 注意事項

- スクリプトは全レシピを順次処理します（時間がかかる場合があります）
- API呼び出しのレート制限対策として、各レシピ間に1秒の待機時間があります
- 処理中は進捗がコンソールに表示されます
- エラーが発生した場合でも、次のレシピの処理は続行されます

## スクリプトの動作

1. 全公開レシピを取得
2. 各レシピについて：
   - 説明が材料リスト形式かチェック
   - tipsが空かチェック
   - 調理時間が20分以上かチェック
3. 修正が必要な場合：
   - Google Gemini APIで適切な説明・コツ・時間を生成
   - データベースを更新
4. 処理結果をコンソールに表示

## トラブルシューティング

### エラー: SUPABASE_SERVICE_KEY is required

環境変数が設定されていません。ステップ2を確認してください。

### エラー: Gemini API error

Google API Keyが無効または制限に達しています。APIキーを確認してください。

### レート制限エラー

処理を一時停止し、しばらく待ってから再実行してください。
