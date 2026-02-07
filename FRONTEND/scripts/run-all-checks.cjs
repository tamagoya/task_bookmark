#!/usr/bin/env node

/**
 * 全検証スクリプト統合実行
 *
 * このスクリプトは以下の検証を統合的に実行します：
 * 1. TypeScript型チェック
 * 2. ESLint
 * 3. マニフェスト検証
 * 4. ビルド成果物検証
 * 5. ユニットテスト（オプション）
 */

const { execSync } = require('child_process');
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

class CheckRunner {
  constructor() {
    this.results = [];
    this.totalChecks = 0;
    this.passedChecks = 0;
    this.failedChecks = 0;
  }

  /**
   * コマンドを実行して結果を記録
   */
  runCheck(name, command, options = {}) {
    const { optional = false, cwd = process.cwd() } = options;

    console.log(`\n${colors.bright}${colors.blue}▶ ${name}${colors.reset}`);
    console.log(`コマンド: ${command}\n`);

    this.totalChecks++;

    try {
      execSync(command, {
        cwd,
        stdio: 'inherit',
        encoding: 'utf8',
      });

      console.log(`\n${colors.green}✓ ${name}: 成功${colors.reset}`);
      this.results.push({ name, status: 'success', optional });
      this.passedChecks++;
      return true;
    } catch (error) {
      if (optional) {
        console.log(`\n${colors.yellow}⚠ ${name}: スキップ（オプション）${colors.reset}`);
        this.results.push({ name, status: 'skipped', optional });
      } else {
        console.log(`\n${colors.red}✗ ${name}: 失敗${colors.reset}`);
        this.results.push({ name, status: 'failed', optional });
        this.failedChecks++;
      }
      return false;
    }
  }

  /**
   * 結果サマリーを出力
   */
  printSummary() {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`${colors.bright}検証結果サマリー${colors.reset}`);
    console.log('='.repeat(60));

    this.results.forEach((result, index) => {
      const icon =
        result.status === 'success'
          ? `${colors.green}✓${colors.reset}`
          : result.status === 'skipped'
            ? `${colors.yellow}⚠${colors.reset}`
            : `${colors.red}✗${colors.reset}`;

      const label = result.optional ? ' (オプション)' : '';
      console.log(`${index + 1}. ${icon} ${result.name}${label}`);
    });

    console.log('='.repeat(60));
    console.log(
      `${colors.bright}合計: ${this.totalChecks} 件 | ` +
        `${colors.green}成功: ${this.passedChecks}${colors.reset} | ` +
        `${colors.red}失敗: ${this.failedChecks}${colors.reset}`
    );
    console.log('='.repeat(60));

    if (this.failedChecks === 0) {
      console.log(`\n${colors.green}${colors.bright}✓ すべての検証に合格しました！${colors.reset}\n`);
    } else {
      console.log(`\n${colors.red}${colors.bright}✗ 一部の検証に失敗しました${colors.reset}\n`);
    }
  }

  /**
   * 全ての検証を実行
   */
  async runAll() {
    console.log(`\n${colors.bright}${colors.blue}${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}全検証スクリプト実行開始${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}${'='.repeat(60)}${colors.reset}\n`);

    const frontendDir = path.join(__dirname, '..');

    // 1. TypeScript型チェック
    this.runCheck('TypeScript型チェック', 'npm run type-check', { cwd: frontendDir });

    // 2. ESLint
    this.runCheck('ESLint', 'npm run lint', { cwd: frontendDir });

    // 3. マニフェスト検証
    this.runCheck(
      'マニフェスト検証',
      'node scripts/verify-manifest.cjs',
      { cwd: frontendDir }
    );

    // 4. ビルド検証（ビルドが存在する場合のみ）
    this.runCheck(
      'ビルド成果物検証',
      'node scripts/verify-build-output.cjs',
      { cwd: frontendDir, optional: true }
    );

    // 5. ユニットテスト（オプション - 時間がかかるため）
    const runTests = process.argv.includes('--with-tests');
    if (runTests) {
      this.runCheck('ユニットテスト', 'npm test', { cwd: frontendDir });
    } else {
      console.log(
        `\n${colors.yellow}ℹ ユニットテストをスキップ（--with-tests オプションで実行可能）${colors.reset}`
      );
    }

    // 結果サマリーを出力
    this.printSummary();

    // 失敗があれば終了コード1で終了
    process.exit(this.failedChecks > 0 ? 1 : 0);
  }
}

// メイン処理
async function main() {
  const runner = new CheckRunner();
  await runner.runAll();
}

// スクリプトが直接実行された場合のみmainを実行
if (require.main === module) {
  main().catch(error => {
    console.error(`${colors.red}エラーが発生しました:${colors.reset}`, error);
    process.exit(1);
  });
}

module.exports = CheckRunner;
