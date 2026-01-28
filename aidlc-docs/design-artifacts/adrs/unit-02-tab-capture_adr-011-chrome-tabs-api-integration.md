# ADR-011: Chrome Tabs API連携パターン

## ステータス
承認済み

## コンテキスト
Unit 2（タブ状態キャプチャ）では、Chrome Tabs APIとChrome Windows APIを使用してタブ情報を取得する必要があります。

Unit 1とUnit 3で既に以下のパターンが実装されています：
- Adapter パターン（ChromeIdentityAdapter、GoogleCalendarAdapter）
- Service Layer パターン（AuthenticationService、CalendarEventService）
- Repository パターン（Unit 1、Unit 3）

Unit 2では、これらのパターンと一貫性を保ちながら、Chrome Tabs APIとの連携を実装する必要があります。

## 決定
Chrome Tabs API連携パターンを採用します：

1. **Adapter パターンの採用**: `ChromeTabsAdapter`と`ChromeWindowsAdapter`を実装
   - Chrome Tabs APIとChrome Windows APIの詳細を抽象化
   - ドメイン層とアプリケーション層から外部APIの詳細を隠蔽
   - テスト容易性の向上（モック可能）

2. **Service Layer パターンの採用**: `TabCaptureService`を実装
   - タブ情報取得のアプリケーションロジックを集約
   - ドメイン層とインフラストラクチャ層の調整
   - Unit 1、Unit 3のパターンと一貫性を保つ

3. **Factory パターンの採用**: `TabInfoFactory`を実装
   - Chrome Tabs APIの`Tab`オブジェクトから`TabInfo` Value Objectへの変換
   - バリデーションの集約
   - Unit 1、Unit 3のパターンと一貫性を保つ

4. **Domain Events パターンの採用**: `TabsCaptured` Domain Eventを発行
   - タブ情報取得完了時にイベントを発行
   - Unit 1のEventHandlerを拡張して処理
   - Unit 1、Unit 3のパターンと一貫性を保つ

5. **レイヤードアーキテクチャの維持**: Unit 1、Unit 3と同じ3層構造
   - ドメイン層: TabInfo Value Object、TabsCaptured Domain Event、TabInfoFactory
   - アプリケーション層: TabCaptureService、EventHandler（拡張）
   - インフラストラクチャ層: ChromeTabsAdapter、ChromeWindowsAdapter

## 結果

### ポジティブ
- **一貫性**: Unit 1、Unit 3のパターンと一貫性を保つ
- **テスト容易性**: Adapter パターンにより、ドメイン層とアプリケーション層をテスト可能
- **保守性**: 各層の責任が明確
- **拡張性**: 将来の機能追加に対応できる
- **再利用性**: Unit 1で実装済みのコンポーネント（UIMessenger、Logger）を再利用

### ネガティブ
- **コード量の増加**: インターフェースと実装の分離により、コード量が増加
- **複雑性**: 複数の層を経由する必要がある（ただし、シンプルな機能のため影響は限定的）

### 検討した代替案

#### 代替案1: 直接的なAPI呼び出し
- **説明**: アプリケーション層から直接Chrome Tabs APIを呼び出す
- **却下理由**: テスト困難、ドメイン層がインフラストラクチャに依存、Unit 1、Unit 3のパターンと一貫性がない

#### 代替案2: 単一のServiceクラス
- **説明**: Adapterを省略し、Serviceクラス内で直接API呼び出し
- **却下理由**: テスト困難、責任の分離が不十分、Unit 1、Unit 3のパターンと一貫性がない

#### 代替案3: Repository パターンの採用
- **説明**: タブ情報の取得をRepository パターンで実装
- **却下理由**: タブ情報は永続化しないため、Repository パターンは不要。Unit 1、Unit 3のRepository パターンは永続化のためのもの。

## 日付
2026-01-22

---

**作成者**: アーキテクト  
**レビュー**: 承認済み
