import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import simpleGit from "simple-git";

/**
 * Git Commit Tool
 * 
 * 変更をコミット・プッシュするツール
 * GitHub Actions環境でのGit設定を自動的に行う
 * 
 * 受入基準:
 * - 要件4.1: agents/policy.mdへの追記が完了したら、変更をPR Branchにコミットする
 * - 要件4.2: コミットメッセージに「自動追記: [must]コメントからナレッジ追加」という説明を含める
 * - 要件4.3: コミット後、直ちにPR Branchへプッシュする
 * - 要件4.4: Git操作が失敗した場合、エラーログを出力する
 */
export const gitCommitTool = createTool({
  id: "git-commit",
  description: "Commits and pushes changes to a Git repository. Automatically configures Git user for GitHub Actions.",
  
  inputSchema: z.object({
    filePaths: z.array(z.string()).describe("Files to commit"),
    commitMessage: z.string().describe("Commit message"),
    branch: z.string().describe("Branch to push to")
  }),
  
  outputSchema: z.object({
    success: z.boolean().describe("Whether the operation succeeded"),
    commitHash: z.string().optional().describe("Commit hash if successful"),
    error: z.string().optional().describe("Error message if failed")
  }),
  
  execute: async ({ context }) => {
    const { filePaths, commitMessage, branch } = context;
    const git = simpleGit();
    
    try {
      // Gitユーザー設定（GitHub Actionsの場合）
      await git.addConfig("user.name", "github-actions[bot]", false, "global");
      await git.addConfig("user.email", "github-actions[bot]@users.noreply.github.com", false, "global");
      
      console.log(`📝 Git設定完了: github-actions[bot]`);
      
      // ファイルをステージング
      await git.add(filePaths);
      console.log(`✅ ファイルをステージング: ${filePaths.join(", ")}`);
      
      // コミット
      const commitResult = await git.commit(commitMessage);
      console.log(`✅ コミット成功: ${commitResult.commit}`);
      
      // プッシュ
      // GitHub Actionsの場合、GITHUB_TOKENを使用してHTTPS経由でプッシュ
      const token = process.env.GITHUB_TOKEN;
      if (token) {
        // トークンを使用したHTTPSプッシュ
        const remoteUrl = `https://x-access-token:${token}@github.com/${process.env.GITHUB_REPOSITORY}.git`;
        
        // 既存のoriginを一時的に上書き
        await git.removeRemote('origin').catch(() => {
          // originが存在しない場合は無視
        });
        await git.addRemote('origin', remoteUrl);
      }
      
      await git.push("origin", branch);
      console.log(`✅ プッシュ成功: origin/${branch}`);
      
      return {
        success: true,
        commitHash: commitResult.commit
      };
    } catch (error: any) {
      console.error(`❌ Git操作失敗: ${error.message}`);
      
      return {
        success: false,
        error: error.message
      };
    }
  }
});
