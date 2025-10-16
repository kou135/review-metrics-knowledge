# 実装タスクリスト

## 概要

本タスクリストは、GitHubのPRレビューコメントから重要な知見を自動抽出し、コーディング規約ファイル（agents/policy.md）に蓄積するナレッジ管理システムの実装計画です。

各タスクは、要件定義書の受入基準に基づいており、Playwright MCPを活用したAI駆動テストにより、受入基準を満たすまで自動的にテスト・修正を繰り返します。

## Phase 1: プロジェクトセットアップとMVP基盤

- [x] 1. プロジェクト構造のセットアップ
  - プロジェクトの初期化とディレクトリ構成の作成
  - 必要な依存パッケージのインストール
  - TypeScript設定ファイルの作成
  - _要件: 要件5（実行環境の構築）_

- [x] 1.1 package.jsonの作成と依存関係のインストール
  - `@mastra/core`, `@ai-sdk/google`, `simple-git`, `zod`をインストール
  - 開発依存関係（`tsx`, `typescript`, `vitest`, `@playwright/test`）をインストール
  - npm scriptsの定義（`mastra:run`, `mastra:dev`, `test`）
  - _要件: 要件5.2, 5.3_

- [x] 1.2 ディレクトリ構造の作成
  - `src/mastra/agents/`, `src/mastra/tools/`, `src/mastra/workflows/`ディレクトリを作成
  - `agents/`ディレクトリを作成（ナレッジベース用）
  - `.github/workflows/`ディレクトリを作成
  - _要件: 要件5.1_

- [x] 1.3 TypeScript設定
  - `tsconfig.json`を作成し、ES2022、Node.js 20対応の設定を行う
  - モジュール解決とパスエイリアスの設定
  - _要件: 要件5.2_

- [x] 1.4 環境変数の設定
  - `.env.example`ファイルを作成し、必要な環境変数を定義
  - `GEMINI_API_KEY`, `USE_AI_CURATION`などの変数を記載
  - _要件: 要件8（セキュリティとシークレット管理）_

## Phase 2: Mastra Tools の実装（MVP機能）

- [ ] 2. File Reader Tool の実装
  - agents/policy.mdの内容を読み込むツールを作成
  - ファイルが存在しない場合の処理を実装
  - _要件: 要件3（ナレッジベースへの追記）_

- [x] 2.1 file-reader-tool.tsの作成
  - `createTool`を使用してツールを定義
  - `inputSchema`（filePath, encoding）と`outputSchema`（content, exists）を定義
  - `fs.promises.readFile`を使用した実装
  - _要件: 要件3.3_

- [ ] 2.2 File Reader Toolの単体テスト
  - 既存ファイルの読み込みテスト
  - 存在しないファイルの処理テスト
  - エンコーディングのテスト
  - _要件: 要件9（エラーハンドリング）_

- [ ] 3. File Writer Tool の実装
  - agents/policy.mdにテキストを追記するツールを作成
  - フォーマット済みコンテンツの追記機能を実装
  - _要件: 要件3（ナレッジベースへの追記）_

- [x] 3.1 file-writer-tool.tsの作成
  - `createTool`を使用してツールを定義
  - `inputSchema`（filePath, content, mode）と`outputSchema`（success, bytesWritten）を定義
  - ディレクトリ自動作成機能を実装
  - _要件: 要件3.1, 3.2_

- [ ] 3.2 File Writer Toolの単体テスト
  - 新規ファイル作成のテスト
  - 既存ファイルへの追記テスト
  - エラーハンドリングのテスト
  - _要件: 要件9.1_

- [ ] 4. Git Commit Tool の実装
  - 変更をコミット・プッシュするツールを作成
  - GitHub Actions環境でのGit設定を実装
  - _要件: 要件4（変更の永続化）_

- [x] 4.1 git-commit-tool.tsの作成
  - `createTool`を使用してツールを定義
  - `simple-git`ライブラリを使用した実装
  - Gitユーザー設定（github-actions[bot]）の自動設定
  - _要件: 要件4.1, 4.2, 4.3_

- [ ] 4.2 Git Commit Toolの単体テスト
  - コミット成功のテスト
  - プッシュ成功のテスト
  - エラーハンドリングのテスト（リトライ機能）
  - _要件: 要件4.4, 要件9.1_

## Phase 3: MVP Workflow の実装

- [ ] 5. Simple Append Workflow の実装
  - [must]コメントをそのままagents/policy.mdに追記するワークフローを作成
  - フォーマット処理とGit操作を統合
  - _要件: 要件2（コメント本文の整形）, 要件3（ナレッジベースへの追記）_

- [x] 5.1 simple-append-workflow.tsの作成
  - `Workflow`クラスを使用してワークフローを定義
  - `triggerSchema`（comment, prBranch）を定義
  - Step 1: フォーマットと追記処理
  - Step 2: Gitコミット・プッシュ処理
  - _要件: 要件2.1, 2.2, 要件3.1, 3.2, 要件4.1, 4.2, 4.3_

