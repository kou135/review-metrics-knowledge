# エラーハンドリング戦略

## 概要

本プロジェクトでは、堅牢で保守性の高いエラーハンドリングを実装します。全てのエラーは適切に捕捉・ログ出力され、可能な限り自動的に回復します。

## リトライ戦略

### 基本方針

- **リトライ回数**: 最大3回
- **バックオフ戦略**: 指数バックオフ（Exponential Backoff）
- **初回待機時間**: 10秒
- **待機時間の増加**: 2倍ずつ（10秒 → 20秒 → 40秒）

### 実装パターン

```typescript
async function executeWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt);
        console.warn(`Retry ${attempt + 1}/${maxRetries} after ${delay}ms: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}
```

### リトライ対象の操作

以下の操作はリトライを実行する：

1. **ファイル操作**
   - ファイル読み込み失敗（一時的なロック）
   - ファイル書き込み失敗（ディスク容量不足以外）

2. **Git操作**
   - コミット失敗（競合以外）
   - プッシュ失敗（ネットワークエラー）

3. **AI API呼び出し**
   - Gemini APIのレート制限エラー（429）
   - 一時的なサーバーエラー（5xx）

### リトライしない操作

以下の操作はリトライせず、即座に失敗する：

1. **バリデーションエラー**
   - 入力スキーマ違反
   - ファイルパスの不正

2. **認証エラー**
   - APIキーの不正（401）
   - 権限不足（403）

3. **論理エラー**
   - JSON パースエラー
   - 必須パラメータの欠如

## タイムアウト設定

### タイムアウト値

| 操作 | タイムアウト | 理由 |
|------|------------|------|
| ファイル読み込み | 5秒 | ローカルファイルは高速 |
| ファイル書き込み | 5秒 | ローカルファイルは高速 |
| Git操作（コミット） | 10秒 | ネットワーク不要 |
| Git操作（プッシュ） | 30秒 | ネットワーク経由 |
| AI API呼び出し | 30秒 | LLM推論時間を考慮 |
| ワークフロー全体（MVP） | 80秒 | 全ステップの合計 |
| ワークフロー全体（発展） | 100秒 | AI処理を含む |

### 実装パターン

```typescript
async function executeWithTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  operationName: string
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Timeout: ${operationName} exceeded ${timeoutMs}ms`)),
        timeoutMs
      )
    )
  ]);
}
```

### 使用例

```typescript
// ファイル読み込みにタイムアウトを適用
const content = await executeWithTimeout(
  () => fs.readFile('agents/policy.md', 'utf-8'),
  5000,
  'File read'
);

// AI呼び出しにタイムアウトを適用
const result = await executeWithTimeout(
  () => curationAgent.generate({ messages }),
  15000,
  'AI curation'
);
```

## フォールバック戦略

### AI失敗時のフォールバック

AI キュレーション機能が失敗した場合、自動的にMVPモード（シンプル追記）にフォールバックする。

```typescript
async function executeWorkflowWithFallback(comment: CommentInput) {
  try {
    // 発展機能を試行
    return await knowledgeUpdateWorkflow.execute({ triggerData: comment });
  } catch (error) {
    console.warn('AI curation failed, falling back to MVP mode:', error.message);
    
    // MVPモードにフォールバック
    return await simpleAppendWorkflow.execute({ triggerData: comment });
  }
}
```

### フォールバック条件

以下の場合にフォールバックを実行：

1. **AI APIエラー**
   - Gemini APIが利用不可（5xx）
   - APIキーの無効化
   - レート制限の超過（リトライ後も失敗）

2. **JSON パースエラー**
   - AIの出力が不正なJSON形式
   - 必須フィールドの欠如

3. **タイムアウト**
   - AI呼び出しが30秒を超過

## エラーログのフォーマット

### ログレベル

| レベル | 用途 | 例 |
|--------|------|-----|
| `INFO` | 正常な処理フロー | ワークフロー開始、ステップ完了 |
| `WARN` | 警告（処理は継続） | リトライ実行、フォールバック発動 |
| `ERROR` | エラー（処理失敗） | ワークフロー失敗、API呼び出し失敗 |

### ログ構造

