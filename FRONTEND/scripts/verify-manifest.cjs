#!/usr/bin/env node

/**
 * manifest.json 検証スクリプト
 *
 * このスクリプトはChrome拡張機能のmanifest.jsonファイルを検証します。
 * - JSON構文の正当性
 * - 必須フィールドの存在確認
 * - フィールド値の妥当性チェック
 * - OAuth2設定の検証
 */

const fs = require('fs');
const path = require('path');

// カラー出力用のANSIコード
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

class ManifestValidator {
  constructor(manifestPath) {
    this.manifestPath = manifestPath;
    this.errors = [];
    this.warnings = [];
    this.manifest = null;
  }

  /**
   * エラーを追加
   */
  addError(message) {
    this.errors.push(message);
  }

  /**
   * 警告を追加
   */
  addWarning(message) {
    this.warnings.push(message);
  }

  /**
   * manifest.jsonを読み込む
   */
  loadManifest() {
    try {
      const content = fs.readFileSync(this.manifestPath, 'utf8');
      this.manifest = JSON.parse(content);
      console.log(`${colors.green}✓${colors.reset} manifest.jsonを正常に読み込みました`);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.addError(`manifest.jsonが見つかりません: ${this.manifestPath}`);
      } else if (error instanceof SyntaxError) {
        this.addError(`manifest.jsonのJSON構文エラー: ${error.message}`);
      } else {
        this.addError(`manifest.jsonの読み込みエラー: ${error.message}`);
      }
      return false;
    }
  }

  /**
   * manifest_versionの検証
   */
  validateManifestVersion() {
    if (!this.manifest.manifest_version) {
      this.addError('manifest_version フィールドが存在しません');
      return;
    }

    if (this.manifest.manifest_version !== 3) {
      this.addError(`manifest_version は 3 である必要があります（現在: ${this.manifest.manifest_version}）`);
    } else {
      console.log(`${colors.green}✓${colors.reset} manifest_version: 3`);
    }
  }

  /**
   * 基本フィールドの検証
   */
  validateBasicFields() {
    const requiredFields = ['name', 'version'];

    requiredFields.forEach(field => {
      if (!this.manifest[field]) {
        this.addError(`必須フィールド "${field}" が存在しません`);
      } else {
        console.log(`${colors.green}✓${colors.reset} ${field}: ${this.manifest[field]}`);
      }
    });

    // バージョン番号の形式チェック（セマンティックバージョニング）
    if (this.manifest.version) {
      const versionPattern = /^\d+\.\d+\.\d+$/;
      if (!versionPattern.test(this.manifest.version)) {
        this.addWarning(
          `version は セマンティックバージョニング形式（X.Y.Z）が推奨されます（現在: ${this.manifest.version}）`
        );
      }
    }

    // 説明文のチェック
    if (!this.manifest.description) {
      this.addWarning('description フィールドの追加を推奨します');
    }
  }

  /**
   * パーミッションの検証
   */
  validatePermissions() {
    const requiredPermissions = ['identity', 'storage', 'tabs', 'sidePanel'];

    if (!Array.isArray(this.manifest.permissions)) {
      this.addError('permissions フィールドが配列ではありません');
      return;
    }

    const missingPermissions = requiredPermissions.filter(
      perm => !this.manifest.permissions.includes(perm)
    );

    if (missingPermissions.length > 0) {
      this.addError(
        `必須パーミッションが不足しています: ${missingPermissions.join(', ')}`
      );
    } else {
      console.log(`${colors.green}✓${colors.reset} 必須パーミッション: すべて含まれています`);
    }

    // host_permissionsの検証
    if (!Array.isArray(this.manifest.host_permissions)) {
      this.addError('host_permissions フィールドが配列ではありません');
    } else {
      const hasGoogleApisPermission = this.manifest.host_permissions.some(
        perm => perm.includes('googleapis.com')
      );
      if (!hasGoogleApisPermission) {
        this.addError('host_permissions に Google APIs のパーミッションが必要です');
      } else {
        console.log(`${colors.green}✓${colors.reset} host_permissions: Google APIs を含んでいます`);
      }
    }
  }

  /**
   * OAuth2設定の検証
   */
  validateOAuth2() {
    if (!this.manifest.oauth2) {
      this.addError('oauth2 フィールドが存在しません');
      return;
    }

    // client_idの検証
    if (!this.manifest.oauth2.client_id) {
      this.addError('oauth2.client_id が存在しません');
    } else {
      // client_idの形式チェック（Google OAuth2のclient_idは通常 .apps.googleusercontent.com で終わる）
      if (!this.manifest.oauth2.client_id.endsWith('.apps.googleusercontent.com')) {
        this.addWarning('oauth2.client_id の形式が標準的なGoogle OAuth2のものと異なります');
      } else {
        console.log(`${colors.green}✓${colors.reset} oauth2.client_id: 設定されています`);
      }
    }

    // scopesの検証
    if (!Array.isArray(this.manifest.oauth2.scopes)) {
      this.addError('oauth2.scopes が配列ではありません');
    } else {
      const hasCalendarScope = this.manifest.oauth2.scopes.some(
        scope => scope.includes('calendar')
      );
      if (!hasCalendarScope) {
        this.addError('oauth2.scopes に Google Calendar のスコープが必要です');
      } else {
        console.log(`${colors.green}✓${colors.reset} oauth2.scopes: Google Calendar スコープを含んでいます`);
      }
    }
  }

  /**
   * background設定の検証
   */
  validateBackground() {
    if (!this.manifest.background) {
      this.addError('background フィールドが存在しません');
      return;
    }

    if (!this.manifest.background.service_worker) {
      this.addError('background.service_worker が存在しません');
    } else {
      console.log(`${colors.green}✓${colors.reset} background.service_worker: ${this.manifest.background.service_worker}`);
    }

    // typeがmoduleであることを確認
    if (this.manifest.background.type !== 'module') {
      this.addWarning('background.type は "module" が推奨されます');
    }
  }

  /**
   * side_panel設定の検証
   */
  validateSidePanel() {
    if (!this.manifest.side_panel) {
      this.addError('side_panel フィールドが存在しません');
      return;
    }

    if (!this.manifest.side_panel.default_path) {
      this.addError('side_panel.default_path が存在しません');
    } else {
      console.log(`${colors.green}✓${colors.reset} side_panel.default_path: ${this.manifest.side_panel.default_path}`);
    }
  }

  /**
   * action設定の検証
   */
  validateAction() {
    if (!this.manifest.action) {
      this.addWarning('action フィールドの追加を推奨します（拡張機能アイコンの設定）');
      return;
    }

    if (!this.manifest.action.default_title) {
      this.addWarning('action.default_title の追加を推奨します');
    }
  }

  /**
   * すべての検証を実行
   */
  validate() {
    console.log(`\n${colors.bright}=== manifest.json 検証開始 ===${colors.reset}\n`);
    console.log(`対象ファイル: ${this.manifestPath}\n`);

    // manifest.jsonを読み込む
    if (!this.loadManifest()) {
      this.printResults();
      return this.errors.length === 0;
    }

    // 各種検証を実行
    this.validateManifestVersion();
    this.validateBasicFields();
    this.validatePermissions();
    this.validateOAuth2();
    this.validateBackground();
    this.validateSidePanel();
    this.validateAction();

    // 結果を出力
    this.printResults();

    return this.errors.length === 0;
  }

  /**
   * 検証結果を出力
   */
  printResults() {
    console.log(`\n${colors.bright}=== 検証結果サマリー ===${colors.reset}\n`);

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log(`${colors.green}${colors.bright}✓ すべての検証に合格しました${colors.reset}\n`);
      return;
    }

    if (this.errors.length > 0) {
      console.log(`${colors.red}${colors.bright}✗ エラー: ${this.errors.length}件${colors.reset}`);
      this.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
      console.log('');
    }

    if (this.warnings.length > 0) {
      console.log(`${colors.yellow}${colors.bright}⚠ 警告: ${this.warnings.length}件${colors.reset}`);
      this.warnings.forEach((warning, index) => {
        console.log(`  ${index + 1}. ${warning}`);
      });
      console.log('');
    }

    if (this.errors.length > 0) {
      console.log(`${colors.red}検証に失敗しました${colors.reset}\n`);
    } else {
      console.log(`${colors.yellow}警告がありますが、検証は成功しました${colors.reset}\n`);
    }
  }
}

// メイン処理
function main() {
  const manifestPath = path.join(__dirname, '..', 'manifest.json');
  const validator = new ManifestValidator(manifestPath);
  const success = validator.validate();

  process.exit(success ? 0 : 1);
}

// スクリプトが直接実行された場合のみmainを実行
if (require.main === module) {
  main();
}

module.exports = ManifestValidator;
