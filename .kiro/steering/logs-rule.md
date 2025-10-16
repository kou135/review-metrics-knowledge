# 作業ログ記録ルール

## 概要

本プロジェクトでは、全ての実装作業について詳細なログを `.kiro/specs/review-knowledge-automation/logs.md` に記録します。これにより、作業の透明性を確保し、問題発生時の追跡を容易にします。

## ログ記録の基本フォーマット

各作業セクションには以下の情報を含めます：

```markdown
### HH:MM - タスク名

**実装内容:**
- 実装した機能の詳細
- 使用した技術・ライブラリ
- 設計上の判断

**テスト内容:**
1. テストケース1の説明
2. テストケース2の説明
...

**テスト結果:**
✅/❌ テスト結果の詳細
- 各テストケースの結果
- パフォーマンス情報（実行時間、バイト数など）

**気づきメモ:**
- 実装中に気づいた重要なポイント
- 将来の改善案
- 注意すべき制約事項

**TODO:**
- [ ] 次に実施すべきタスク
- [ ] 保留中の課題

---
```

## Playwright MCP 使用時の記録ルール

### 必須記録事項

Playwright MCPを使用してテストを実行した場合、以下の情報を必ず記録します：

#### 1. 使用報告

```markdown
**Playwright MCP 使用:**
✅ Playwright MCPを使用してE2Eテストを実行しました
```

#### 2. テストケースの詳細

```markdown
**Playwright テストケース:**

1. **テストケース名**: [テストの目的]
   - **操作内容**: 
     - `playwright_navigate`: URLへの遷移
     - `playwright_fill`: フォーム入力
     - `playwright_click`: ボタンクリック
     - `playwright_screenshot`: スクリーンショット取得
   - **検証内容**: 何を確認したか
   - **期待結果**: 期待される動作
   - **実際の結果**: 実際に観察された動作

2. **テストケース名**: [次のテストの目的]
   ...
```

#### 3. テスト実行結果

```markdown
**Playwright テスト結果:**
✅ テストケース1: 成功 - [詳細]
✅ テストケース2: 成功 - [詳細]
❌ テストケース3: 失敗 - [エラー内容]

**スクリーンショット:**
- `screenshot-1.png`: [説明]
- `screenshot-2.png`: [説明]
```

#### 4. 使用したMCPツール一覧

```markdown
**使用したPlaywright MCPツール:**
- `playwright_navigate`: ページ遷移に使用
- `playwright_fill`: フォーム入力に使用
- `playwright_click`: ボタン操作に使用
- `playwright_get_visible_text`: コンテンツ検証に使用
- `playwright_screenshot`: 視覚的確認に使用
```

### 記録例

```markdown
### 15:30 - タスク8.3: GitHub Actions Workflowのテスト

**Playwright MCP 使用:**
✅ Playwright MCPを使用してE2Eテストを実行しました

**Playwright テストケース:**

1. **[must]コメント投稿からナレッジ追加まで**
   - **操作内容**:
     - `playwright_navigate`: テスト用PRページ（https://github.com/test/repo/pull/1）に遷移
     - `playwright_fill`: コメント欄に「[must] 変数名は意味が明確であること」を入力
     - `playwright_click`: コメント投稿ボタンをクリック
     - 60秒待機（GitHub Actionsの実行を待つ）
     - `playwright_navigate`: agents/policy.mdページに遷移
     - `playwright_get_visible_text`: ファイル内容を取得
   - **検証内容**: agents/policy.mdに「変数名は意味が明確であること」が追記されているか
   - **期待結果**: コメント内容がフォーマットされてagents/policy.mdに追記される
   - **実際の結果**: ✅ 期待通りに追記された

**Playwright テスト結果:**
✅ テストケース1: 成功 - agents/policy.mdに正しく追記されました
  - ファイルサイズ: 250文字
  - タイムスタンプ: 2025-10-16 15:30:00
  - 出典URL: 正しく記録されている

**使用したPlaywright MCPツール:**
- `playwright_navigate`: ページ遷移（2回使用）
- `playwright_fill`: コメント入力
- `playwright_click`: ボタンクリック
- `playwright_get_visible_text`: コンテンツ検証
- `playwright_screenshot`: 結果の視覚的確認

**スクリーンショット:**
- `pr-comment-posted.png`: コメント投稿後の画面
- `knowledge-base-updated.png`: agents/policy.md更新後の画面
```

## Tavily MCP 使用時の記録ルール

### 必須記録事項

Tavily MCPを使用してエラー調査や情報収集を行った場合、以下の情報を必ず記録します：

#### 1. 使用報告

```markdown
**Tavily MCP 使用:**
✅ Tavily MCPを使用してエラー調査を実施しました
```

#### 2. 検索クエリと目的

```markdown
**Tavily 検索内容:**

1. **検索クエリ**: "[エラーメッセージまたは調査内容]"
   - **検索目的**: なぜこの情報が必要だったか
   - **使用したツール**: `tavily_search` / `tavily_extract` / `tavily_crawl`
   - **検索パラメータ**:
     - `max_results`: 5
     - `search_depth`: basic/advanced
     - その他のオプション
```

