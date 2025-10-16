/**
 * Simple Append Workflow の手動テスト
 * 
 * ワークフローの各ステップを個別に実行してテストします
 */

import { fileWriterTool } from "./src/mastra/tools/file-writer-tool.js";
import { gitCommitTool } from "./src/mastra/tools/git-commit-tool.js";
import fs from "fs/promises";
import simpleGit from "simple-git";

async function testSimpleAppendManual() {
  console.log("🧪 Simple Append Workflow の手動テストを開始します...\n");
  
  let passedTests = 0;
  let failedTests = 0;
  
  const git = simpleGit();
  const currentBranch = await git.revparse(['--abbrev-ref', 'HEAD']);
  
  // テストデータ
  const testComment = {
    body: "変数名は具体的で意味が明確な名前を使用すること。\n単一文字の変数名（i, j, k以外）は避けるべきである。",
    url: "https://github.com/test/repo/pull/1#issuecomment-123",
    timestamp: new Date().toISOString()
  };
  
  // Step 1: フォーマットと追記処理
  try {
    console.log("Step 1: フォーマットと追記処理");
    
    // タイムスタンプを日本語形式に変換
    const date = new Date(testComment.timestamp);
    const formattedDate = date.toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
    
    // フォーマット
    const formattedContent = `
---
## [追加日時: ${formattedDate}]
出典: ${testComment.url}

${testComment.body}

`;
    
    console.log("✅ コンテンツをフォーマットしました");
    
    // ファイルに追記
    const writeResult = await fileWriterTool.execute({
      context: {
        filePath: "agents/policy.md",
        content: formattedContent,
        mode: "append"
      }
    });
    
    if (writeResult.success) {
      console.log(`✅ Step 1: 成功 - agents/policy.mdに追記しました（${writeResult.bytesWritten} バイト）`);
      passedTests++;
    } else {
      console.log("❌ Step 1: 失敗");
      failedTests++;
    }
    
  } catch (error: any) {
    console.log(`❌ Step 1: エラー - ${error.message}`);
    failedTests++;
  }
  
  console.log("");
  
  // Step 2: ファイル内容の確認
  try {
    console.log("Step 2: ファイル内容の確認");
    
    const fileContent = await fs.readFile("agents/policy.md", "utf-8");
    
    const containsComment = fileContent.includes("変数名は具体的で意味が明確な名前を使用すること");
    const containsUrl = fileContent.includes(testComment.url);
    const containsTimestamp = fileContent.includes("追加日時:");
    const hasDelimiter = fileContent.includes("---");
    const hasHeader = fileContent.includes("## [追加日時:");
    const hasSource = fileContent.includes("出典:");
    
    if (containsComment && containsUrl && containsTimestamp && hasDelimiter && hasHeader && hasSource) {
      console.log("✅ Step 2: 成功 - ファイル内容が正しいです");
      console.log(`  ファイルサイズ: ${fileContent.length} 文字`);
      console.log(`  コメント内容: ✅`);
      console.log(`  出典URL: ✅`);
      console.log(`  タイムスタンプ: ✅`);
      console.log(`  フォーマット: ✅`);
      passedTests++;
    } else {
      console.log("❌ Step 2: 失敗");
      console.log(`  コメント内容: ${containsComment ? '✅' : '❌'}`);
      console.log(`  出典URL: ${containsUrl ? '✅' : '❌'}`);
      console.log(`  タイムスタンプ: ${containsTimestamp ? '✅' : '❌'}`);
      console.log(`  区切り線: ${hasDelimiter ? '✅' : '❌'}`);
      console.log(`  見出し: ${hasHeader ? '✅' : '❌'}`);
      console.log(`  出典: ${hasSource ? '✅' : '❌'}`);
      failedTests++;
    }
    
  } catch (error: any) {
    console.log(`❌ Step 2: エラー - ${error.message}`);
    failedTests++;
  }
  
  console.log("");
  
  // Step 3: Gitコミット・プッシュ
  try {
    console.log("Step 3: Gitコミット・プッシュ");
    
    const commitMessage = `chore: [must]コメントからナレッジ自動追加\n\n出典: ${testComment.url}`;
    
    const commitResult = await gitCommitTool.execute({
      context: {
        filePaths: ["agents/policy.md"],
        commitMessage,
        branch: currentBranch
      }
    });
    
    if (commitResult.success) {
      console.log(`✅ Step 3: 成功 - Gitコミット・プッシュが完了しました`);
      console.log(`  コミットハッシュ: ${commitResult.commitHash}`);
      console.log(`  ブランチ: ${currentBranch}`);
      passedTests++;
    } else {
      console.log(`❌ Step 3: 失敗 - ${commitResult.error}`);
      failedTests++;
    }
    
  } catch (error: any) {
    console.log(`❌ Step 3: エラー - ${error.message}`);
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

testSimpleAppendManual();
