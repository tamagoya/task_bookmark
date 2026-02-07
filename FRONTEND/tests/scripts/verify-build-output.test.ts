/**
 * verify-build-output.cjs のテスト
 *
 * ビルド成果物検証スクリプトの動作を確認するテストです。
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const SCRIPT_PATH = path.join(__dirname, '../../scripts/verify-build-output.cjs');
const DIST_PATH = path.join(__dirname, '../../dist');

describe('verify-build-output.cjs', () => {
  describe('正常系', () => {
    // ビルドが存在する場合のみテストを実行
    const distExists = fs.existsSync(DIST_PATH);

    if (distExists) {
      it('有効なdist/ディレクトリの検証に成功すること', () => {
        expect(() => {
          execSync(`node ${SCRIPT_PATH}`, {
            cwd: path.join(__dirname, '../..'),
            stdio: 'pipe',
          });
        }).not.toThrow();
      });

      it('dist/ディレクトリが存在すること', () => {
        expect(fs.existsSync(DIST_PATH)).toBe(true);
        expect(fs.statSync(DIST_PATH).isDirectory()).toBe(true);
      });

      it('必須ファイルが存在すること', () => {
        const requiredFiles = [
          'manifest.json',
          'background/service-worker.js',
          'sidepanel/sidepanel.html',
          'sidepanel/sidepanel.css',
          'sidepanel/sidepanel.js',
        ];

        requiredFiles.forEach(file => {
          const filePath = path.join(DIST_PATH, file);
          expect(fs.existsSync(filePath)).toBe(true);

          // ファイルが空でないことを確認
          const stats = fs.statSync(filePath);
          expect(stats.size).toBeGreaterThan(0);
        });
      });

      it('必須ディレクトリが存在すること', () => {
        const requiredDirs = ['background', 'sidepanel'];

        requiredDirs.forEach(dir => {
          const dirPath = path.join(DIST_PATH, dir);
          expect(fs.existsSync(dirPath)).toBe(true);
          expect(fs.statSync(dirPath).isDirectory()).toBe(true);
        });
      });

      it('dist/manifest.jsonが有効なJSONであること', () => {
        const manifestPath = path.join(DIST_PATH, 'manifest.json');
        const content = fs.readFileSync(manifestPath, 'utf8');

        expect(() => {
          JSON.parse(content);
        }).not.toThrow();
      });

      it('service-worker.jsにchrome APIの使用が含まれていること', () => {
        const serviceWorkerPath = path.join(DIST_PATH, 'background/service-worker.js');
        const content = fs.readFileSync(serviceWorkerPath, 'utf8');

        expect(content).toContain('chrome.');
      });

      it('ファイルサイズが妥当な範囲であること', () => {
        const fileSizeLimits = {
          'manifest.json': 10 * 1024, // 10 KB
          'background/service-worker.js': 500 * 1024, // 500 KB
          'sidepanel/sidepanel.html': 50 * 1024, // 50 KB
          'sidepanel/sidepanel.css': 100 * 1024, // 100 KB
          'sidepanel/sidepanel.js': 500 * 1024, // 500 KB
        };

        Object.entries(fileSizeLimits).forEach(([file, maxSize]) => {
          const filePath = path.join(DIST_PATH, file);
          const stats = fs.statSync(filePath);

          // ファイルサイズが上限以下であることを確認
          // 警告レベルなので、超えても許容する場合もあるが、テストでは厳密にチェック
          expect(stats.size).toBeLessThanOrEqual(maxSize);
        });
      });
    } else {
      it.skip('dist/ディレクトリが存在しないためスキップ', () => {
        // ビルドが存在しない場合はテストをスキップ
      });
    }
  });

  describe('異常系', () => {
    let tempDir: string;

    beforeEach(() => {
      // 一時ディレクトリを作成
      tempDir = fs.mkdtempSync(path.join(__dirname, 'temp-build-'));
    });

    afterEach(() => {
      // 一時ディレクトリをクリーンアップ
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('dist/ディレクトリが存在しない場合にエラーになること', () => {
      // dist/ディレクトリを作成せずにスクリプトを実行
      const tempScriptPath = path.join(tempDir, 'verify-build-output.cjs');
      fs.copyFileSync(SCRIPT_PATH, tempScriptPath);

      expect(() => {
        execSync(`node ${tempScriptPath}`, {
          cwd: tempDir,
          stdio: 'pipe',
        });
      }).toThrow();
    });

    it('必須ファイルが欠けている場合にエラーになること', () => {
      // 不完全なdist/ディレクトリを作成
      const tempDistPath = path.join(tempDir, 'dist');
      fs.mkdirSync(tempDistPath);
      fs.mkdirSync(path.join(tempDistPath, 'background'));

      // manifest.jsonのみ作成（他のファイルは欠けている）
      fs.writeFileSync(
        path.join(tempDistPath, 'manifest.json'),
        JSON.stringify({ manifest_version: 3 }),
        'utf8'
      );

      const tempScriptPath = path.join(tempDir, 'verify-build-output.cjs');
      fs.copyFileSync(SCRIPT_PATH, tempScriptPath);

      expect(() => {
        execSync(`node ${tempScriptPath}`, {
          cwd: tempDir,
          stdio: 'pipe',
        });
      }).toThrow();
    });

    it('空のファイルが存在する場合にエラーになること', () => {
      // dist/ディレクトリを作成
      const tempDistPath = path.join(tempDir, 'dist');
      fs.mkdirSync(tempDistPath);
      fs.mkdirSync(path.join(tempDistPath, 'background'));
      fs.mkdirSync(path.join(tempDistPath, 'sidepanel'));

      // 空のファイルを作成
      fs.writeFileSync(path.join(tempDistPath, 'manifest.json'), '', 'utf8');

      const tempScriptPath = path.join(tempDir, 'verify-build-output.cjs');
      fs.copyFileSync(SCRIPT_PATH, tempScriptPath);

      expect(() => {
        execSync(`node ${tempScriptPath}`, {
          cwd: tempDir,
          stdio: 'pipe',
        });
      }).toThrow();
    });
  });

  describe('パフォーマンス', () => {
    const distExists = fs.existsSync(DIST_PATH);

    if (distExists) {
      it('検証が5秒以内に完了すること', () => {
        const startTime = Date.now();

        execSync(`node ${SCRIPT_PATH}`, {
          cwd: path.join(__dirname, '../..'),
          stdio: 'pipe',
        });

        const endTime = Date.now();
        const duration = endTime - startTime;

        expect(duration).toBeLessThan(5000);
      });
    } else {
      it.skip('dist/ディレクトリが存在しないためスキップ', () => {
        // ビルドが存在しない場合はテストをスキップ
      });
    }
  });
});
