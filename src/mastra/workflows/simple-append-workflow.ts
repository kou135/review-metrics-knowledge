import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { fileWriterTool } from "../tools/file-writer-tool";
import { gitCommitTool } from "../tools/git-commit-tool";

/**
 * Simple Append Workflow (MVP)
 *
 * [must]コメントをそのままagents/policy.mdに追記するワークフロー
 *
 * 受入基準:
 * - 要件2.1: コメント本文から「[must]」接頭辞を削除する
 * - 要件2.2: 削除後のコメント本文を保持する
 * - 要件3.1: agents/policy.mdファイルの末尾に改行を挿入した上で追記する
 * - 要件3.2: 追記時にタイムスタンプとコメント元のURL情報を含める
 * - 要件4.1: 変更をPR Branchにコミットする
 * - 要件4.2: コミットメッセージに説明を含める
 * - 要件4.3: コミット後、直ちにPR Branchへプッシュする
 */

// Step 1: フォーマットと追記処理
const formatAndAppendStep = createStep({
  id: "format-and-append",
  description: "Formats comment and appends to agents/policy.md",
  inputSchema: z.object({
    comment: z.object({
      body: z.string(),
      url: z.string().url(),
      timestamp: z.string().datetime(),
    }),
    prBranch: z.string(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    bytesWritten: z.number(),
    formattedContent: z.string(),
    commentUrl: z.string(),
    prBranch: z.string(),
  }),
  execute: async ({ inputData }) => {
    if (!inputData) {
      throw new Error("Input data not found");
    }

    const { comment } = inputData;

    console.log("📝 Step 1: フォーマットと追記処理を開始します");
    console.log(`  コメント本文: ${comment.body.substring(0, 50)}...`);
    console.log(`  出典URL: ${comment.url}`);
    console.log(`  タイムスタンプ: ${comment.timestamp}`);

    // タイムスタンプを日本語形式に変換
    const date = new Date(comment.timestamp);
    const formattedDate = date.toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    // フォーマット（要件3.2に準拠）
    const formattedContent = `
---
## [追加日時: ${formattedDate}]
出典: ${comment.url}

${comment.body}

`;

    console.log("✅ コンテンツをフォーマットしました");

    // ファイルに追記（要件3.1に準拠）
    const writeResult = await fileWriterTool.execute({
      filePath: "agents/policy.md",
      content: formattedContent,
      mode: "append",
    } as any);

    if (writeResult.success) {
      console.log(
        `✅ agents/policy.mdに追記しました（${writeResult.bytesWritten} バイト）`
      );
    } else {
      throw new Error("ファイル書き込みに失敗しました");
    }

    return {
      success: writeResult.success,
      bytesWritten: writeResult.bytesWritten,
      formattedContent,
      commentUrl: comment.url,
      prBranch: inputData.prBranch,
    };
  },
});

// Step 2: Gitコミット・プッシュ処理
const commitChangesStep = createStep({
  id: "commit-changes",
  description: "Commits and pushes changes to Git repository",
  inputSchema: z.object({
    success: z.boolean(),
    bytesWritten: z.number(),
    formattedContent: z.string(),
    commentUrl: z.string(),
    prBranch: z.string(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    commitHash: z.string().optional(),
    branch: z.string(),
  }),
  execute: async ({ inputData }) => {
    if (!inputData) {
      throw new Error("Input data not found");
    }

    if (!inputData.success) {
      throw new Error("Step 1が失敗したため、Gitコミットをスキップします");
    }

    console.log("📝 Step 2: Gitコミット・プッシュ処理を開始します");

    // コミットメッセージ（要件4.2に準拠）
    const commitMessage = `chore: [must]コメントからナレッジ自動追加\n\n出典: ${inputData.commentUrl}`;

    // Gitコミット・プッシュ（要件4.1, 4.3に準拠）
    const commitResult = await gitCommitTool.execute({
      filePaths: ["agents/policy.md"],
      commitMessage,
      branch: inputData.prBranch,
    } as any);
    console.log("c");

    if (commitResult.success) {
      console.log(`✅ Gitコミット・プッシュが成功しました`);
      console.log(`  コミットハッシュ: ${commitResult.commitHash}`);
      console.log(`  ブランチ: ${inputData.prBranch}`);
    } else {
      throw new Error(
        `Gitコミット・プッシュに失敗しました: ${commitResult.error}`
      );
    }

    return {
      success: commitResult.success,
      commitHash: commitResult.commitHash || "",
      branch: inputData.prBranch,
    };
  },
});

// ワークフローの作成
const simpleAppendWorkflow = createWorkflow({
  id: "simple-append-workflow",
  inputSchema: z.object({
    comment: z.object({
      body: z.string().describe("Comment body (without [must] prefix)"),
      url: z.string().url().describe("Comment URL"),
      timestamp: z.string().datetime().describe("ISO 8601 timestamp"),
    }),
    prBranch: z.string().describe("PR branch name"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    commitHash: z.string().optional(),
    branch: z.string(),
  }),
})
  .then(formatAndAppendStep)
  .then(commitChangesStep);

simpleAppendWorkflow.commit();

export { simpleAppendWorkflow };
