/**
 * Simple Append Workflow のテスト
 * 
 * 受入基準:
 * 1. コメント本文が正しくフォーマットされるか
 * 2. agents/policy.mdに正しく追記されるか
 * 3. Gitコミット・プッシュが成功するか
 * 4. ワークフロー全体が正常に完了するか
 */

import { mastra } from "./src/mastra/index.js";
import fs from "fs/promises";
import simpleGit from "simple-git";

async function testSimpleAppendWorkflow() {
  console.log("🧪 Simple Append Workflow のテストを開始します...\n");
  
  let passedTests = 0;
  let failedTests = 0;
  
  const git = simpleGit();
  const currentBranch = await git.revparse(['--abbrev-ref', 'HEAD']);
  
  // テスト1: ワークフロー全体の実行
  try {
    console.log("テスト1: ワークフロー全体の実行");
    
    // テストデータ
    const testComment = {
      body: "変数名は具体的で意味が明確な名前を使用すること。\n単一文字の変数名（i, j, k以外）は避けるべきである。",
      url: "https://github.com/test/repo/pull/1#issuecomment-123",
      timestamp: new Date().toISOString()
    };
    
    // ワークフローを取得
    const workflow = mastra.getWorkflow("simpleAppendWorkflow");
    
    if (!workflow) {
      throw new Error("simpleAppendWorkflow が見つかりません");
    }
    
    console.log("✅ ワークフローを取得しました");
    
    // ワークフローを実行
    const result = await workflow.execute({
      comment: testComment,
      prBranch: currentBranch
    });
    
    console.log("✅ ワークフローが完了しました");
    console.log(`  結果:`, result);
    
    // agents/policy.mdの内容を確認
    const fileContent = await fs.readFile("agents/policy.md", "utf-8");
    
    // 検証
    const containsComment = fileContent.includes("変数名は具体的で意味が明確な名前を使用すること");
    const containsUrl = fileContent.includes(testComment.url);
    const containsTimestamp = fileContent.includes("追加日時:");
    
    if (containsComment && containsUrl && containsTimestamp) {
      console.log("✅ テスト1: 成功 - ワークフローが正常に完了しました");
      console.log(`  ファイルサイズ: ${fileContent.length} 文字`);
      console.log(`  コメント内容: 含まれている`);
      console.log(`  出典URL: 含まれている`);
      console.log(`  タイムスタンプ: 含まれている`);
      passedTests++;
    } else {
      console.log("❌ テスト1: 失敗 - 期待される内容が含まれていません");
      console.log(`  コメント内容: ${containsComment ? '✅' : '❌'}`);
      console.log(`  出典URL: ${containsUrl ? '✅' : '❌'}`);
      console.log(`  タイムスタンプ: ${containsTimestamp ? '✅' : '❌'}`);
      failedTests++;
    }
    
  } catch (error: any) {
    console.log(`❌ テスト1: エラー - ${error.message}`);
    console.error(error);
    failedTests++;
  }
  
  console.log("");
  
  // テスト2: フォーマットの確認
  try {
    console.log("テスト2: フォーマットの確認");
    
    const fileContent = await fs.readFile("agents/policy.md", "utf-8");
    
    // フォーマットの検証
    const hasDelimiter = fileContent.includes("---");
    const hasHeader = fileContent.includes("## [追加日時:");
    const hasSource = fileContent.includes("出典:");
    
    if (hasDelimiter && hasHeader && hasSource) {
      console.log("✅ テスト2: 成功 - フォーマットが正しいです");
      console.log(`  区切り線: ${hasDelimiter ? '✅' : '❌'}`);
      console.log(`  見出し: ${hasHeader ? '✅' : '❌'}`);
      console.log(`  出典: ${hasSource ? '✅' : '❌'}`);
      passedTests++;
    } else {
      console.log("❌ テスト2: 失敗 - フォーマットが正しくありません");
      failedTests++;
    }
    
  } catch (error: any) {
    console.log(`❌ テスト2: エラー - ${error.message}`);
    failedTests++;
  }
  
  console.log("");
  console.log("=".repeat(50));
  console.log(`テスト結果: ${passedTests}/${passedTests + failedTests} 成功`);
  
  if (failedTests === 0) {
    console.log("🎉 全てのテストが成功しました！");
    console.log("\n📝 agents/policy.mdの内容:");
    const fileContent = await fs.readFile("agents/policy.md", "utf-8");
    console.log(fileContent);
    process.exit(0);
  } else {
    console.log("❌ 一部のテストが失敗しました");
    process.exit(1);
  }
}

testSimpleAppendWorkflow();
