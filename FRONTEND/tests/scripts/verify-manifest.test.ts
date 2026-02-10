/**
 * verify-manifest.cjs のテスト
 *
 * マニフェスト検証スクリプトの動作を確認するテストです。
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const SCRIPT_PATH = path.join(__dirname, '../../scripts/verify-manifest.cjs');
const MANIFEST_PATH = path.join(__dirname, '../../manifest.json');

describe('verify-manifest.cjs', () => {
  describe('正常系', () => {
    it('有効なmanifest.jsonの検証に成功すること', () => {
      // 実際のmanifest.jsonが存在し、有効であることを確認
      expect(fs.existsSync(MANIFEST_PATH)).toBe(true);

      // スクリプトを実行して終了コード0を確認
      expect(() => {
        execSync(`node ${SCRIPT_PATH}`, {
          cwd: path.join(__dirname, '../..'),
          stdio: 'pipe',
        });
      }).not.toThrow();
    });

    it('manifest.jsonに必須フィールドが含まれていること', () => {
      const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

      // 必須フィールドの確認
      expect(manifest.manifest_version).toBe(3);
      expect(manifest.name).toBeDefined();
      expect(manifest.version).toBeDefined();
      expect(manifest.permissions).toBeDefined();
      expect(manifest.host_permissions).toBeDefined();
      expect(manifest.oauth2).toBeDefined();
      expect(manifest.background).toBeDefined();
      expect(manifest.side_panel).toBeDefined();
    });

    it('OAuth2設定が正しく構成されていること', () => {
      const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

      expect(manifest.oauth2.client_id).toBeDefined();
      expect(manifest.oauth2.client_id).toContain('.apps.googleusercontent.com');
      expect(manifest.oauth2.scopes).toContain(
        'https://www.googleapis.com/auth/calendar'
      );
    });

    it('必須パーミッションが含まれていること', () => {
      const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

      const requiredPermissions = ['identity', 'storage', 'tabs', 'sidePanel'];
      requiredPermissions.forEach(perm => {
        expect(manifest.permissions).toContain(perm);
      });
    });
  });

  describe('異常系', () => {
    let tempDir: string;
    let tempManifestPath: string;

    beforeEach(() => {
      // 一時ディレクトリを作成
      tempDir = fs.mkdtempSync(path.join(__dirname, 'temp-'));
      tempManifestPath = path.join(tempDir, 'manifest.json');
    });

    afterEach(() => {
      // 一時ディレクトリをクリーンアップ
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('manifest.jsonが存在しない場合にエラーになること', () => {
      // スクリプトを一時ディレクトリにコピーして実行
      const tempScriptPath = path.join(tempDir, 'verify-manifest.cjs');
      fs.copyFileSync(SCRIPT_PATH, tempScriptPath);

      // manifest.jsonを作成せずにスクリプトを実行
      expect(() => {
        execSync(`node verify-manifest.cjs`, {
          cwd: tempDir,
          stdio: 'pipe',
        });
      }).toThrow();
    });

    it('無効なJSON構文の場合にエラーになること', () => {
      // 無効なJSONを作成
      fs.writeFileSync(tempManifestPath, '{invalid json}', 'utf8');

      // スクリプトのパスを一時ディレクトリにコピー
      const tempScriptPath = path.join(tempDir, 'verify-manifest.cjs');
      fs.copyFileSync(SCRIPT_PATH, tempScriptPath);

      expect(() => {
        execSync(`node ${tempScriptPath}`, {
          cwd: tempDir,
          stdio: 'pipe',
        });
      }).toThrow();
    });

    it('必須フィールドが欠けている場合にエラーになること', () => {
      // 必須フィールドが欠けたmanifest.jsonを作成
      const invalidManifest = {
        manifest_version: 3,
        // name と version が欠けている
      };
      fs.writeFileSync(tempManifestPath, JSON.stringify(invalidManifest), 'utf8');

      const tempScriptPath = path.join(tempDir, 'verify-manifest.cjs');
      fs.copyFileSync(SCRIPT_PATH, tempScriptPath);

      expect(() => {
        execSync(`node ${tempScriptPath}`, {
          cwd: tempDir,
          stdio: 'pipe',
        });
      }).toThrow();
    });
  });

  describe('バージョン番号の検証', () => {
    it('セマンティックバージョニング形式であること', () => {
      const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
      const versionPattern = /^\d+\.\d+\.\d+$/;

      expect(versionPattern.test(manifest.version)).toBe(true);
    });
  });
});
