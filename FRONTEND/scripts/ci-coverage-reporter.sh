#!/bin/bash
# CI Coverage Reporter Script
# カバレッジ情報をGitHub Actions用に整形して出力するスクリプト
#
# 使用方法:
#   bash scripts/ci-coverage-reporter.sh
#
# 前提条件:
#   - coverage/coverage-summary.json が存在すること
#
# 出力:
#   - GitHub Actions Job Summary（$GITHUB_STEP_SUMMARY）
#   - GitHub Actions Annotations（::warning）
#   - 環境変数（$GITHUB_ENV）

set -euo pipefail

COVERAGE_FILE="coverage/coverage-summary.json"

# カバレッジファイルの存在確認
if [ ! -f "$COVERAGE_FILE" ]; then
  echo "::error::カバレッジファイルが見つかりません: $COVERAGE_FILE"
  echo "::error::npm run test:coverage を実行してください"
  exit 1
fi

echo "::group::カバレッジ情報の解析"

# カバレッジ情報の抽出（jqを使わずgrepで抽出）
STMT_COV=$(grep -oP '"statements":{"total":\d+,"covered":\d+,"skipped":\d+,"pct":\K[0-9.]+' "$COVERAGE_FILE" | head -1)
BRANCH_COV=$(grep -oP '"branches":{"total":\d+,"covered":\d+,"skipped":\d+,"pct":\K[0-9.]+' "$COVERAGE_FILE" | head -1)
FUNC_COV=$(grep -oP '"functions":{"total":\d+,"covered":\d+,"skipped":\d+,"pct":\K[0-9.]+' "$COVERAGE_FILE" | head -1)
LINE_COV=$(grep -oP '"lines":{"total":\d+,"covered":\d+,"skipped":\d+,"pct":\K[0-9.]+' "$COVERAGE_FILE" | head -1)

# デフォルト値の設定
STMT_COV=${STMT_COV:-0}
BRANCH_COV=${BRANCH_COV:-0}
FUNC_COV=${FUNC_COV:-0}
LINE_COV=${LINE_COV:-0}

echo "Statements: ${STMT_COV}%"
echo "Branches: ${BRANCH_COV}%"
echo "Functions: ${FUNC_COV}%"
echo "Lines: ${LINE_COV}%"
echo "::endgroup::"

# 環境変数への保存
if [ -n "${GITHUB_ENV:-}" ]; then
  echo "STMT_COV=$STMT_COV" >> "$GITHUB_ENV"
  echo "BRANCH_COV=$BRANCH_COV" >> "$GITHUB_ENV"
  echo "FUNC_COV=$FUNC_COV" >> "$GITHUB_ENV"
  echo "LINE_COV=$LINE_COV" >> "$GITHUB_ENV"
fi

# 閾値の定義
STMT_THRESHOLD=80
BRANCH_THRESHOLD=65
FUNC_THRESHOLD=80
LINE_THRESHOLD=80

# 閾値チェック
WARNINGS=0

if (( $(echo "$STMT_COV < $STMT_THRESHOLD" | bc -l) )); then
  echo "::warning::Statements カバレッジが閾値未満です: ${STMT_COV}% < ${STMT_THRESHOLD}%"
  WARNINGS=$((WARNINGS + 1))
fi

if (( $(echo "$BRANCH_COV < $BRANCH_THRESHOLD" | bc -l) )); then
  echo "::warning::Branches カバレッジが閾値未満です: ${BRANCH_COV}% < ${BRANCH_THRESHOLD}%"
  WARNINGS=$((WARNINGS + 1))
fi

if (( $(echo "$FUNC_COV < $FUNC_THRESHOLD" | bc -l) )); then
  echo "::warning::Functions カバレッジが閾値未満です: ${FUNC_COV}% < ${FUNC_THRESHOLD}%"
  WARNINGS=$((WARNINGS + 1))
fi

if (( $(echo "$LINE_COV < $LINE_THRESHOLD" | bc -l) )); then
  echo "::warning::Lines カバレッジが閾値未満です: ${LINE_COV}% < ${LINE_THRESHOLD}%"
  WARNINGS=$((WARNINGS + 1))
fi