```typescript
interface LogEntry {
  level: 'INFO' | 'WARN' | 'ERROR';
  timestamp: string;           // ISO 8601形式
  component: string;           // 'workflow' | 'tool' | 'agent'
  operation: string;           // 操作名
  message: string;             // エラーメッセージ
  error?: {
    name: string;              // エラー名
    message: string;           // エラーメッセージ
    stack?: string;            // スタックトレース（ERRORのみ）
  };
  metadata?: Record<string, any>; // 追加情報
}
```

### ログ出力例

```typescript
// INFO
console.log(JSON.stringify({
  level: 'INFO',
  timestamp: new Date().toISOString(),
  component: 'workflow',
  operation: 'knowledge-update',
  message: 'Workflow started successfully'
}));

// WARN
console.warn(JSON.stringify({
  level: 'WARN',
  timestamp: new Date().toISOString(),
  component: 'agent',
  operation: 'curation',
  message: 'AI curation failed, falling back to MVP mode',
  error: {
    name: 'TimeoutError',
    message: 'AI call exceeded 15000ms'
  }
}));

// ERROR
console.error(JSON.stringify({
  level: 'ERROR',
  timestamp: new Date().toISOString(),
  component: 'tool',
  operation: 'git-commit',
  message: 'Failed to commit changes',
  error: {
    name: 'GitError',
    message: 'Permission denied',
    stack: error.stack
  },
  metadata: {
    filePaths: ['agents/policy.md'],
    branch: 'feature/test'
  }
}));
```

## エラー通知

### GitHub Actions失敗通知

ワークフローが失敗した場合、GitHub Actionsが自動的に通知を送信する。

```yaml
# .github/workflows/knowledge-automation.yml
jobs:
  process-must-comment:
    steps:
      - name: Run Mastra Application
        run: npm run mastra:run
        continue-on-error: false  # エラー時に即座に失敗
      
      - name: Notify on failure
        if: failure()
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '❌ ナレッジ自動追加に失敗しました。詳細は[ワークフロー実行ログ](${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }})を確認してください。'
            })
```

### エラー通知の内容

1. **失敗したステップ**: どのステップで失敗したか
2. **エラーメッセージ**: 具体的なエラー内容
3. **ログへのリンク**: GitHub Actionsの実行ログURL
4. **推奨アクション**: ユーザーが取るべき次のアクション

## エラーハンドリングのベストプラクティス

### 1. 早期リターン

エラー条件を早期にチェックし、早期リターンする。

```typescript
// 良い例
async function processComment(comment: string) {
  if (!comment || comment.trim().length === 0) {
    throw new Error('Comment body is empty');
  }
  
  if (comment.length > 10000) {
    throw new Error('Comment body exceeds maximum length of 10000 characters');
  }
  
  // 正常処理
  return await processValidComment(comment);
}
```

### 2. 具体的なエラーメッセージ

エラーメッセージは具体的で、問題解決に役立つ情報を含める。

```typescript
// 悪い例
throw new Error('File operation failed');

// 良い例
throw new Error(`Failed to read file at ${filePath}: ${error.message}`);
```

### 3. エラーの再スロー

エラーを捕捉した後、必要に応じて再スローする。

```typescript
try {
  await someOperation();
} catch (error) {
  console.error('Operation failed:', error);
  throw error; // 上位レイヤーで処理させる
}
```

### 4. カスタムエラークラス

特定のエラータイプにはカスタムエラークラスを使用する。

```typescript
class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

class TimeoutError extends Error {
  constructor(operation: string, timeoutMs: number) {
    super(`Timeout: ${operation} exceeded ${timeoutMs}ms`);
    this.name = 'TimeoutError';
  }
}

class AIError extends Error {
  constructor(message: string, public readonly shouldFallback: boolean = true) {
    super(message);
    this.name = 'AIError';
  }
}
```

## まとめ

本エラーハンドリング戦略により、以下を実現します：

- ✅ 一時的なエラーからの自動回復（リトライ）
- ✅ 長時間実行の防止（タイムアウト）
- ✅ AI失敗時の代替手段（フォールバック）
- ✅ 問題の迅速な特定（構造化ログ）
- ✅ ユーザーへの適切な通知（GitHub Actions）

全てのツール、ワークフロー、エージェントは、この戦略に従って実装してください。
