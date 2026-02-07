#!/bin/bash
set -e

echo "🔍 Chrome拡張機能マニフェストの検証を開始..."

MANIFEST_PATH="FRONTEND/dist/manifest.json"

# jqの存在確認
if ! command -v jq &> /dev/null; then
  echo "❌ jqがインストールされていません"
  echo ""
  echo "インストール方法:"
  echo "  macOS: brew install jq"
  echo "  Ubuntu/Debian: sudo apt-get install jq"
  echo "  GitHub Actions: jqは標準でインストールされています"
  echo ""
  exit 1
fi

# 1. ファイル存在確認
if [ ! -f "$MANIFEST_PATH" ]; then
  echo "❌ manifest.jsonが見つかりません: $MANIFEST_PATH"
  exit 1
fi
echo "✅ manifest.jsonの存在を確認"

# 2. JSON構文検証
if ! jq empty "$MANIFEST_PATH" 2>/dev/null; then
  echo "❌ 無効なJSON構文です"
  exit 1
fi
echo "✅ JSON構文が正しいことを確認"

# 3. 必須フィールド検証
echo "📋 必須フィールドを検証中..."

# manifest_version
MANIFEST_VERSION=$(jq -r '.manifest_version' "$MANIFEST_PATH")
if [ "$MANIFEST_VERSION" != "3" ]; then
  echo "❌ manifest_versionは3である必要があります（現在: $MANIFEST_VERSION）"
  exit 1
fi
echo "  ✅ manifest_version: $MANIFEST_VERSION"

# name
NAME=$(jq -r '.name' "$MANIFEST_PATH")
if [ -z "$NAME" ] || [ "$NAME" = "null" ]; then
  echo "❌ nameフィールドが必要です"
  exit 1
fi
echo "  ✅ name: $NAME"

# version
VERSION=$(jq -r '.version' "$MANIFEST_PATH")
if [ -z "$VERSION" ] || [ "$VERSION" = "null" ]; then
  echo "❌ versionフィールドが必要です"
  exit 1
fi
echo "  ✅ version: $VERSION"

# description
DESCRIPTION=$(jq -r '.description' "$MANIFEST_PATH")
if [ -z "$DESCRIPTION" ] || [ "$DESCRIPTION" = "null" ]; then
  echo "❌ descriptionフィールドが必要です"
  exit 1
fi
echo "  ✅ description: ${DESCRIPTION:0:50}..."

# 4. 権限検証
echo "🔐 権限を検証中..."

required_permissions=("identity" "storage" "tabs" "sidePanel")
for perm in "${required_permissions[@]}"; do
  if ! jq -e ".permissions | index(\"$perm\")" "$MANIFEST_PATH" > /dev/null 2>&1; then
    echo "❌ 必須権限が不足しています: $perm"
    exit 1
  fi
  echo "  ✅ $perm"
done

# 5. OAuth2設定検証
echo "🔑 OAuth2設定を検証中..."

# client_id
CLIENT_ID=$(jq -r '.oauth2.client_id' "$MANIFEST_PATH")
if [ -z "$CLIENT_ID" ] || [ "$CLIENT_ID" = "null" ]; then
  echo "❌ OAuth2 client_idが必要です"
  exit 1
fi
echo "  ✅ client_id: ${CLIENT_ID:0:20}..."

# scopes
CALENDAR_SCOPE="https://www.googleapis.com/auth/calendar"
if ! jq -e ".oauth2.scopes | index(\"$CALENDAR_SCOPE\")" "$MANIFEST_PATH" > /dev/null 2>&1; then
  echo "❌ Google Calendar APIスコープが不足しています"
  exit 1
fi
echo "  ✅ Calendar API scope"

# 6. Service Worker検証
echo "⚙️  Service Workerを検証中..."

SERVICE_WORKER=$(jq -r '.background.service_worker' "$MANIFEST_PATH")
if [ "$SERVICE_WORKER" != "background/service-worker.js" ]; then
  echo "❌ Service Workerのパスが正しくありません: $SERVICE_WORKER"
  exit 1
fi

SERVICE_WORKER_FILE="FRONTEND/dist/$SERVICE_WORKER"
if [ ! -f "$SERVICE_WORKER_FILE" ]; then
  echo "❌ Service Workerファイルが見つかりません: $SERVICE_WORKER_FILE"
  exit 1
fi
echo "  ✅ Service Worker: $SERVICE_WORKER"

# Service Workerのtypeがmoduleであることを確認
SERVICE_WORKER_TYPE=$(jq -r '.background.type' "$MANIFEST_PATH")
if [ "$SERVICE_WORKER_TYPE" != "module" ]; then
  echo "❌ Service Workerのtypeは'module'である必要があります（現在: $SERVICE_WORKER_TYPE）"
  exit 1
fi
echo "  ✅ Service Worker type: module"

# 7. サイドパネル検証
echo "📱 サイドパネルを検証中..."

SIDEPANEL_PATH=$(jq -r '.side_panel.default_path' "$MANIFEST_PATH")
if [ "$SIDEPANEL_PATH" != "sidepanel/sidepanel.html" ]; then
  echo "❌ サイドパネルのパスが正しくありません: $SIDEPANEL_PATH"
  exit 1
fi

required_sidepanel_files=(
  "FRONTEND/dist/sidepanel/sidepanel.html"
  "FRONTEND/dist/sidepanel/sidepanel.js"
  "FRONTEND/dist/sidepanel/sidepanel.css"
)

for file in "${required_sidepanel_files[@]}"; do
  if [ ! -f "$file" ]; then
    echo "❌ サイドパネルファイルが見つかりません: $file"
    exit 1
  fi
  echo "  ✅ $(basename "$file")"
done

# 8. host_permissions検証
echo "🌐 ホスト権限を検証中..."

EXPECTED_HOST="https://www.googleapis.com/*"
if ! jq -e ".host_permissions | index(\"$EXPECTED_HOST\")" "$MANIFEST_PATH" > /dev/null 2>&1; then
  echo "❌ Google APIs用のhost_permissionsが不足しています"
  exit 1
fi
echo "  ✅ Google APIs host permission"

# 9. Content Security Policy検証
echo "🛡️  Content Security Policyを検証中..."

CSP=$(jq -r '.content_security_policy.extension_pages' "$MANIFEST_PATH")
if [ -z "$CSP" ] || [ "$CSP" = "null" ]; then
  echo "⚠️  Content Security Policyが設定されていません（警告）"
else
  echo "  ✅ CSP: $CSP"
fi

# 10. アクション設定検証
echo "🔘 アクション設定を検証中..."

ACTION_TITLE=$(jq -r '.action.default_title' "$MANIFEST_PATH")
if [ -z "$ACTION_TITLE" ] || [ "$ACTION_TITLE" = "null" ]; then
  echo "❌ action.default_titleが必要です"
  exit 1
fi
echo "  ✅ action title: $ACTION_TITLE"

# 最終サマリー
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 すべての検証が完了しました！"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📦 拡張機能情報:"
echo "  名前: $NAME"
echo "  バージョン: $VERSION"
echo "  マニフェストバージョン: $MANIFEST_VERSION"
echo ""
echo "✅ 検証項目:"
echo "  ✓ JSON構文"
echo "  ✓ 必須フィールド"
echo "  ✓ 権限設定"
echo "  ✓ OAuth2設定"
echo "  ✓ Service Worker"
echo "  ✓ サイドパネル"
echo "  ✓ ホスト権限"
echo "  ✓ CSP"
echo "  ✓ アクション設定"
echo ""
echo "🚀 ビルド成果物は使用可能です: FRONTEND/dist/"
echo ""