#### 3. 検索結果

```markdown
**Tavily 検索結果:**

1. **検索クエリ**: "[クエリ内容]"
   - **結果サマリー**: 検索で得られた主要な情報
   - **参考URL**:
     - https://example.com/article1 - [内容の要約]
     - https://example.com/article2 - [内容の要約]
   - **重要な発見**:
     - 発見1: [詳細]
     - 発見2: [詳細]
   - **適用した解決策**: 検索結果を基にどのように問題を解決したか
```

#### 4. 調査結果の適用

```markdown
**調査結果の適用:**
- **問題**: [発生していた問題]
- **原因**: Tavily検索で判明した原因
- **解決策**: 適用した修正内容
- **結果**: 修正後の動作確認
```

### 記録例

```markdown
### 16:00 - エラー修正: Git Commit Tool のプッシュ失敗

**Tavily MCP 使用:**
✅ Tavily MCPを使用してエラー調査を実施しました

**Tavily 検索内容:**

1. **検索クエリ**: "simple-git push error Permission denied publickey GitHub Actions"
   - **検索目的**: GitHub ActionsでのGitプッシュ時の認証エラーを解決するため
   - **使用したツール**: `tavily_search`
   - **検索パラメータ**:
     - `max_results`: 5
     - `search_depth`: advanced
     - `topic`: general

**Tavily 検索結果:**

1. **検索クエリ**: "simple-git push error Permission denied publickey GitHub Actions"
   - **結果サマリー**: GitHub Actionsでは、デフォルトのGITHUB_TOKENを使用してHTTPS経由でプッシュする必要がある
   - **参考URL**:
     - https://docs.github.com/en/actions/security-guides/automatic-token-authentication
       → GitHub Actionsの自動トークン認証について
     - https://stackoverflow.com/questions/57712542/
       → simple-gitでトークンを使用する方法
   - **重要な発見**:
     - 発見1: SSH鍵ではなく、GITHUB_TOKENを使用する必要がある
     - 発見2: リモートURLを `https://x-access-token:${token}@github.com/...` 形式に変更する必要がある
   - **適用した解決策**: 
     - `git.addRemote()` でHTTPS URLを設定
     - 環境変数 `GITHUB_TOKEN` を使用してプッシュ

**調査結果の適用:**
- **問題**: Git pushが "Permission denied (publickey)" エラーで失敗
- **原因**: GitHub ActionsではSSH鍵が使用できず、GITHUB_TOKENが必要
- **解決策**: 
  ```typescript
  const token = process.env.GITHUB_TOKEN;
  const remoteUrl = `https://x-access-token:${token}@github.com/${repo}.git`;
  await git.addRemote('origin-https', remoteUrl);
  await git.push('origin-https', branch);
  ```
- **結果**: ✅ プッシュが成功し、PRブランチに変更がコミットされた
```

## エラー発生時の記録ルール

エラーが発生した場合、以下の情報を詳細に記録します：

```markdown
**エラー発生:**
❌ [エラーの概要]

**エラー詳細:**
- **エラーメッセージ**: [完全なエラーメッセージ]
- **スタックトレース**: [関連するスタックトレース]
- **発生箇所**: [ファイル名:行番号]
- **再現手順**: 
  1. ステップ1
  2. ステップ2
  ...

**調査方法:**
- Tavily MCP検索: [検索内容]
- ドキュメント参照: [参照したドキュメント]
- コード確認: [確認した箇所]

**解決策:**
- **試行1**: [試した解決策] → ❌/✅ 結果
- **試行2**: [試した解決策] → ❌/✅ 結果
- **最終解決策**: [採用した解決策] → ✅ 成功

**修正内容:**
```typescript
// 修正前
[修正前のコード]

// 修正後
[修正後のコード]
```

**検証:**
- テスト実行: ✅ 成功
- 受入基準確認: ✅ 満たしている
```

## パフォーマンス情報の記録

パフォーマンスに関する情報も記録します：

```markdown
**パフォーマンス:**
- 実行時間: XXX ms
- メモリ使用量: XXX MB
- ファイルサイズ: XXX bytes
- API呼び出し回数: XXX 回
```

## まとめ

全ての作業について、以下を必ず記録します：

1. ✅ **実装内容**: 何を実装したか
2. ✅ **テスト内容**: どのようにテストしたか
3. ✅ **テスト結果**: テストの結果（成功/失敗）
4. ✅ **Playwright MCP使用時**: 使用報告、テストケース、結果、スクリーンショット
5. ✅ **Tavily MCP使用時**: 使用報告、検索内容、結果、適用した解決策
6. ✅ **エラー発生時**: エラー詳細、調査方法、解決策、修正内容
7. ✅ **気づきメモ**: 重要なポイント、改善案
8. ✅ **TODO**: 次のタスク

これにより、作業の透明性を確保し、将来の参考資料として活用できます。
