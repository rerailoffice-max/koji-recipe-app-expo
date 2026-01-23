/**
 * レシピデータ一括修正スクリプト
 * 
 * 実行方法:
 * npx tsx scripts/fix-recipe-data.ts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// .env.localを読み込む
config({ path: '.env.local' });

// 環境変数から取得（実行時に設定）
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xvzwvwyjyiykdqvpxppf.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';

if (!SUPABASE_SERVICE_KEY) {
  console.error('Error: SUPABASE_SERVICE_KEY is required');
  process.exit(1);
}

if (!GEMINI_API_KEY) {
  console.error('Error: GEMINI_API_KEY is required');
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
  
  const patterns = [
    /^[ぁ-んァ-ヶー\u4e00-\u9faf、,]+$/,  // 材料名のみ（カンマ区切り）
    /^材料[:：]/,                          // "材料:" で始まる
    /、.*、.*、/,                          // カンマが3つ以上
  ];
  
  return patterns.some(pattern => pattern.test(description.trim()));
}

/**
 * 説明が一般的すぎるかチェック
 */
function isGenericDescription(description: string | null): boolean {
  if (!description) return true;
  
  const genericPatterns = [
    '麹調味料を使った美味しい料理です',
    '簡単に作れて栄養も豊富です',
  ];
  
  return genericPatterns.some(pattern => description.includes(pattern));
}

/**
 * コツが安直かチェック
 */
function isGenericTips(tips: string | null): boolean {
  if (!tips) return true;
  
  return tips === '麹調味料の量はお好みで調整してください。' ||
         tips.length < 20;
}

/**
 * Google Gemini APIを使用して説明・コツ・調理時間を生成
 */
async function generateRecipeContent(post: RecipePost): Promise<GeneratedContent> {
  // 材料と手順をわかりやすく整形
  const ingredientsList = (post.ingredients || [])
    .map((ing: any) => `${ing.name}: ${ing.amount}`)
    .join(', ');
  
  const stepsList = (post.steps || [])
    .map((step: any, index: number) => `${index + 1}. ${step.description}`)
    .join('\n');

  const prompt = `あなたはプロの料理研究家です。以下のレシピを分析して、読者の食欲をそそる説明と実用的なコツを生成してください。

【レシピタイトル】
${post.title}

【材料】
${ingredientsList}

【作り方】
${stepsList}

【要件】
1. 説明（50-100文字）:
   - 料理の魅力（味、食感、見た目）を具体的に表現してください
   - 例: 「外はカリッと、中はほくほく」のような食感の対比
   - 例: 「野菜の甘みが溶け込んだ」のような味の特徴
   - 例: 「ジューシーな〜と柔らかな〜が絡み合う」のような組み合わせの魅力
   - 絶対にNG: 材料の列挙、「麹調味料を使った」などの一般的な表現
   
2. コツ（30-80文字）:
   - このレシピ特有の具体的なテクニックや注意点を書いてください
   - 例: 「1cm厚さに切る」「弱火でじっくり3分」など具体的な数値
   - 例: 「中火で両面を3分ずつ焼くことで」のように方法と効果を明示
   - 例: 「大きめに切り、弱火でじっくり煮込むことでトロトロの食感に」
   - 絶対にNG: 「お好みで」「適量」などの曖昧な表現
   
3. 調理時間: 実際の調理手順を考慮して7-15分で現実的な時間を見積もってください

【出力形式】
必ずJSON形式のみで出力してください。他の文章は含めないでください。
{
  "description": "具体的で魅力的な説明",
  "tips": "実用的で具体的なコツ",
  "cookingTimeMin": 数値
}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 2048,
            topP: 0.95,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API Response:', errorText);
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    if (!text) {
      throw new Error('No text in Gemini response');
    }
    
    // JSONを抽出（```json ... ``` の場合も対応）
    let jsonText = text.trim();
    
    // コードブロックを除去
    if (jsonText.startsWith('```json')) {
      const match = jsonText.match(/```json\s*([\s\S]*?)\s*```/);
      if (match) {
        jsonText = match[1];
      }
    } else if (jsonText.startsWith('```')) {
      const match = jsonText.match(/```\s*([\s\S]*?)\s*```/);
      if (match) {
        jsonText = match[1];
      }
    }
    
    // 最初と最後の {} を探す
    const firstBrace = jsonText.indexOf('{');
    const lastBrace = jsonText.lastIndexOf('}');
    
    if (firstBrace === -1 || lastBrace === -1) {
      throw new Error('No JSON object found in response');
    }
    
    jsonText = jsonText.substring(firstBrace, lastBrace + 1);
    
    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('  JSON parse error:', parseError);
      console.error('  Failed JSON text:', jsonText);
      throw new Error(`Failed to parse JSON: ${parseError}`);
    }
    
    if (!parsed.description || !parsed.tips) {
      throw new Error('Missing required fields in response');
    }
    
    return {
      description: parsed.description || '',
      tips: parsed.tips || '',
      cookingTimeMin: Math.min(15, Math.max(7, parseInt(parsed.cookingTimeMin) || 10)),
    };
  } catch (error: any) {
    console.error('  ❌ AI生成エラー:', error.message);
    // エラーの場合はnullを返し、スキップする
    throw error;
  }
}

