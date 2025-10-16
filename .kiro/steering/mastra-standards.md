# Mastra フレームワーク標準実装パターン

## 概要

Mastraは、TypeScript製のAIエージェントフレームワークです。OpenAI、Anthropic、Google Geminiなど、あらゆるLLMプロバイダーをサポートし、エージェント、ツール、ワークフローを構築できます。

- **公式サイト**: https://mastra.ai
- **GitHub**: https://github.com/mastra-ai/mastra
- **Stars**: 17.3k+
- **ライセンス**: Apache 2.0

## 主要機能

### 1. Agents（エージェント）
- LLMモデルにツール、ワークフロー、同期データを提供するシステム
- メモリを持ち、関数を実行できる
- `@mastra/core/agent` からインポート

### 2. Tools（ツール）
- エージェントやワークフローが実行できる型付き関数
- 入力スキーマ（Zod）、実行関数、統合アクセスを持つ
- `@mastra/core/tools` からインポート

### 3. Workflows（ワークフロー）
- グラフベースの永続的なステートマシン
- ループ、分岐、人間の入力待ち、エラーハンドリング、リトライをサポート
- `.then()`, `.branch()`, `.parallel()` などの制御フロー構文
- OpenTelemetryトレーシングが組み込まれている

### 4. Model Routing
- Vercel AI SDKを使用
- 統一されたインターフェースで任意のLLMプロバイダーと対話

### 5. RAG（Retrieval-Augmented Generation）
- ドキュメント処理、チャンキング、埋め込み、ベクトルデータベース保存
- 複数のベクトルストア（Pinecone、pgvectorなど）をサポート

### 6. Observability（観測可能性）
- 専用のAIトレーシング
- LLM操作、エージェント決定、ツール実行を監視
- Langfuse、Braintrust、Mastra Cloudへのネイティブエクスポーター

### 7. Evals（評価）
- モデルベース、ルールベース、統計的手法を使用した自動評価メトリクス
- 毒性、バイアス、関連性、事実精度の組み込みメトリクス

## プロジェクト構造

### 標準的なディレクトリ構成

```
project-root/
├── src/
│   └── mastra/
│       ├── index.ts          # Mastraインスタンス
│       ├── agents/           # エージェント定義
│       │   └── my-agent.ts
│       ├── tools/            # ツール定義
│       │   └── my-tool.ts
│       └── workflows/        # ワークフロー定義
│           └── my-workflow.ts
├── .env                      # 環境変数（APIキーなど）
└── package.json
```

### 重要なパッケージ

- `@mastra/core` - コアフレームワーク
- `@mastra/core/agent` - エージェント機能
- `@mastra/core/tools` - ツール作成
- `@mastra/core/workflows` - ワークフロー機能
- `@ai-sdk/openai` - OpenAI統合（Vercel AI SDK）
- `@ai-sdk/anthropic` - Anthropic統合
- `@ai-sdk/google` - Google Gemini統合

## 実装パターン

### 1. Agent の作成

```typescript
import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";

export const myAgent = new Agent({
  name: "my-agent",
  instructions: "You are a helpful assistant.",
  model: {
    provider: openai("gpt-4"),
    toolChoice: "auto"
  },
  tools: {
    // ツールをここに追加
  }
});
```

### 2. Tool の作成

```typescript
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const myTool = createTool({
  id: "my-tool",
  description: "Tool description",
  inputSchema: z.object({
    param: z.string()
  }),
  execute: async ({ context }) => {
    // ツールのロジック
    return { result: "success" };
  }
});
```

### 3. Workflow の作成

```typescript
import { Workflow } from "@mastra/core/workflows";
import { z } from "zod";

export const myWorkflow = new Workflow({
  name: "my-workflow",
  triggerSchema: z.object({
    input: z.string()
  })
});

myWorkflow
  .step({
    id: "step1",
    execute: async ({ context }) => {
      // ステップ1のロジック
      return { data: "result" };
    }
  })
  .then({
    id: "step2",
    execute: async ({ context }) => {
      const step1Result = context.getStepResult("step1");
      // ステップ2のロジック
      return { final: "done" };
    }
  });
```

