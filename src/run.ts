/**
 * 実行エントリーポイント
 *
 * GitHub Actionsから環境変数を受け取り、ワークフローを実行します
 *
 * 受入基準:
 * - 要件2.1: コメント本文から「[must]」接頭辞を削除する
 * - 要件5.4: 環境変数からコメント情報を取得し、ワークフローを実行
 * - 要件9.1: エラーハンドリングとログ出力
 */

import { fileWriterTool } from "./mastra/tools/file-writer-tool";
import { gitCommitTool } from "./mastra/tools/git-commit-tool";

async function main() {
  console.log("🚀 Review Knowledge Automation を開始します...\n");

  try {
    // 環境変数から取得
    const commentBody = process.env.COMMENT_BODY || "";
    const commentUrl = process.env.COMMENT_URL || "";
    const prBranch = process.env.PR_BRANCH || "";
    const timestamp = process.env.TIMESTAMP || new Date().toISOString();

    console.log("📋 環境変数を取得しました:");
    console.log(`  COMMENT_BODY: ${commentBody.substring(0, 50)}...`);
    console.log(`  COMMENT_URL: ${commentUrl}`);
    console.log(`  PR_BRANCH: ${prBranch}`);
    console.log(`  TIMESTAMP: ${timestamp}`);
    console.log("");

    // バリデーション
    if (!commentBody || commentBody.trim().length === 0) {
      throw new Error("COMMENT_BODY が空です");
    }

    if (!commentUrl) {
      throw new Error("COMMENT_URL が設定されていません");
    }

    if (!prBranch) {
      throw new Error("PR_BRANCH が設定されていません");
    }

    // [must]接頭辞を除去（要件2.1）
    const cleanedBody = commentBody.replace(/^\[must\]\s*/i, "");
    console.log("✅ [must]接頭辞を除去しました");
    console.log("");

    // タイムスタンプを日本語形式に変換
    const date = new Date(timestamp);
    const formattedDate = date.toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    // フォーマット
    const formattedContent = `
---
## [追加日時: ${formattedDate}]
出典: ${commentUrl}

${cleanedBody}

`;

    console.log("📝 Step 1: フォーマットと追記処理を開始します");

    // ファイルに追記
    const writeResult = await fileWriterTool.execute({
      context: {
        filePath: "agents/policy.md",
        content: formattedContent,
        mode: "append",
      },
    });

    if (writeResult.success) {
      console.log(
        `✅ agents/policy.mdに追記しました（${writeResult.bytesWritten} バイト）`
      );
    } else {
      throw new Error("ファイル書き込みに失敗しました");
    }

    console.log("");
    console.log("📝 Step 2: Gitコミット・プッシュ処理を開始します");

    // コミットメッセージ
    const commitMessage = `chore: [must]コメントからナレッジ自動追加\n\n出典: ${commentUrl}`;

    // Gitコミット・プッシュ
    const commitResult = await gitCommitTool.execute({
      context: {
        filePaths: ["agents/policy.md"],
        commitMessage,
        branch: prBranch,
      },
    });
    console.log("a");

    if (commitResult.success) {
      console.log(`✅ Gitコミット・プッシュが成功しました`);
      console.log(`  コミットハッシュ: ${commitResult.commitHash}`);
      console.log(`  ブランチ: ${prBranch}`);
    } else {
      throw new Error(
        `Gitコミット・プッシュに失敗しました: ${commitResult.error}`
      );
    }
    console.log("b");

    console.log("");
    console.log("🎉 ナレッジ自動追加が完了しました！");
    process.exit(0);
  } catch (error: any) {
    console.error("");
    console.error("❌ エラーが発生しました:");
    console.error(`  ${error.message}`);

    if (error.stack) {
      console.error("");
      console.error("スタックトレース:");
      console.error(error.stack);
    }

    process.exit(1);
  }
}

main();