- [ ] 5.2 Simple Append Workflowの統合テスト
  - モックデータでのワークフロー実行テスト
  - agents/policy.mdへの追記確認
  - Gitコミット・プッシュの確認
  - _要件: 要件3.4, 要件4.4_

## Phase 4: Mastra Instance とエントリーポイント

- [x] 6. Mastra Instanceの作成
  - Mastraインスタンスを作成し、ツールとワークフローを登録
  - _要件: 要件5（実行環境の構築）_

- [x] 6.1 src/mastra/index.tsの作成
  - `Mastra`クラスをインスタンス化
  - `workflows`に`simpleAppendWorkflow`を登録
  - エクスポート設定
  - _要件: 要件5.4_

- [ ] 7. 実行エントリーポイントの作成
  - 環境変数からコメント情報を取得し、ワークフローを実行
  - [must]接頭辞の除去処理を実装
  - _要件: 要件2（コメント本文の整形）_

- [x] 7.1 src/run.tsの作成
  - 環境変数（COMMENT_BODY, COMMENT_URL, PR_BRANCH, TIMESTAMP）の取得
  - [must]接頭辞の除去ロジック
  - ワークフロー実行とエラーハンドリング
  - _要件: 要件2.1, 要件5.4, 要件9.1_

- [ ] 7.2 エントリーポイントの統合テスト
  - 環境変数を設定してrun.tsを実行
  - ワークフローが正常に完了することを確認
  - _要件: 要件9.3_

## Phase 5: GitHub Actions Workflow の実装

- [ ] 8. GitHub Actions Workflowの作成
  - issue_commentイベントをトリガーとするワークフローを実装
  - [must]タグの検出とMastraアプリケーションの実行
  - _要件: 要件1（Must Commentの検出）, 要件5（実行環境の構築）_

- [x] 8.1 .github/workflows/knowledge-automation.ymlの作成
  - `issue_comment`イベントトリガーの設定
  - 実行条件（PRコメント、[must]接頭辞）の設定
  - Node.js環境のセットアップ
  - _要件: 要件1.1, 1.2, 1.3, 要件5.1, 5.2_

- [x] 8.2 環境変数の設定とMastraアプリケーションの実行
  - GitHub Secretsから`GEMINI_API_KEY`を取得
  - イベントペイロードから`COMMENT_BODY`, `COMMENT_URL`, `PR_BRANCH`, `TIMESTAMP`を抽出
  - `npm run mastra:run`でアプリケーションを実行
  - _要件: 要件5.4, 要件8.1_

- [ ] 8.3 GitHub Actions Workflowのテスト
  - テスト用リポジトリでワークフローを実行
  - [must]コメント投稿からナレッジ追加までのE2Eテスト
  - _要件: 要件1.1, 1.2, 1.3, 要件10（成功指標の測定）_

## Phase 6: MVP機能の検証とデバッグ

- [ ] 9. MVP機能の統合テスト
  - 全体フローの動作確認とデバッグ
  - _要件: 要件10（成功指標の測定）_

- [ ] 9.1 ローカル環境でのテスト
  - モックデータを使用してrun.tsを実行
  - agents/policy.mdへの追記を確認
  - _要件: 要件3.1, 3.2_

- [ ] 9.2 GitHub Actions環境でのE2Eテスト
  - テスト用PRに[must]コメントを投稿
  - ワークフローの実行を確認
  - agents/policy.mdの内容を検証
  - _要件: 要件10.1_

- [ ] 9.3 エラーハンドリングとログ出力の確認
  - 各種エラーケースのテスト
  - ログ出力の確認
  - _要件: 要件9（エラーハンドリングと観測可能性）_

## Phase 7: AI Curation Agent の実装（発展要件）

- [ ] 10. Curation Agentの実装
  - 新規コメントの重複判定と要約を行うエージェントを作成
  - _要件: 要件6（AIキュレーション機能）, 要件7（ルールの要約と汎用化）_

- [ ] 10.1 curation-agent.tsの作成
  - `Agent`クラスを使用してエージェントを定義
  - Gemini 2.0 Flash Expモデルの設定
  - 重複判定と要約のためのinstructionsを定義
  - _要件: 要件6.1, 6.2, 要件7.1, 7.2_

- [ ] 10.2 Curation Agentの単体テスト
  - 重複判定のテスト（既存ルールと類似したコメント）
  - 新規判定のテスト（既存ルールと異なるコメント）
  - 要約品質のテスト
  - _要件: 要件6.2, 6.3, 要件7.1, 7.2_

## Phase 8: Knowledge Update Workflow の実装（発展要件）