# GitHub Actions Job Summaryの生成
if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  echo "### 📈 カバレッジ" >> "$GITHUB_STEP_SUMMARY"
  echo "" >> "$GITHUB_STEP_SUMMARY"
  echo "| 項目 | カバレッジ | 閾値 | 状態 |" >> "$GITHUB_STEP_SUMMARY"
  echo "|------|-----------|------|------|" >> "$GITHUB_STEP_SUMMARY"

  # Statementsの状態
  if (( $(echo "$STMT_COV >= $STMT_THRESHOLD" | bc -l) )); then
    STMT_STATUS="✅"
  else
    STMT_STATUS="⚠️"
  fi

  # Branchesの状態
  if (( $(echo "$BRANCH_COV >= $BRANCH_THRESHOLD" | bc -l) )); then
    BRANCH_STATUS="✅"
  else
    BRANCH_STATUS="⚠️"
  fi

  # Functionsの状態
  if (( $(echo "$FUNC_COV >= $FUNC_THRESHOLD" | bc -l) )); then
    FUNC_STATUS="✅"
  else
    FUNC_STATUS="⚠️"
  fi

  # Linesの状態
  if (( $(echo "$LINE_COV >= $LINE_THRESHOLD" | bc -l) )); then
    LINE_STATUS="✅"
  else
    LINE_STATUS="⚠️"
  fi

  echo "| Statements | ${STMT_COV}% | ${STMT_THRESHOLD}% | $STMT_STATUS |" >> "$GITHUB_STEP_SUMMARY"
  echo "| Branches | ${BRANCH_COV}% | ${BRANCH_THRESHOLD}% | $BRANCH_STATUS |" >> "$GITHUB_STEP_SUMMARY"
  echo "| Functions | ${FUNC_COV}% | ${FUNC_THRESHOLD}% | $FUNC_STATUS |" >> "$GITHUB_STEP_SUMMARY"
  echo "| Lines | ${LINE_COV}% | ${LINE_THRESHOLD}% | $LINE_STATUS |" >> "$GITHUB_STEP_SUMMARY"
  echo "" >> "$GITHUB_STEP_SUMMARY"

  # 警告がある場合の対処方法
  if [ $WARNINGS -gt 0 ]; then
    echo "### ⚠️ カバレッジ警告" >> "$GITHUB_STEP_SUMMARY"
    echo "" >> "$GITHUB_STEP_SUMMARY"
    echo "${WARNINGS}個の項目でカバレッジが閾値未満です。" >> "$GITHUB_STEP_SUMMARY"
    echo "" >> "$GITHUB_STEP_SUMMARY"
    echo "### 🔧 改善方法" >> "$GITHUB_STEP_SUMMARY"
    echo "" >> "$GITHUB_STEP_SUMMARY"
    echo '```bash' >> "$GITHUB_STEP_SUMMARY"
    echo "# カバレッジレポートを確認" >> "$GITHUB_STEP_SUMMARY"
    echo "npm run test:coverage" >> "$GITHUB_STEP_SUMMARY"
    echo "" >> "$GITHUB_STEP_SUMMARY"
    echo "# HTMLレポートを開く" >> "$GITHUB_STEP_SUMMARY"
    echo "open coverage/lcov-report/index.html" >> "$GITHUB_STEP_SUMMARY"
    echo '```' >> "$GITHUB_STEP_SUMMARY"
    echo "" >> "$GITHUB_STEP_SUMMARY"
    echo "未カバーの行を確認し、テストを追加してください。" >> "$GITHUB_STEP_SUMMARY"
  else
    echo "### ✅ カバレッジ達成" >> "$GITHUB_STEP_SUMMARY"
    echo "" >> "$GITHUB_STEP_SUMMARY"
    echo "すべてのカバレッジ閾値を達成しています。" >> "$GITHUB_STEP_SUMMARY"
  fi

  echo "" >> "$GITHUB_STEP_SUMMARY"
  echo "### 📁 カバレッジレポート" >> "$GITHUB_STEP_SUMMARY"
  echo "" >> "$GITHUB_STEP_SUMMARY"
  echo "詳細なカバレッジレポートは、Artifactsの'coverage-report'をダウンロードして確認してください。" >> "$GITHUB_STEP_SUMMARY"
fi

# 結果の通知
if [ $WARNINGS -eq 0 ]; then
  echo "::notice::✅ カバレッジ閾値達成（Statements: ${STMT_COV}%, Branches: ${BRANCH_COV}%, Functions: ${FUNC_COV}%, Lines: ${LINE_COV}%）"
fi

# 警告があっても成功扱い（CI失敗にはしない）
exit 0
