#!/usr/bin/env node

/**
 * ビルド成果物検証スクリプト
 *
 * このスクリプトはビルド成果物（dist/ディレクトリ）を検証します。
 * - 必須ファイルの存在確認
 * - ファイルサイズの妥当性チェック
 * - ディレクトリ構造の確認
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

class BuildOutputValidator {
  constructor(distPath) {
    this.distPath = distPath;
    this.errors = [];
    this.warnings = [];
    this.fileStats = [];
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
   * ファイルサイズを人間が読める形式に変換
   */
  formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  /**
   * ファイルの存在とサイズをチェック
   */
  checkFile(relativePath, maxSizeKB = null) {
    const fullPath = path.join(this.distPath, relativePath);

    try {
      const stats = fs.statSync(fullPath);

      if (!stats.isFile()) {
        this.addError(`${relativePath} はファイルではありません`);
        return false;
      }

      const sizeKB = stats.size / 1024;
      const formattedSize = this.formatFileSize(stats.size);

      this.fileStats.push({
        path: relativePath,
        size: stats.size,
        formattedSize,
      });

      // ファイルサイズのチェック
      if (stats.size === 0) {
        this.addError(`${relativePath} が空ファイルです`);
        return false;
      }

      if (maxSizeKB && sizeKB > maxSizeKB) {
        this.addWarning(
          `${relativePath} のサイズが大きすぎます: ${formattedSize} (上限: ${maxSizeKB} KB)`
        );
      }

      console.log(`${colors.green}✓${colors.reset} ${relativePath} (${formattedSize})`);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.addError(`${relativePath} が存在しません`);
      } else {
        this.addError(`${relativePath} の確認中にエラー: ${error.message}`);
      }
      return false;
    }
  }

  /**
   * ディレクトリの存在をチェック
   */
  checkDirectory(relativePath) {
    const fullPath = path.join(this.distPath, relativePath);

    try {
      const stats = fs.statSync(fullPath);

      if (!stats.isDirectory()) {
        this.addError(`${relativePath} はディレクトリではありません`);
        return false;
      }

      console.log(`${colors.green}✓${colors.reset} ${relativePath}/ (ディレクトリ)`);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.addError(`${relativePath}/ ディレクトリが存在しません`);
      } else {
        this.addError(`${relativePath}/ の確認中にエラー: ${error.message}`);
      }
      return false;
    }
  }

  /**
   * dist/ディレクトリの存在確認
   */
  validateDistDirectory() {
    try {
      const stats = fs.statSync(this.distPath);

      if (!stats.isDirectory()) {
        this.addError(`${this.distPath} はディレクトリではありません`);
        return false;
      }

      console.log(`${colors.green}✓${colors.reset} dist/ ディレクトリが存在します\n`);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.addError(
          `dist/ ディレクトリが存在しません。先に "npm run build" を実行してください`
        );
      } else {
        this.addError(`dist/ ディレクトリの確認中にエラー: ${error.message}`);
      }
      return false;
    }
  }

  /**
   * 必須ファイルの確認
   */
  validateRequiredFiles() {
    console.log(`${colors.bright}必須ファイルの確認:${colors.reset}`);

    const requiredFiles = [
      { path: 'manifest.json', maxSizeKB: 10 }, // manifest.jsonは通常小さい
      { path: 'background/service-worker.js', maxSizeKB: 500 }, // service workerのサイズ上限
      { path: 'sidepanel/sidepanel.html', maxSizeKB: 50 },
      { path: 'sidepanel/sidepanel.css', maxSizeKB: 100 },
      { path: 'sidepanel/sidepanel.js', maxSizeKB: 500 },
    ];

    let allFilesExist = true;

    requiredFiles.forEach(({ path, maxSizeKB }) => {
      if (!this.checkFile(path, maxSizeKB)) {
        allFilesExist = false;
      }
    });

    console.log('');
    return allFilesExist;
  }

  /**
   * ディレクトリ構造の確認
   */
  validateDirectoryStructure() {
    console.log(`${colors.bright}ディレクトリ構造の確認:${colors.reset}`);

    const requiredDirectories = ['background', 'sidepanel'];

    let allDirectoriesExist = true;

    requiredDirectories.forEach(dir => {
      if (!this.checkDirectory(dir)) {
        allDirectoriesExist = false;
      }
    });

    console.log('');
    return allDirectoriesExist;
  }

  /**
   * manifest.jsonの内容確認
   */
  validateManifestContent() {
    console.log(`${colors.bright}manifest.json の内容確認:${colors.reset}`);

    const manifestPath = path.join(this.distPath, 'manifest.json');

    try {
      const content = fs.readFileSync(manifestPath, 'utf8');
      const manifest = JSON.parse(content);

      // 基本的なフィールドの確認
      if (!manifest.manifest_version) {
        this.addError('dist/manifest.json に manifest_version がありません');
      } else {
        console.log(`${colors.green}✓${colors.reset} manifest_version: ${manifest.manifest_version}`);
      }

      if (!manifest.name) {
        this.addError('dist/manifest.json に name がありません');
      } else {
        console.log(`${colors.green}✓${colors.reset} name: ${manifest.name}`);
      }

      if (!manifest.version) {
        this.addError('dist/manifest.json に version がありません');
      } else {
        console.log(`${colors.green}✓${colors.reset} version: ${manifest.version}`);
      }

      console.log('');
      return true;
    } catch (error) {
      if (error instanceof SyntaxError) {
        this.addError(`dist/manifest.json の JSON構文エラー: ${error.message}`);
      } else {
        this.addError(`dist/manifest.json の読み込みエラー: ${error.message}`);
      }
      console.log('');
      return false;
    }
  }

  /**
   * service-worker.jsの基本チェック
   */
  validateServiceWorker() {
    console.log(`${colors.bright}service-worker.js の基本チェック:${colors.reset}`);

    const serviceWorkerPath = path.join(this.distPath, 'background/service-worker.js');

    try {
      const content = fs.readFileSync(serviceWorkerPath, 'utf8');

      // 基本的なチェック
      if (content.length === 0) {
        this.addError('service-worker.js が空です');
        return false;
      }

      // Chrome拡張機能の基本的なAPIが含まれているか確認
      const hasChrome = content.includes('chrome.');
      if (!hasChrome) {
        this.addWarning('service-worker.js に chrome API の使用が見つかりません');
      } else {
        console.log(`${colors.green}✓${colors.reset} chrome API の使用を確認`);
      }

      console.log('');
      return true;
    } catch (error) {
      this.addError(`service-worker.js の読み込みエラー: ${error.message}`);
      console.log('');
      return false;
    }
  }

  /**
   * 合計ファイルサイズの計算
   */
  calculateTotalSize() {
    console.log(`${colors.bright}ビルド成果物のサイズサマリー:${colors.reset}`);

    const totalSize = this.fileStats.reduce((sum, file) => sum + file.size, 0);
    const formattedTotal = this.formatFileSize(totalSize);

    console.log(`合計サイズ: ${formattedTotal}`);
    console.log(`ファイル数: ${this.fileStats.length}\n`);

    // 合計サイズが大きすぎる場合は警告
    const totalSizeMB = totalSize / (1024 * 1024);
    if (totalSizeMB > 5) {
      this.addWarning(
        `ビルド成果物の合計サイズが大きいです: ${formattedTotal} (推奨: 5 MB 以下)`
      );
    }
  }

  /**
   * すべての検証を実行
   */
  validate() {
    console.log(`\n${colors.bright}=== ビルド成果物検証開始 ===${colors.reset}\n`);
    console.log(`対象ディレクトリ: ${this.distPath}\n`);

    // dist/ディレクトリの存在確認
    if (!this.validateDistDirectory()) {
      this.printResults();
      return false;
    }

    // ディレクトリ構造の確認
    this.validateDirectoryStructure();

    // 必須ファイルの確認
    this.validateRequiredFiles();

    // manifest.jsonの内容確認
    this.validateManifestContent();

    // service-worker.jsの基本チェック
    this.validateServiceWorker();

    // 合計ファイルサイズの計算
    this.calculateTotalSize();

    // 結果を出力
    this.printResults();

    return this.errors.length === 0;
  }

  /**
   * 検証結果を出力
   */
  printResults() {
    console.log(`${colors.bright}=== 検証結果サマリー ===${colors.reset}\n`);

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
  const distPath = path.join(__dirname, '..', 'dist');
  const validator = new BuildOutputValidator(distPath);
  const success = validator.validate();

  process.exit(success ? 0 : 1);
}

// スクリプトが直接実行された場合のみmainを実行
if (require.main === module) {
  main();
}

module.exports = BuildOutputValidator;