- [ ] 11. Knowledge Update Workflowの実装
  - AIキュレーションを含むワークフローを作成
  - 重複チェック、要約、条件付き追記を実装
  - _要件: 要件6（AIキュレーション機能）, 要件7（ルールの要約と汎用化）_

- [ ] 11.1 knowledge-update-workflow.tsの作成
  - `Workflow`クラスを使用してワークフローを定義
  - Step 1: 既存ナレッジベースの読み込み
  - Step 2: Curation Agentによるキュレーション
  - Step 3: 条件分岐と追記処理
  - _要件: 要件6.1, 6.2, 6.3, 6.4, 要件7.1, 7.2, 7.3_

- [ ] 11.2 Knowledge Update Workflowの統合テスト
  - 重複コメントのスキップテスト
  - 新規コメントの要約・追記テスト
  - JSON パースエラーのハンドリングテスト
  - _要件: 要件6.3, 6.4, 要件7.3, 7.4_

## Phase 9: 発展機能の統合とテスト

- [ ] 12. Mastra Instanceへの発展機能の統合
  - Curation AgentとKnowledge Update Workflowを登録
  - _要件: 要件6, 要件7_

- [ ] 12.1 src/mastra/index.tsの更新
  - `agents`に`curationAgent`を追加
  - `workflows`に`knowledgeUpdateWorkflow`を追加
  - _要件: 要件6.1, 要件7.1_

- [ ] 12.2 src/run.tsの更新
  - `USE_AI_CURATION`環境変数による切り替え機能を実装
  - MVP/発展モードの判定ロジック
  - _要件: 要件6.1_

- [ ] 13. 発展機能のE2Eテスト
  - AI キュレーション機能の動作確認
  - _要件: 要件10（成功指標の測定）_

- [ ] 13.1 重複排除機能のテスト
  - 既存ルールと類似したコメントを投稿
  - 重複判定されることを確認
  - agents/policy.mdが更新されないことを確認
  - _要件: 要件6.2, 6.3, 要件10.2_

- [ ] 13.2 要約機能のテスト
  - 新規コメントを投稿
  - 汎用的なルールに要約されることを確認
  - agents/policy.mdに要約されたルールが追記されることを確認
  - _要件: 要件7.1, 7.2, 7.3, 要件10.2_

## Phase 10: 観測可能性とメトリクス（オプション）

- [ ] 14. OpenTelemetryの統合
  - Mastra標準のOpenTelemetryトレーシングを有効化
  - _要件: 要件9（エラーハンドリングと観測可能性）_

- [ ] 14.1 トレーシング設定
  - OpenTelemetryエクスポーターの設定
  - ワークフローステップのトレーシング
  - _要件: 要件9.2_

- [ ] 14.2 メトリクス測定
  - 成功率の測定ロジック
  - 重複排除率の測定ロジック
  - _要件: 要件10.1, 10.2, 10.3_

## Phase 11: ドキュメントと最終検証

- [ ] 15. ドキュメントの作成
  - README.mdの作成
  - セットアップ手順の記載
  - 使用方法の説明

- [ ] 15.1 README.mdの作成
  - プロジェクト概要
  - セットアップ手順
  - 環境変数の説明
  - 使用方法

- [ ] 15.2 CONTRIBUTING.mdの作成
  - 開発環境のセットアップ
  - テストの実行方法
  - コントリビューションガイドライン

- [ ] 16. 最終検証
  - 全要件の達成確認
  - パフォーマンステスト
  - _要件: 全要件_

- [ ] 16.1 要件達成の確認
  - 要件1-10の受入基準を全て満たすことを確認
  - 成功指標（99%登録成功率、80%重複排除率）の達成確認
  - _要件: 要件10.1, 10.2_

- [ ] 16.2 パフォーマンステスト
  - MVP全体の実行時間（目標: 10秒以内）
  - AI キュレーション実行時間（目標: 15秒以内）
  - _要件: パフォーマンス要件_

## 注意事項

### タスク実行の原則

1. **1タスクずつ実行**: 各タスクは順番に1つずつ実行し、完了後に次のタスクに進む
2. **受入基準の確認**: 各タスクの要件を満たすことを確認してから次に進む
3. **AI駆動テスト**: Playwright MCPを活用し、受入基準を満たすまで自動的にテスト・修正を繰り返す
4. **オプショナルタスク**: `*`マークのタスクはオプショナル（スキップ可能）

### テスト戦略

- **単体テスト**: 各ツールの動作を個別に検証
- **統合テスト**: ワークフロー全体の動作を検証
- **E2Eテスト**: GitHub Actions環境での実際の動作を検証
- **AI駆動テスト**: 受入基準を満たすまで自動的にテスト・修正を繰り返す

### 成功基準

- Must Commentの99%以上がナレッジベースに正常に登録される
- 意味的に重複するコメントの80%以上が自動的に排除される（発展要件）
- 全ての受入基準を満たすテストがパスする
