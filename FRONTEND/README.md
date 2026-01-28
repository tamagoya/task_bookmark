# FRONTEND

フロントエンドコードを配置するディレクトリです。

## 用途
- Chrome拡張機能のコード
- UI実装
- サイドパネル、ポップアップのUI
- スタイリング

## プロジェクト構造（予定）
```
FRONTEND/
├── manifest.json          # Manifest V3設定
├── background/           # Service Worker
├── sidepanel/           # サイドパネルUI
├── popup/               # ポップアップUI（オプション）
├── content/             # Content Scripts（必要な場合）
├── assets/              # 画像、アイコンなど
└── src/                 # ソースコード
    ├── services/        # サービス層
    ├── components/      # UIコンポーネント
    ├── utils/          # ユーティリティ
    └── types/          # TypeScript型定義
```

---

**最終更新**: 2026-01-21
