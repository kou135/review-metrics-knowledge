# パフォーマンス制約

## 概要

本プロジェクトでは、ユーザー体験を損なわないよう、明確なパフォーマンス制約を設定します。全ての操作は定義された時間内に完了する必要があります。

## タイムアウト設定

### 操作別タイムアウト

| 操作 | タイムアウト | 根拠 |
|------|------------|------|
| ファイル読み込み | 5秒 | ローカルファイルシステムは通常1秒以内、余裕を持たせて5秒 |
| ファイル書き込み | 5秒 | ローカルファイルシステムは通常1秒以内、余裕を持たせて5秒 |
| Git add | 5秒 | ローカル操作、ファイルサイズに依存 |
| Git commit | 10秒 | ローカル操作、コミットメッセージ生成を含む |
| Git push | 30秒 | ネットワーク経由、GitHub APIのレスポンス時間を考慮 |
| Gemini API呼び出し | 15秒 | LLM推論時間（通常5-10秒）+ ネットワーク遅延 |
| Simple Append Workflow | 60秒 | ファイル操作(5秒) + Git操作(40秒) + バッファ(15秒) |
| Knowledge Update Workflow | 90秒 | ファイル読込(5秒) + AI処理(15秒) + ファイル書込(5秒) + Git操作(40秒) + バッファ(25秒) |

### タイムアウト実装

```typescript
// タイムアウト付き実行のユーティリティ
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName: string
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Timeout: ${operationName} exceeded ${timeoutMs}ms`));
    }, timeoutMs);
  });
  
  return Promise.race([promise, timeoutPromise]);
}

// 使用例
const result = await withTimeout(
  curationAgent.generate({ messages }),
  15000,
  'AI curation'
);
```

## ファイルサイズ制限

### agents/policy.md

- **最大サイズ**: 10MB
- **推奨サイズ**: 1MB以下
- **警告閾値**: 5MB（警告ログを出力）

### 理由

- GitHubの推奨ファイルサイズ: 1MB以下
- Git操作のパフォーマンス維持
- ファイル読み込み時間の短縮

### 実装

```typescript
async function checkFileSizeLimit(filePath: string, maxSizeMB: number = 10) {
  const stats = await fs.stat(filePath);
  const sizeMB = stats.size / (1024 * 1024);
  
  if (sizeMB > maxSizeMB) {
    throw new Error(
      `File size (${sizeMB.toFixed(2)}MB) exceeds maximum limit of ${maxSizeMB}MB`
    );
  }
  
  if (sizeMB > maxSizeMB / 2) {
    console.warn(
      `Warning: File size (${sizeMB.toFixed(2)}MB) is approaching limit of ${maxSizeMB}MB`
    );
  }
  
  return sizeMB;
}
```

### ファイルサイズ超過時の対応

1. **警告ログ出力**: 5MB超過時
2. **エラー**: 10MB超過時
3. **推奨アクション**: ナレッジベースのアーカイブ化を提案

## 入力サイズ制限

### コメント本文

- **最大長**: 10,000文字
- **推奨長**: 1,000文字以下
- **最小長**: 1文字

### 理由

- Gemini APIの入力トークン制限
- 処理時間の短縮
- メモリ使用量の制限

### 実装

```typescript
function validateCommentBody(body: string): void {
  const trimmed = body.trim();
  
  if (trimmed.length === 0) {
    throw new Error('Comment body is empty');
  }
  
  if (trimmed.length > 10000) {
    throw new Error(
      `Comment body length (${trimmed.length}) exceeds maximum of 10,000 characters`
    );
  }
  
  if (trimmed.length > 5000) {
    console.warn(
      `Warning: Comment body length (${trimmed.length}) is quite long, may affect processing time`
    );
  }
}
```

### コミットメッセージ

- **最大長**: 500文字
- **推奨長**: 72文字（タイトル）+ 詳細

### 実装

```typescript
function validateCommitMessage(message: string): void {
  if (message.length > 500) {
    throw new Error(
      `Commit message length (${message.length}) exceeds maximum of 500 characters`
    );
  }
}
```

## API レート制限

### Gemini API

- **レート制限**: 60リクエスト/分（無料枠）
- **推奨**: 30リクエスト/分（余裕を持たせる）
- **バースト**: 最大10リクエスト/10秒

### 実装

```typescript
class RateLimiter {
  private requests: number[] = [];
  private readonly maxRequests: number;
  private readonly windowMs: number;
  
  constructor(maxRequests: number = 60, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }
  
