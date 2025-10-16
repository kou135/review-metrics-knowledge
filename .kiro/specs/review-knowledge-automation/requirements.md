# 要件定義書

## はじめに

本システムは、GitHubのプルリクエスト（PR）レビューにおいて、メンターが繰り返し指摘する内容をナレッジベースとして自動蓄積し、レビュー工数を削減することを目的とする。特定のタグ（[must]）が付与されたレビューコメントを検出し、リポジトリ内のコーディング規約ファイルに自動追記する。将来的には、AIによる重複排除と要約機能を追加し、ナレッジの品質を向上させる。

## 用語集

- **System**: 本レビューナレッジ自動化システム全体
- **GitHub Actions Workflow**: GitHubのCI/CD機能を利用した自動実行環境
- **Must Comment**: PRレビューコメントのうち、本文が「[must]」で始まるコメント
- **Knowledge Base**: agents/policy.mdファイルに蓄積されるコーディング規約とレビュー知見
- **Mastra Application**: Mastraフレームワークで構築されたTypeScriptアプリケーション
- **Curation Agent**: AIによる重複チェックと要約を行うMastraエージェント
- **PR Branch**: プルリクエストが作成されているGitブランチ

## 要件

### 要件1: Must Commentの検出

**ユーザーストーリー:** メンターとして、重要な指摘を[must]タグで明示することで、その内容が確実にナレッジベースに記録されることを期待する

#### 受入基準

1. WHEN GitHub上のPRに新しいコメントが投稿される, THE System SHALL そのコメントの本文が「[must]」で始まるかを判定する
2. WHEN Must Commentが検出される, THE System SHALL GitHub Actions Workflowを起動する
3. THE System SHALL PRに紐づくコメントのみを処理対象とし、Issue単体のコメントは無視する

### 要件2: コメント本文の整形

**ユーザーストーリー:** システム管理者として、ナレッジベースに保存される内容が統一されたフォーマットであることを期待する

#### 受入基準

1. WHEN Must Commentを処理する, THE System SHALL コメント本文から「[must]」接頭辞を削除する
2. THE System SHALL 削除後のコメント本文を、後続処理のために保持する
3. THE System SHALL 元のコメント本文を改変せず、処理用のコピーのみを編集する

### 要件3: ナレッジベースへの追記（MVP機能）

**ユーザーストーリー:** 開発者として、メンターの指摘がagents/policy.mdに自動的に蓄積されることで、過去の知見を参照しやすくなることを期待する

#### 受入基準

1. WHEN 整形済みコメント本文を取得する, THE System SHALL agents/policy.mdファイルの末尾に改行を挿入した上で追記する
2. THE System SHALL 追記時にタイムスタンプとコメント元のURL情報を含める
3. IF agents/policy.mdファイルが存在しない, THEN THE System SHALL 新規にファイルを作成してから追記する
4. THE System SHALL 追記処理が完了するまで、後続のGit操作を開始しない

### 要件4: 変更の永続化

**ユーザーストーリー:** メンターとして、ナレッジベースへの追記が自動的にコミット・プッシュされることで、手動操作なしに変更が反映されることを期待する

#### 受入基準

1. WHEN agents/policy.mdへの追記が完了する, THE System SHALL 変更をPR Branchにコミットする
2. THE System SHALL コミットメッセージに「自動追記: [must]コメントからナレッジ追加」という説明を含める
3. THE System SHALL コミット後、直ちにPR Branchへプッシュする
4. IF Git操作が失敗する, THEN THE System SHALL エラーログを出力し、GitHub Actions Workflowを失敗ステータスで終了する

### 要件5: 実行環境の構築

**ユーザーストーリー:** システム管理者として、GitHub Actions上でMastra Applicationが正常に動作する環境が自動構築されることを期待する

#### 受入基準

1. WHEN GitHub Actions Workflowが起動する, THE System SHALL Ubuntu最新版のランナー環境を使用する
2. THE System SHALL Node.js 20.x環境をセットアップする
3. THE System SHALL npm installコマンドで依存パッケージをインストールする
4. THE System SHALL 環境変数またはコマンドライン引数を通じて、コメント本文とPR情報をMastra Applicationに渡す

### 要件6: AIキュレーション機能（発展要件）

**ユーザーストーリー:** メンターとして、類似した指摘が重複して蓄積されることを避け、ナレッジベースの品質を高く保ちたい

#### 受入基準

1. WHEN 整形済みコメント本文を取得する, THE System SHALL Curation Agentを呼び出して既存Knowledge Baseとの意味的重複を判定する
2. THE Curation Agent SHALL 新規コメントがKnowledge Base内の既存ルールと80%以上意味的に重複する場合、「重複」と判定する
3. IF Curation Agentが「重複」と判定する, THEN THE System SHALL agents/policy.mdへの追記をスキップし、処理を終了する
4. IF Curation Agentが「新規」と判定する, THEN THE System SHALL 要件7の要約処理に進む

### 要件7: ルールの要約と汎用化（発展要件）

**ユーザーストーリー:** 開発者として、ナレッジベースに記録されるルールが具体的な事例ではなく、汎用的で再利用可能な形式であることを期待する

#### 受入基準

1. WHEN Curation Agentが新規コメントを「新規」と判定する, THE Curation Agent SHALL コメント内容をより汎用的で規範的なルールに要約する
2. THE Curation Agent SHALL 要約後のルールが元のコメントの意図を保持していることを確認する
3. THE System SHALL 要約済みルールをagents/policy.mdに追記する
4. THE System SHALL 要約処理に100秒以上かかる場合、タイムアウトエラーを出力する

### 要件8: セキュリティとシークレット管理

**ユーザーストーリー:** システム管理者として、APIキーなどの機密情報が安全に管理されることを期待する

#### 受入基準

1. THE System SHALL Gemini APIキーをGitHub Actionsの暗号化されたシークレットとして保存する
2. THE System SHALL シークレット情報をログやコミットメッセージに出力しない
3. THE System SHALL GitHub Actionsのcontents: write権限のみを使用し、最小権限の原則に従う

### 要件9: エラーハンドリングと観測可能性

**ユーザーストーリー:** システム管理者として、処理が失敗した際に原因を迅速に特定できることを期待する

#### 受入基準

1. IF Mastra Applicationの実行中にエラーが発生する, THEN THE System SHALL 詳細なエラーメッセージをGitHub Actionsログに出力する
2. THE System SHALL OpenTelemetryを利用して、処理のトレース情報を記録する
3. WHEN GitHub Actions Workflowが失敗する, THE System SHALL ワークフロー実行結果ページで失敗ステータスを明示する
4. THE System SHALL 各処理ステップの開始と完了をログに記録する

### 要件10: 成功指標の測定

**ユーザーストーリー:** プロダクトオーナーとして、システムが期待通りの精度で動作していることを定量的に確認したい

#### 受入基準

1. THE System SHALL Must Commentの99%以上をKnowledge Baseに正常に登録する
2. WHERE AIキュレーション機能が有効である, THE System SHALL 意味的に重複するコメントの80%以上を自動的に排除する
3. THE System SHALL 登録成功率と重複排除率を測定するためのログを出力する
