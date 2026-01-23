/**
 * レシピデータ一括修正スクリプト
 * 
 * 実行方法:
 * npx ts-node scripts/fix-recipe-data.ts
 */

import { createClient } from '@supabase/supabase-js';

// 環境変数から取得（実行時に設定）
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qsawvvmmmypihunojheo.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || '';

if (!SUPABASE_SERVICE_KEY) {
  console.error('Error: SUPABASE_SERVICE_KEY is required');
  process.exit(1);
}

if (!GOOGLE_API_KEY) {
  console.error('Error: GOOGLE_API_KEY is required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface RecipePost {
  id: string;
  title: string;
  description: string | null;
  tips: string | null;
  ingredients: any[];
  steps: any[];
  cooking_time_min: number | null;
}

interface GeneratedContent {
  description: string;
  tips: string;
  cookingTimeMin: number;
}

/**
 * 説明が材料リスト形式かチェック
 */
function isIngredientList(description: string | null): boolean {
  if (!description) return true;
  
  // カンマ区切りの材料リストっぽいパターン
  const patterns = [
    /^[ぁ-んァ-ヶー\u4e00-\u9faf、,]+$/,  // 材料名のみ（カンマ区切り）
    /^材料[:：]/,                          // "材料:" で始まる
    /、.*、.*、/,                          // カンマが3つ以上
  ];
  
  return patterns.some(pattern => pattern.test(description.trim()));
}

/**
 * Google Gemini APIを使用して説明・コツ・調理時間を生成
 */
async function generateRecipeContent(post: RecipePost): Promise<GeneratedContent> {
  const prompt = `以下のレシピ情報から、適切な説明、コツ・ポイント、調理時間を生成してください。

タイトル: ${post.title}
材料: ${JSON.stringify(post.ingredients || [])}
作り方: ${JSON.stringify(post.steps || [])}

出力は必ずJSON形式で、以下の形式に従ってください:
{
  "description": "料理の簡潔な説明（2-3文、50-100文字）。料理の特徴や味わいを説明し、材料を列挙しないこと。",
  "tips": "調理のコツやポイント（1-2文、30-80文字）。具体的な調理テクニックや注意点を記載。",
  "cookingTimeMin": 7から15の範囲の整数（実際の調理時間を短めに見積もる）
}

注意事項:
- descriptionには材料を列挙せず、料理の特徴や美味しさを説明してください
- tipsには具体的で実用的な調理のコツを記載してください
- cookingTimeMinは実際に作れる現実的な時間にしてください（7-15分）
- 必ずJSON形式で出力してください`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GOOGLE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    const text = data.candidates[0]?.content?.parts[0]?.text || '';
    
    // JSONを抽出（```json ... ``` の場合も対応）
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    
    const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
    
    return {
      description: parsed.description || '',
      tips: parsed.tips || '',
      cookingTimeMin: Math.min(15, Math.max(7, parseInt(parsed.cookingTimeMin) || 10)),
    };
  } catch (error) {
    console.error('Error generating content:', error);
    // フォールバック値を返す
    return {
      description: `${post.title}は、麹調味料を使った美味しい料理です。簡単に作れて栄養も豊富です。`,
      tips: '麹調味料の量はお好みで調整してください。',
      cookingTimeMin: 10,
    };
  }
}

/**
 * 全レシピを修正
 */
async function fixAllRecipes() {
  console.log('🔍 レシピを取得中...');
  
  // 全レシピを取得
  const { data: posts, error } = await supabase
    .from('posts')
    .select('*')
    .eq('is_public', true);

  if (error) {
    console.error('Error fetching posts:', error);
    return;
  }

  if (!posts || posts.length === 0) {
    console.log('レシピが見つかりませんでした');
    return;
  }

  console.log(`📚 ${posts.length}件のレシピを処理します\n`);

  let updated = 0;
  let skipped = 0;

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i] as RecipePost;
    console.log(`[${i + 1}/${posts.length}] ${post.title}`);

    // 修正が必要かチェック
    const needsDescriptionFix = isIngredientList(post.description);
    const needsTips = !post.tips || post.tips.trim().length === 0;
    const needsTimeAdjustment = !post.cooking_time_min || post.cooking_time_min > 20;

    if (!needsDescriptionFix && !needsTips && !needsTimeAdjustment) {
      console.log('  ✓ スキップ（修正不要）\n');
      skipped++;
      continue;
    }

    console.log(`  修正項目: ${needsDescriptionFix ? '説明 ' : ''}${needsTips ? 'コツ ' : ''}${needsTimeAdjustment ? '時間' : ''}`);

    try {
      // AIで生成
      const generated = await generateRecipeContent(post);
      
      // 更新データを準備
      const updateData: any = {};
      
      if (needsDescriptionFix) {
        updateData.description = generated.description;
      }
      
      if (needsTips) {
        updateData.tips = generated.tips;
      }
      
      if (needsTimeAdjustment) {
        updateData.cooking_time_min = generated.cookingTimeMin;
      }

      // データベースを更新
      const { error: updateError } = await supabase
        .from('posts')
        .update(updateData)
        .eq('id', post.id);

      if (updateError) {
        console.log(`  ❌ 更新失敗: ${updateError.message}`);
      } else {
        console.log(`  ✅ 更新完了`);
        console.log(`     説明: ${updateData.description || '変更なし'}`);
        console.log(`     コツ: ${updateData.tips || '変更なし'}`);
        console.log(`     時間: ${updateData.cooking_time_min || '変更なし'}分\n`);
        updated++;
      }

      // レート制限対策: 1秒待機
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.log(`  ❌ エラー: ${error}\n`);
    }
  }

  console.log('\n📊 処理完了');
  console.log(`   更新: ${updated}件`);
  console.log(`   スキップ: ${skipped}件`);
}

// メイン実行
fixAllRecipes()
  .then(() => {
    console.log('\n✨ すべての処理が完了しました');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ エラーが発生しました:', error);
    process.exit(1);
  });