  async acquire(): Promise<void> {
    const now = Date.now();
    
    // 古いリクエストを削除
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (now - oldestRequest);
      
      console.warn(`Rate limit reached, waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      return this.acquire(); // 再試行
    }
    
    this.requests.push(now);
  }
}

// グローバルインスタンス
const geminiRateLimiter = new RateLimiter(60, 60000);

// 使用例
await geminiRateLimiter.acquire();
const result = await curationAgent.generate({ messages });
```

### レート制限超過時の対応

1. **自動待機**: 次のウィンドウまで待機
2. **警告ログ**: レート制限に近づいた場合
3. **フォールバック**: 連続失敗時はMVPモードへ

## メモリ使用量

### 制約

- **最大メモリ使用量**: 512MB（GitHub Actions標準）
- **推奨メモリ使用量**: 256MB以下

### 理由

- GitHub Actionsの無料枠制限
- 複数ワークフローの同時実行を考慮

### 実装

```typescript
// メモリ使用量の監視
function logMemoryUsage() {
  const usage = process.memoryUsage();
  const usageMB = {
    rss: (usage.rss / 1024 / 1024).toFixed(2),
    heapTotal: (usage.heapTotal / 1024 / 1024).toFixed(2),
    heapUsed: (usage.heapUsed / 1024 / 1024).toFixed(2),
    external: (usage.external / 1024 / 1024).toFixed(2)
  };
  
  console.log('Memory usage (MB):', usageMB);
  
  if (usage.heapUsed > 256 * 1024 * 1024) {
    console.warn('Warning: High memory usage detected');
  }
}

// ワークフロー開始時と終了時に記録
logMemoryUsage();
```

## 並行実行制限

### GitHub Actions

- **同時実行ワークフロー数**: 1（同じPRに対して）
- **理由**: agents/policy.mdへの競合書き込みを防止

### 実装

```yaml
# .github/workflows/knowledge-automation.yml
concurrency:
  group: knowledge-automation-${{ github.event.pull_request.number }}
  cancel-in-progress: false  # 既存の実行を待つ
```

## パフォーマンス目標

### 目標実行時間

| シナリオ | 目標時間 | 最大時間 |
|---------|---------|---------|
| MVP（正常系） | 10秒 | 60秒 |
| 発展（新規追加） | 20秒 | 90秒 |
| 発展（重複検出） | 15秒 | 90秒 |

### 測定方法

```typescript
// パフォーマンス測定
class PerformanceTracker {
  private startTime: number;
  
  start() {
    this.startTime = Date.now();
  }
  
  end(operationName: string) {
    const duration = Date.now() - this.startTime;
    console.log(`Performance: ${operationName} completed in ${duration}ms`);
    
    return duration;
  }
}

// 使用例
const tracker = new PerformanceTracker();
tracker.start();

await workflow.execute({ triggerData });

const duration = tracker.end('Knowledge Update Workflow');

if (duration > 90000) {
  console.warn(`Warning: Workflow exceeded target time of 90000ms`);
}
```

## キャッシュ戦略

### Node.js依存関係

GitHub Actionsでnpm依存関係をキャッシュし、インストール時間を短縮。

```yaml
- name: Cache node modules
  uses: actions/cache@v4
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-
```

### 効果

- 初回実行: 30-60秒（依存関係インストール）
- 2回目以降: 5-10秒（キャッシュから復元）

## パフォーマンス最適化のベストプラクティス

### 1. 不要な処理を避ける

```typescript
// 悪い例: 毎回ファイル全体を読み込む
const content = await fs.readFile('agents/policy.md', 'utf-8');
const lines = content.split('\n');
const lastLine = lines[lines.length - 1];

// 良い例: 必要な部分のみ読み込む（ファイルが大きい場合）
const stats = await fs.stat('agents/policy.md');
if (stats.size > 1024 * 1024) { // 1MB以上
  // ストリーム処理を検討
}
```

### 2. 並列処理の活用

```typescript
// 悪い例: 順次実行
const file1 = await readFile('file1.md');
const file2 = await readFile('file2.md');

// 良い例: 並列実行
const [file1, file2] = await Promise.all([
  readFile('file1.md'),
  readFile('file2.md')
]);
```

### 3. 早期リターン

```typescript
// 良い例: 不要な処理をスキップ
if (curationResult.isDuplicate) {
  console.log('Duplicate detected, skipping file write and git operations');
  return { skipped: true };
}

// 重い処理（ファイル書き込み、Git操作）
await fileWriterTool.execute({ ... });
await gitCommitTool.execute({ ... });
```

## モニタリング

### パフォーマンスメトリクス

以下のメトリクスを記録し、定期的にレビューする：

1. **ワークフロー実行時間**: 平均、最大、最小
2. **各ステップの実行時間**: ボトルネックの特定
3. **API呼び出し回数**: レート制限の監視
4. **メモリ使用量**: ピーク時の使用量
5. **ファイルサイズ**: agents/policy.mdの成長率

### 実装

```typescript
// メトリクス収集
interface PerformanceMetrics {
  workflowName: string;
  totalDuration: number;
  steps: {
    stepId: string;
    duration: number;
  }[];
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
  };
  timestamp: string;
}

function collectMetrics(workflow: string, steps: any[]): PerformanceMetrics {
  const usage = process.memoryUsage();
  
  return {
    workflowName: workflow,
    totalDuration: steps.reduce((sum, s) => sum + s.duration, 0),
    steps: steps.map(s => ({ stepId: s.id, duration: s.duration })),
    memoryUsage: {
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal
    },
    timestamp: new Date().toISOString()
  };
}
```

## まとめ

本パフォーマンス制約により、以下を実現します：

- ✅ 予測可能な実行時間（タイムアウト設定）
- ✅ リソース使用量の制限（ファイルサイズ、メモリ）
- ✅ API制限の遵守（レート制限）
- ✅ 高速な実行（キャッシュ、並列処理）
- ✅ 継続的な改善（モニタリング）

全てのツール、ワークフロー、エージェントは、これらの制約を遵守して実装してください。
