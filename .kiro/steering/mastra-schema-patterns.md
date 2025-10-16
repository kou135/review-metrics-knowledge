# Mastra スキーマ構造とパターン詳細

## 概要

Mastraでは、Zodライブラリを使用してスキーマを定義します。スキーマは、Tool、Workflow、Agentの入出力を型安全に管理するために使用されます。

## Zodライブラリについて

```typescript
import { z } from "zod";
```

Zodは、TypeScriptファーストのスキーマ宣言およびバリデーションライブラリです。Mastraでは、以下の用途で使用されます：

- Tool の入力/出力スキーマ定義
- Workflow のトリガースキーマ定義
- Agent の構造化出力スキーマ定義

## Tool のスキーマ構造

### 基本構造

```typescript
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const myTool = createTool({
  id: "tool-id",                    // ツールの一意な識別子
  description: "Tool description",  // ツールの説明（LLMがツール選択時に参照）
  inputSchema: z.object({           // 入力スキーマ（必須）
    // 入力パラメータの定義
  }),
  outputSchema: z.object({          // 出力スキーマ（オプション）
    // 出力データの定義
  }),
  execute: async ({ context }) => { // 実行関数
    // ツールのロジック
    return { /* 出力データ */ };
  }
});
```

### 実例1: Weather Tool（天気情報取得）

```typescript
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const weatherTool = createTool({
  id: "weather-tool",
  description: "Fetches weather for a location",
  
  // 入力スキーマ: location（文字列）を受け取る
  inputSchema: z.object({
    location: z.string().describe("City name or location")
  }),
  
  // 出力スキーマ: weather（文字列）を返す
  outputSchema: z.object({
    weather: z.string().describe("Weather information")
  }),
  
  // 実行関数: contextから入力を取得し、APIを呼び出す
  execute: async ({ context }) => {
    const { location } = context;
    
    const response = await fetch(`https://wttr.in/${location}?format=3`);
    const weather = await response.text();
    
    return { weather };
  }
});
```

### 実例2: File Reader Tool（ファイル読み込み）

```typescript
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import fs from "fs/promises";

export const fileReaderTool = createTool({
  id: "file-reader",
  description: "Reads content from a file",
  
  inputSchema: z.object({
    filePath: z.string().describe("Path to the file to read"),
    encoding: z.enum(["utf-8", "ascii", "base64"]).default("utf-8")
  }),
  
  outputSchema: z.object({
    content: z.string(),
    exists: z.boolean(),
    size: z.number().optional()
  }),
  
  execute: async ({ context }) => {
    const { filePath, encoding } = context;
    
    try {
      const content = await fs.readFile(filePath, encoding);
      const stats = await fs.stat(filePath);
      
      return {
        content,
        exists: true,
        size: stats.size
      };
    } catch (error) {
      return {
        content: "",
        exists: false
      };
    }
  }
});
```

### 実例3: File Writer Tool（ファイル書き込み）

```typescript
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import fs from "fs/promises";

export const fileWriterTool = createTool({
  id: "file-writer",
  description: "Writes or appends content to a file",
  
  inputSchema: z.object({
    filePath: z.string(),
    content: z.string(),
    mode: z.enum(["write", "append"]).default("write")
  }),
  
  outputSchema: z.object({
    success: z.boolean(),
    bytesWritten: z.number()
  }),
  
  execute: async ({ context }) => {
    const { filePath, content, mode } = context;
    
    try {
      if (mode === "append") {
        await fs.appendFile(filePath, content, "utf-8");
      } else {
        await fs.writeFile(filePath, content, "utf-8");
      }
      
      const bytesWritten = Buffer.byteLength(content, "utf-8");
      
      return {
        success: true,
        bytesWritten
      };
    } catch (error) {
      throw new Error(`Failed to write file: ${error.message}`);
    }
  }
});
```

### 実例4: Git Commit Tool（Git操作）

```typescript
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import simpleGit from "simple-git";

