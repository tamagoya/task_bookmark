import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// ビルド後に必要なファイルをコピーするプラグイン
const copyManifestPlugin = () => {
  return {
    name: 'copy-manifest',
    closeBundle() {
      const manifestPath = resolve(__dirname, 'manifest.json');
      const distManifestPath = resolve(__dirname, 'dist', 'manifest.json');
      
      if (existsSync(manifestPath)) {
        copyFileSync(manifestPath, distManifestPath);
        console.log('✓ Copied manifest.json');
      }
    },
  };
};

const copySidepanelFilesPlugin = () => {
  return {
    name: 'copy-sidepanel-files',
    closeBundle() {
      const sidepanelDir = resolve(__dirname, 'sidepanel');
      const distSidepanelDir = resolve(__dirname, 'dist', 'sidepanel');
      
      // dist/sidepanelディレクトリが存在しない場合は作成
      if (!existsSync(distSidepanelDir)) {
        mkdirSync(distSidepanelDir, { recursive: true });
      }
      
      // HTMLファイルをコピー（.tsを.jsに変更）
      const htmlPath = resolve(sidepanelDir, 'sidepanel.html');
      const distHtmlPath = resolve(distSidepanelDir, 'sidepanel.html');
      if (existsSync(htmlPath)) {
        let htmlContent = readFileSync(htmlPath, 'utf-8');
        // .tsを.jsに変更
        htmlContent = htmlContent.replace(/sidepanel\.ts/g, 'sidepanel.js');
        writeFileSync(distHtmlPath, htmlContent);
        console.log('✓ Copied sidepanel.html');
      }
      
      // CSSファイルをコピー
      const cssPath = resolve(sidepanelDir, 'sidepanel.css');
      const distCssPath = resolve(distSidepanelDir, 'sidepanel.css');
      if (existsSync(cssPath)) {
        copyFileSync(cssPath, distCssPath);
        console.log('✓ Copied sidepanel.css');
      }
    },
  };
};

export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        'background/service-worker': resolve(__dirname, 'background/service-worker.ts'),
        'sidepanel/sidepanel': resolve(__dirname, 'sidepanel/sidepanel.ts'),
        'content-scripts/calendar-restore-button': resolve(
          __dirname,
          'content-scripts/calendar-restore-button.ts'
        ),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          // ディレクトリ構造を保持
          return `${chunkInfo.name}.js`;
        },
        format: 'es',
        // Service Worker用の設定
        manualChunks: undefined,
      },
    },
    // ソースマップを生成（開発時のみ）
    sourcemap: false,
    // チャンクサイズの警告を無効化
    chunkSizeWarningLimit: 1000,
  },
  plugins: [copyManifestPlugin(), copySidepanelFilesPlugin()],
  resolve: {
    alias: {
      '@domain': resolve(__dirname, 'src/domain'),
      '@application': resolve(__dirname, 'src/application'),
      '@infrastructure': resolve(__dirname, 'src/infrastructure'),
    },
  },
});
