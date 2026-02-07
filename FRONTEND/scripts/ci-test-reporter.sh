#!/bin/bash
# CI Test Reporter Script
# テスト結果をGitHub Actions用に整形して出力するスクリプト
#
# 使用方法:
#   bash scripts/ci-test-reporter.sh <test-log-file>
#
# 出力:
#   - GitHub Actions Job Summary（$GITHUB_STEP_SUMMARY）
#   - GitHub Actions Annotations（::error、::warning）

set -euo pipefail

# 引数チェック
if [ $# -lt 1 ]; then
  echo "使用方法: $0 <test-log-file>"
  exit 1
fi

TEST_LOG="$1"

if [ ! -f "$TEST_LOG" ]; then
  echo "::error::テストログファイルが見つかりません: $TEST_LOG"
  exit 1
fi

# テスト結果の解析
echo "::group::テスト結果の解析"

# テストサマリーの抽出
TEST_SUITES=$(grep -oP "Test Suites:.*" "$TEST_LOG" | head -1 || echo "Test Suites: 情報なし")
TESTS=$(grep -oP "Tests:.*" "$TEST_LOG" | head -1 || echo "Tests: 情報なし")

# 失敗したテストの抽出
FAILED_TESTS=$(grep -E "FAIL|✕" "$TEST_LOG" | head -10 || echo "")

echo "$TEST_SUITES"
echo "$TESTS"
echo "::endgroup::"

# GitHub Actions Job Summaryの生成
if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  echo "## 🧪 テスト結果" >> "$GITHUB_STEP_SUMMARY"
  echo "" >> "$GITHUB_STEP_SUMMARY"
  echo "### 📊 テスト統計" >> "$GITHUB_STEP_SUMMARY"
  echo "" >> "$GITHUB_STEP_SUMMARY"
  echo "- $TEST_SUITES" >> "$GITHUB_STEP_SUMMARY"
  echo "- $TESTS" >> "$GITHUB_STEP_SUMMARY"
  echo "" >> "$GITHUB_STEP_SUMMARY"

  # 失敗したテストがある場合
  if grep -q "FAIL" "$TEST_LOG"; then
    echo "### ❌ 失敗したテスト" >> "$GITHUB_STEP_SUMMARY"
    echo "" >> "$GITHUB_STEP_SUMMARY"
    echo '```' >> "$GITHUB_STEP_SUMMARY"
    echo "$FAILED_TESTS" >> "$GITHUB_STEP_SUMMARY"
    echo '```' >> "$GITHUB_STEP_SUMMARY"
    echo "" >> "$GITHUB_STEP_SUMMARY"
    echo "### 🔧 対処方法" >> "$GITHUB_STEP_SUMMARY"
    echo "" >> "$GITHUB_STEP_SUMMARY"
    echo '```bash' >> "$GITHUB_STEP_SUMMARY"
    echo "# 失敗したテストのみ再実行" >> "$GITHUB_STEP_SUMMARY"
    echo "npm test -- --onlyFailures" >> "$GITHUB_STEP_SUMMARY"
    echo "" >> "$GITHUB_STEP_SUMMARY"
    echo "# 詳細なエラーメッセージを表示" >> "$GITHUB_STEP_SUMMARY"
    echo "npm test -- --verbose" >> "$GITHUB_STEP_SUMMARY"
    echo '```' >> "$GITHUB_STEP_SUMMARY"
  else
    echo "### ✅ 全テスト成功" >> "$GITHUB_STEP_SUMMARY"
    echo "" >> "$GITHUB_STEP_SUMMARY"
    echo "すべてのテストが正常に完了しました。" >> "$GITHUB_STEP_SUMMARY"
  fi
fi

# GitHub Actions Annotationsの生成
if grep -q "FAIL" "$TEST_LOG"; then
  echo "::error::テストが失敗しました。詳細はログを確認してください。"

  # 失敗したテストをアノテーション
  echo "$FAILED_TESTS" | while read -r line; do
    if [ -n "$line" ]; then
      echo "::error::$line"
    fi
  done

  exit 1
else
  echo "::notice::✅ 全テスト成功"
fi

exit 0