export const gitCommitTool = createTool({
  id: "git-commit",
  description: "Commits and pushes changes to a Git repository",
  
  inputSchema: z.object({
    filePaths: z.array(z.string()).describe("Files to commit"),
    commitMessage: z.string().describe("Commit message"),
    branch: z.string().optional().describe("Branch to push to")
  }),
  
  outputSchema: z.object({
    success: z.boolean(),
    commitHash: z.string().optional(),
    error: z.string().optional()
  }),
  
  execute: async ({ context }) => {
    const { filePaths, commitMessage, branch } = context;
    const git = simpleGit();
    
    try {
      // ファイルをステージング
      await git.add(filePaths);
      
      // コミット
      const commitResult = await git.commit(commitMessage);
      
      // プッシュ（ブランチ指定がある場合）
      if (branch) {
        await git.push("origin", branch);
      }
      
      return {
        success: true,
        commitHash: commitResult.commit
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
});
```

## Workflow のスキーマ構造

### 基本構造

```typescript
import { Workflow } from "@mastra/core/workflows";
import { z } from "zod";

export const myWorkflow = new Workflow({
  name: "workflow-name",
  triggerSchema: z.object({
    // ワークフローのトリガー入力定義
  })
});

// ステップの追加
myWorkflow
  .step({
    id: "step-1",
    execute: async ({ context }) => {
      // ステップ1のロジック
      return { result: "data" };
    }
  })
  .then({
    id: "step-2",
    execute: async ({ context }) => {
      // 前のステップの結果を取得
      const step1Result = context.getStepResult("step-1");
      // ステップ2のロジック
      return { final: "result" };
    }
  });
```

### 実例1: Knowledge Update Workflow（ナレッジ更新）

```typescript
import { Workflow } from "@mastra/core/workflows";
import { z } from "zod";
import { fileReaderTool } from "../tools/file-reader";
import { fileWriterTool } from "../tools/file-writer";
import { gitCommitTool } from "../tools/git-commit";

export const knowledgeUpdateWorkflow = new Workflow({
  name: "knowledge-update-workflow",
  
  // トリガースキーマ: コメント情報を受け取る
  triggerSchema: z.object({
    comment: z.object({
      body: z.string().describe("Comment body text"),
      url: z.string().url().describe("Comment URL"),
      timestamp: z.string().datetime().describe("ISO 8601 timestamp")
    })
  })
});

// Step 1: 既存ナレッジベースを読み込む
knowledgeUpdateWorkflow
  .step({
    id: "read-knowledge-base",
    execute: async ({ context }) => {
      const result = await fileReaderTool.execute({
        context: { filePath: "agents/policy.md", encoding: "utf-8" }
      });
      
      return {
        existingContent: result.content,
        exists: result.exists
      };
    }
  })
  
  // Step 2: AIによるキュレーション（重複チェック・要約）
  .then({
    id: "curate-comment",
    execute: async ({ context }) => {
      const { existingContent } = context.getStepResult("read-knowledge-base");
      const { comment } = context.triggerData;
      
      // AIエージェントを呼び出して重複判定と要約を実行
      const curationResult = await curationAgent.generate({
        messages: [{
          role: "user",
          content: `既存ルール:\n${existingContent}\n\n新規コメント:\n${comment.body}`
        }]
      });
      
      const parsed = JSON.parse(curationResult.text);
      
      return {
        isDuplicate: parsed.isDuplicate,
        reason: parsed.reason,
        summarizedRule: parsed.summarizedRule
      };
    }
  })
  
  // Step 3: 条件分岐 - 新規の場合のみ追記
  .then({
    id: "conditional-append",
    execute: async ({ context }) => {
      const curationResult = context.getStepResult("curate-comment");
      const { comment } = context.triggerData;
      
      // 重複している場合はスキップ
      if (curationResult.isDuplicate) {
        return {
          skipped: true,
          reason: curationResult.reason
        };
      }
      
      // 新規ルールをフォーマット
      const formattedContent = `
---
## [追加日時: ${comment.timestamp}]
出典: ${comment.url}

${curationResult.summarizedRule}

`;
      
      // ファイルに追記
      await fileWriterTool.execute({
        context: {
          filePath: "agents/policy.md",
          content: formattedContent,
          mode: "append"
        }
      });
      
      // Gitコミット・プッシュ
      await gitCommitTool.execute({
        context: {
          filePaths: ["agents/policy.md"],
          commitMessage: `chore: [must]コメントからナレッジ自動追加\n\n出典: ${comment.url}`,
          branch: process.env.PR_BRANCH
        }
      });
      
      return {
        success: true,
        added: true
      };
    }
  });
```

### 実例2: Branching Workflow（条件分岐）

```typescript
import { Workflow } from "@mastra/core/workflows";
import { z } from "zod";

export const branchWorkflow = new Workflow({
  name: "branch-workflow",
  triggerSchema: z.object({
    value: z.number()
  })
});

branchWorkflow.branch({
  // 条件: value が 10 以下かどうか
  condition: async ({ context }) => {
    return context.triggerData.value <= 10;
  },
  
  // 条件が true の場合
  then: {
    id: "less-than-step",
    execute: async ({ context }) => {
      console.log("Value is less than or equal to 10");
      return { result: 0 };
    }
  },
  
  // 条件が false の場合
  else: {
    id: "greater-than-step",
    execute: async ({ context }) => {
      console.log("Value is greater than 10");
      return { result: 20 };
    }
  }
});
```

### 実例3: Parallel Workflow（並列実行）

```typescript
import { Workflow } from "@mastra/core/workflows";
import { z } from "zod";

export const parallelWorkflow = new Workflow({
  name: "parallel-workflow",
  triggerSchema: z.object({
    urls: z.array(z.string().url())
  })
});

parallelWorkflow
  .parallel([
    {
      id: "fetch-url-1",
      execute: async ({ context }) => {
        const url = context.triggerData.urls[0];
        const response = await fetch(url);
        return { data: await response.text() };
      }
    },
    {
      id: "fetch-url-2",
      execute: async ({ context }) => {
        const url = context.triggerData.urls[1];
        const response = await fetch(url);
        return { data: await response.text() };
      }
    }
  ])
  .then({
    id: "combine-results",
    execute: async ({ context }) => {
      const result1 = context.getStepResult("fetch-url-1");
      const result2 = context.getStepResult("fetch-url-2");
      
      return {
        combined: result1.data + "\n\n" + result2.data
      };
    }
  });
```

## Agent のスキーマ構造

### 基本構造

```typescript
import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

export const myAgent = new Agent({
  name: "agent-name",
  instructions: "Agent instructions",
  model: {
    provider: openai("gpt-4"),
    toolChoice: "auto"
  },
  tools: {
    // ツールを登録
  }
});
```

### 実例1: Curation Agent（キュレーションエージェント）

```typescript
import { Agent } from "@mastra/core/agent";
import { google } from "@ai-sdk/google";
import { fileReaderTool } from "../tools/file-reader";

export const curationAgent = new Agent({
  name: "curation-agent",
  
  instructions: `
あなたは熟練のテクニカルライターです。
新しいレビューコメントと既存のコーディング規約を比較し、以下を判定してください：

1. 重複判定: 新規コメントが既存ルールと意味的に80%以上重複するか
2. 要約: 重複していない場合、コメントを汎用的で規範的なルールに要約

出力形式（JSON）:
{
  "isDuplicate": boolean,
  "reason": "判定理由",
  "summarizedRule": "要約されたルール（新規の場合のみ）"
}
  `,
  
  model: {
    provider: google("gemini-2.0-flash-exp"),
    toolChoice: "auto"
  },
  
  tools: {
    fileReader: fileReaderTool
  }
});
```

### 実例2: Weather Agent（天気エージェント）

```typescript
import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";
import { weatherTool } from "../tools/weather-tool";

export const weatherAgent = new Agent({
  name: "weather-agent",
  
  instructions: `
You are a helpful weather assistant.
Use the weatherTool to fetch current weather data.
Provide clear and concise weather information to users.
  `,
  
  model: {
    provider: openai("gpt-4o-mini"),
    toolChoice: "auto"
  },
  
  tools: {
    weatherTool
  }
});
```

## Context オブジェクトの詳細

### Tool の Context

```typescript
execute: async ({ context }) => {
  // context には inputSchema で定義したパラメータが含まれる
  const { param1, param2 } = context;
  
  // 処理...
  
  return { result: "value" };
}
```

### Workflow の Context

```typescript
execute: async ({ context }) => {
  // トリガーデータへのアクセス
  const triggerData = context.triggerData;
  
  // 前のステップの結果を取得（型安全）
  const previousResult = context.getStepResult("previous-step-id");
  
  // 処理...
  
  return { result: "value" };
}
```

## Zod スキーマの主要な型

### 基本型

```typescript
z.string()              // 文字列
z.number()              // 数値
z.boolean()             // 真偽値
z.date()                // 日付
z.undefined()           // undefined
z.null()                // null
z.any()                 // 任意の型
```

### 複合型

```typescript
z.array(z.string())     // 文字列の配列
z.object({              // オブジェクト
  key: z.string()
})
z.tuple([z.string(), z.number()])  // タプル
z.enum(["a", "b", "c"]) // 列挙型
z.union([z.string(), z.number()])  // ユニオン型
```

### バリデーション

```typescript
z.string().min(5)                    // 最小長
z.string().max(100)                  // 最大長
z.string().email()                   // メールアドレス
z.string().url()                     // URL
z.string().datetime()                // ISO 8601日時
z.number().positive()                // 正の数
z.number().int()                     // 整数
z.array(z.string()).min(1).max(10)   // 配列の長さ制限
```

### オプショナルとデフォルト値

```typescript
z.string().optional()                // オプショナル
z.string().nullable()                // null許容
z.string().default("default value")  // デフォルト値
z.string().describe("Description")   // 説明（LLMが参照）
```

## ベストプラクティス

### 1. スキーマには説明を追加

```typescript
inputSchema: z.object({
  location: z.string().describe("City name or location to get weather for"),
  units: z.enum(["metric", "imperial"]).default("metric").describe("Temperature units")
})
```

### 2. エラーハンドリングを実装

```typescript
execute: async ({ context }) => {
  try {
    // 処理
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

### 3. 型安全な結果取得

```typescript
// Workflowで前のステップの結果を取得
const previousResult = context.getStepResult<{ data: string }>("step-id");
console.log(previousResult.data); // 型安全
```

### 4. 環境変数の活用

```typescript
execute: async ({ context }) => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY is not set");
  }
  // 処理...
}
```

## まとめ

- **Tool**: `inputSchema` と `outputSchema` で入出力を定義
- **Workflow**: `triggerSchema` でトリガー入力を定義、`context.getStepResult()` で前のステップの結果を取得
- **Agent**: `tools` でツールを登録、`instructions` で動作を指示
- **Zod**: 型安全なスキーマ定義とバリデーション
- **Context**: 実行時のデータアクセスポイント