/**
 * 全レシピを修正
 */
async function fixAllRecipes(testMode = false, forceRegenerate = false) {
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

  // テストモードの場合は最初の2件のみ
  const recipesToProcess = testMode ? posts.slice(0, 2) : posts;
  
  console.log(`📚 ${recipesToProcess.length}件のレシピを処理します${testMode ? ' (テストモード)' : ''}${forceRegenerate ? ' (強制再生成)' : ''}\n`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < recipesToProcess.length; i++) {
    const post = recipesToProcess[i] as RecipePost;
    console.log(`[${i + 1}/${recipesToProcess.length}] ${post.title}`);

    // 修正が必要かチェック（強制再生成の場合は常に修正）
    const needsDescriptionFix = forceRegenerate || 
      isIngredientList(post.description) || 
      isGenericDescription(post.description) ||
      !post.description ||
      post.description.length < 30;
    
    const needsTips = forceRegenerate || 
      isGenericTips(post.tips);
    
    const needsTimeAdjustment = forceRegenerate || 
      !post.cooking_time_min || 
      post.cooking_time_min > 20;

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
        console.log(`  ❌ 更新失敗: ${updateError.message}\n`);
        failed++;
      } else {
        console.log(`  ✅ 更新完了`);
        if (updateData.description) console.log(`     説明: ${updateData.description}`);
        if (updateData.tips) console.log(`     コツ: ${updateData.tips}`);
        if (updateData.cooking_time_min) console.log(`     時間: ${updateData.cooking_time_min}分`);
        console.log('');
        updated++;
      }

      // レート制限対策: 2秒待機（より余裕を持たせる）
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error: any) {
      console.log(`  ❌ エラー: ${error.message}\n`);
      failed++;
    }
  }

  console.log('\n📊 処理完了');
  console.log(`   更新: ${updated}件`);
  console.log(`   スキップ: ${skipped}件`);
  console.log(`   失敗: ${failed}件`);
}

// メイン実行
const testMode = process.argv.includes('--test');
const forceRegenerate = process.argv.includes('--force');

if (testMode) {
  console.log('🧪 テストモードで実行します（最初の2件のみ処理）\n');
}

if (forceRegenerate) {
  console.log('🔄 強制再生成モードで実行します（すべてのレシピを再生成）\n');
}

fixAllRecipes(testMode, forceRegenerate)
  .then(() => {
    console.log('\n✨ すべての処理が完了しました');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ エラーが発生しました:', error);
    process.exit(1);
  });
