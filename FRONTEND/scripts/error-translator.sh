#!/bin/bash
# Error Translator Script
# 英語のエラーメッセージを日本語に翻訳するスクリプト
#
# 使用方法:
#   bash scripts/error-translator.sh <log-file>
#   echo "error message" | bash scripts/error-translator.sh
#
# 出力:
#   - 翻訳されたエラーメッセージ
#   - 対処方法（該当する場合）

set -euo pipefail

# エラーメッセージの辞書
declare -A ERROR_DICT

# TypeScriptエラー
ERROR_DICT["Type '.*' is not assignable to type"]="型 '.*' は型に割り当てられません"
ERROR_DICT["Property '.*' does not exist on type"]="プロパティ '.*' は型に存在しません"
ERROR_DICT["Cannot find name"]="名前が見つかりません"
ERROR_DICT["Object is possibly 'undefined'"]="オブジェクトが 'undefined' の可能性があります"
ERROR_DICT["Argument of type .* is not assignable"]="型の引数は割り当てられません"

# ESLintエラー
ERROR_DICT["is defined but never used"]="が定義されていますが使用されていません"
ERROR_DICT["Missing return type"]="戻り値の型が指定されていません"
ERROR_DICT["Unexpected console statement"]="console文は使用できません（Loggerを使用してください）"
ERROR_DICT["is assigned a value but never used"]="に値が割り当てられていますが使用されていません"
ERROR_DICT["Prefer default export"]="デフォルトエクスポートを使用してください"

# Prettierエラー
ERROR_DICT["Code style issues found"]="コードスタイルの問題が見つかりました"
ERROR_DICT["Delete"]="削除してください"
ERROR_DICT["Insert"]="挿入してください"
ERROR_DICT["Replace"]="置換してください"

# Jestエラー
ERROR_DICT["FAIL"]="失敗"
ERROR_DICT["Test suite failed to run"]="テストスイートの実行に失敗しました"
ERROR_DICT["expect\\(received\\).toBe\\(expected\\)"]="期待値と実際の値が一致しません"
ERROR_DICT["Cannot find module"]="モジュールが見つかりません"
ERROR_DICT["ReferenceError"]="参照エラー"

# npm/ビルドエラー
ERROR_DICT["npm ERR!"]="npmエラー"
ERROR_DICT["Module not found"]="モジュールが見つかりません"
ERROR_DICT["Failed to compile"]="コンパイルに失敗しました"
ERROR_DICT["Syntax error"]="構文エラー"

# 対処方法の辞書
declare -A FIX_DICT

FIX_DICT["Type '.*' is not assignable to type"]="型定義を確認し、正しい型に修正してください"
FIX_DICT["Property '.*' does not exist on type"]="プロパティ名が正しいか確認してください。存在しない場合は型定義を更新してください"
FIX_DICT["Object is possibly 'undefined'"]="Optional Chainingを使用するか、undefinedチェックを追加してください: obj?.property"
FIX_DICT["is defined but never used"]="未使用の変数を削除するか、変数名の前に _ を付けてください"
FIX_DICT["Unexpected console statement"]="console.logを削除し、Loggerを使用してください"
FIX_DICT["Code style issues found"]="npm run format を実行して自動修正してください"
FIX_DICT["Module not found"]="npm install を実行して依存関係をインストールしてください"

# 入力の取得
if [ $# -eq 0 ]; then
  # 標準入力から読み込み
  INPUT=$(cat)
else
  # ファイルから読み込み
  LOG_FILE="$1"
  if [ ! -f "$LOG_FILE" ]; then
    echo "エラー: ファイルが見つかりません: $LOG_FILE"
    exit 1
  fi
  INPUT=$(cat "$LOG_FILE")
fi

# エラーメッセージの翻訳
translate_message() {
  local message="$1"
  local translated="$message"

  # 各エラーパターンをチェック
  for pattern in "${!ERROR_DICT[@]}"; do
    if echo "$message" | grep -qE "$pattern"; then
      local translation="${ERROR_DICT[$pattern]}"
      # 翻訳を適用（正規表現マッチングを保持）
      translated=$(echo "$message" | sed -E "s/$pattern/$translation/g")
      echo "🔴 エラー: $translated"

      # 対処方法を表示
      if [ -n "${FIX_DICT[$pattern]:-}" ]; then
        echo "💡 対処方法: ${FIX_DICT[$pattern]}"
      fi

      return 0
    fi
  done

  # マッチしない場合は元のメッセージを表示
  echo "$message"
}

# 各行を処理
echo "$INPUT" | while IFS= read -r line; do
  if [ -n "$line" ]; then
    translate_message "$line"
  fi
done

# GitHub Actionsの場合、翻訳結果をJob Summaryに追加
if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  echo "### 🌐 エラーメッセージ翻訳" >> "$GITHUB_STEP_SUMMARY"
  echo "" >> "$GITHUB_STEP_SUMMARY"
  echo "エラーメッセージが日本語に翻訳されました。" >> "$GITHUB_STEP_SUMMARY"
  echo "" >> "$GITHUB_STEP_SUMMARY"
fi

exit 0
