/**
 * レシピ現状確認スクリプト
 * 
 * 実行方法:
 * npx tsx scripts/check-recipe-status.ts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// .env.localを読み込む
config({ path: '.env.local' });

// 環境変数から取得
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xvzwvwyjyiykdqvpxppf.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

if (!SUPABASE_SERVICE_KEY) {
  console.error('Error: SUPABASE_SERVICE_KEY is required');
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

/**
 * 説明が材料リスト形式かチェック
 */
function isIngredientList(description: string | null): boolean {
  if (!description) return true;
  
  const patterns = [
    /^[ぁ-んァ-ヶー\u4e00-\u9faf、,]+$/,
    /^材料[:：]/,
    /、.*、.*、/,
  ];
  
  return patterns.some(pattern => pattern.test(description.trim()));
}

/**
 * 修正が必要かどうかを判定
 */
function needsFix(post: RecipePost): {
  description: boolean;
  tips: boolean;
  time: boolean;
  reason: string[];
} {
  const reasons: string[] = [];
  
  // 説明のチェック
  const descriptionNeedsFix = 
    !post.description || 
    post.description.length < 30 ||
    isIngredientList(post.description) ||
    post.description.includes('麹調味料を使った美味しい料理');
  
  if (!post.description) {
    reasons.push('説明が空');
  } else if (post.description.length < 30) {
    reasons.push('説明が短すぎる（30文字未満）');
  } else if (isIngredientList(post.description)) {
    reasons.push('説明が材料リスト形式');
  } else if (post.description.includes('麹調味料を使った美味しい料理')) {
    reasons.push('説明が一般的すぎる');
  }
  
  // コツのチェック
  const tipsNeedsFix = 
    !post.tips ||
    post.tips === '麹調味料の量はお好みで調整してください。' ||
    post.tips.length < 20;
  
  if (!post.tips) {
    reasons.push('コツが空');
  } else if (post.tips === '麹調味料の量はお好みで調整してください。') {
    reasons.push('コツが安直（デフォルト文）');
  } else if (post.tips.length < 20) {
    reasons.push('コツが短すぎる（20文字未満）');
  }
  
  // 調理時間のチェック
  const timeNeedsFix = !post.cooking_time_min || post.cooking_time_min > 20;
  
  if (!post.cooking_time_min) {
    reasons.push('調理時間が未設定');
  } else if (post.cooking_time_min > 20) {
    reasons.push(`調理時間が長すぎる（${post.cooking_time_min}分）`);
  }
  
  return {
    description: descriptionNeedsFix,
    tips: tipsNeedsFix,
    time: timeNeedsFix,
    reason: reasons,
  };
}

/**
 * 全レシピの状態を確認
 */
async function checkAllRecipes() {
  console.log('🔍 レシピを取得中...\n');
  
  const { data: posts, error } = await supabase
    .from('posts')
    .select('*')
    .eq('is_public', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching posts:', error);
    return;
  }

  if (!posts || posts.length === 0) {
    console.log('レシピが見つかりませんでした');
    return;
  }

  console.log(`📚 全${posts.length}件のレシピを分析します\n`);
  console.log('=' .repeat(80));
  
  let needsFixCount = 0;
  let okCount = 0;
  const needsFixList: string[] = [];
  
  for (let i = 0; i < posts.length; i++) {
    const post = posts[i] as RecipePost;
    const check = needsFix(post);
    const hasIssue = check.description || check.tips || check.time;
    
    if (hasIssue) {
      needsFixCount++;
      needsFixList.push(post.title);
    } else {
      okCount++;
    }
    
    console.log(`\n[${i + 1}/${posts.length}] ${post.title}`);
    console.log(`状態: ${hasIssue ? '❌ 修正必要' : '✅ OK'}`);
    
    if (hasIssue) {
      console.log(`理由: ${check.reason.join(', ')}`);
    }
    
    console.log(`説明: ${post.description || '(なし)'}`);
    console.log(`コツ: ${post.tips || '(なし)'}`);
    console.log(`調理時間: ${post.cooking_time_min || '(なし)'}分`);
    console.log('-'.repeat(80));
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('📊 集計結果');
  console.log('='.repeat(80));
  console.log(`✅ 修正不要: ${okCount}件`);
  console.log(`❌ 修正必要: ${needsFixCount}件`);
  
  if (needsFixCount > 0) {
    console.log('\n【修正が必要なレシピ一覧】');
    needsFixList.forEach((title, index) => {
      console.log(`${index + 1}. ${title}`);
    });
  }
  
  console.log('\n' + '='.repeat(80));
}

// メイン実行
checkAllRecipes()
  .then(() => {
    console.log('\n✨ 確認完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ エラーが発生しました:', error);
    process.exit(1);
  });
