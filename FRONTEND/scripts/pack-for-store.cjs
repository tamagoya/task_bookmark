#!/usr/bin/env node

/**
 * Chrome Web Store Developer Dashboard 用パッケージングスクリプト
 *
 * dist/ の内容をZIPにまとめ、manifest.json がルートに来る形式で
 * task-bookmark-extension.zip を FRONTEND/ に出力します。
 * .DS_Store や __MACOSX などはZIPに含めません。
 *
 * 使い方: npm run package （ビルド後にこのスクリプトが実行されます）
 * アップロード: https://chrome.google.com/webstore/devconsole でZIPをアップロード
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const ZIP_PATH = path.join(ROOT, 'task-bookmark-extension.zip');
const ZIP_NAME = 'task-bookmark-extension.zip';

function main() {
  if (!fs.existsSync(DIST)) {
    console.error('エラー: dist/ が見つかりません。先に npm run build を実行してください。');
    process.exit(1);
  }

  const manifestPath = path.join(DIST, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.error('エラー: dist/manifest.json が見つかりません。');
    process.exit(1);
  }

  try {
    execSync(
      `zip -r "../${ZIP_NAME}" . -x "*.DS_Store" -x "__MACOSX/*" -x "*.map"`,
      { cwd: DIST, stdio: 'inherit' }
    );
  } catch (e) {
    console.error('ZIPの作成に失敗しました。zip コマンドが利用可能か確認してください。');
    process.exit(1);
  }

  if (fs.existsSync(ZIP_PATH)) {
    const stat = fs.statSync(ZIP_PATH);
    const sizeMB = (stat.size / 1024 / 1024).toFixed(2);
    console.log('');
    console.log('✓ Chrome Web Store 用パッケージを作成しました');
    console.log(`  ファイル: ${ZIP_PATH}`);
    console.log(`  サイズ: ${sizeMB} MB`);
    console.log('');
    console.log('アップロード手順:');
    console.log('  1. https://chrome.google.com/webstore/devconsole を開く');
    console.log('  2. 「新しいアイテム」または既存アイテムの「パッケージをアップロード」');
    console.log(`  3. 上記ZIPファイルを選択してアップロード`);
  }
}

main();