### 4. Mastra インスタンスの作成

```typescript
import { Mastra } from "@mastra/core";
import { myAgent } from "./agents/my-agent";
import { myWorkflow } from "./workflows/my-workflow";

export const mastra = new Mastra({
  agents: {
    myAgent
  },
  workflows: {
    myWorkflow
  }
});
```

## 開発環境

### セットアップ

```bash
# プロジェクト作成
npx create-mastra@latest

# 開発サーバー起動
npm run dev
# または
mastra dev
```

### 環境変数

`.env` または `.env.development` ファイルに以下を設定：

```
OPENAI_API_KEY=your-key
ANTHROPIC_API_KEY=your-key
GOOGLE_GENERATIVE_AI_API_KEY=your-key
```

### 開発サーバーのエンドポイント

`mastra dev` コマンドで以下のREST APIが公開される：

- `GET /api/agents` - 登録されたエージェント一覧
- `POST /api/agents/:agentId/generate` - エージェントにプロンプト送信
- `POST /api/agents/:agentId/instructions` - エージェントの指示を更新
- `POST /api/agents/:agentId/tools/:toolId/execute` - ツール実行

## Workflow の制御フロー

### 1. Sequential（順次実行）

```typescript
workflow
  .step({ id: "step1", execute: async () => {} })
  .then({ id: "step2", execute: async () => {} });
```

### 2. Parallel（並列実行）

```typescript
workflow.parallel([
  { id: "step1", execute: async () => {} },
  { id: "step2", execute: async () => {} }
]);
```

### 3. Branch（条件分岐）

```typescript
workflow.branch({
  condition: async ({ context }) => {
    return context.triggerData.value > 10;
  },
  then: { id: "greaterStep", execute: async () => {} },
  else: { id: "lesserStep", execute: async () => {} }
});
```

## デプロイメント

Mastraは以下の環境にデプロイ可能：

1. **Node.jsサーバー** - Honoを使用してバンドル
2. **サーバーレス** - Vercel、Cloudflare Workers、Netlify
3. **既存アプリケーション** - React、Next.js、Node.jsアプリに統合

## ベストプラクティス

### 1. ディレクトリ構成
- `src/mastra/` 配下に全てのMastra関連コードを配置
- agents、tools、workflowsをそれぞれ専用ディレクトリに分離
- `index.ts` でMastraインスタンスを作成・エクスポート

### 2. ツールの設計
- 各ツールは単一責任の原則に従う
- Zodスキーマで入力を厳密に型定義
- エラーハンドリングを適切に実装

### 3. ワークフローの設計
- ステップIDは明確で説明的な名前を使用
- `context.getStepResult()` で前のステップの結果を取得
- エラーハンドリングとリトライロジックを実装

### 4. エージェントの設計
- 明確で具体的な指示（instructions）を提供
- 必要なツールのみを登録
- モデル選択は用途に応じて適切に行う

## GitHub Actions との統合

Mastraアプリケーションは、GitHub Actionsから実行可能：

```yaml
name: Run Mastra App
on: [push]
jobs:
  run:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v6
        with:
          node-version: '20.x'
      - run: npm install
      - run: npm run mastra:run
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

## 参考リンク

- 公式ドキュメント: https://mastra.ai/docs
- GitHub リポジトリ: https://github.com/mastra-ai/mastra
- Discord コミュニティ: https://discord.gg/BTYqqHKUrf
- Twitter: https://x.com/mastra_ai
- npm パッケージ: https://www.npmjs.com/package/@mastra/core

## 注意事項

1. **APIキーの管理**: 環境変数として管理し、コードにハードコードしない
2. **バージョン管理**: Mastraは活発に開発中のため、最新バージョンを確認
3. **OpenTelemetry**: 本番環境では適切な観測可能性ツールと統合
4. **エラーハンドリング**: ツールとワークフローで適切なエラー処理を実装
