# ADR-030: 無視URL設定のマッチング方式（substring 一本化）

## ステータス
承認済み（2026-05-28）

## コンテキスト
2026/05/28 のユーザーフィードバック（`request/20260528_feedback.md`）により、「個人の設定として無視URLを指定し、各ルールごとに『閉じる無視・保存無視・復元無視』を選べるようにする」要件が確定した。

URLとパターンのマッチング方式として、以下の選択肢を検討した:
- `substring`（URL中の部分一致、`String.prototype.includes`）
- `host`（ホスト一致／サブドメイン一致）
- `prefix`（前方一致）
- `regex`（正規表現）

ユーザーフィードバック原文には「meetのURLの部分一致で、閉じる無視かつ復元無視で登録しておく」と記載があり、ユーザーへの確認結果（2026-05-28 回答）も `substring` のみで十分との判断であった。

## 決定
**マッチング方式は `substring`（URL中の部分一致）一本化とする。**

判定式は次の通り:

```typescript
function urlMatchesRule(url: string, rule: IgnoreRule): boolean {
  return rule.enabled && url.includes(rule.pattern);
}
```

`host` / `prefix` / `regex` は初期リリースで採用しない。

## 代替案
1. **複数マッチ方式の同時提供（host/prefix/substring）**: 当初の提案だがユーザー回答で却下。シンプルさ優先。
2. **正規表現の採用**: 表現力は最高だが、誤設定で意図せず広範囲にマッチするリスク（RISK-016 と同種）が大きい。CSPやサンドボックス内での実行コストもあり、初期スコープから外す。
3. **glob パターン**: `*.example.com` のような中間表現。直感的だが実装・テストコストに対し、`substring` 一本で多くのケースを賄えるため不採用。

## 結果
### 利点
- 実装が極めて単純（`String.prototype.includes()` 一行）
- ユニットテストの境界条件が少なく検証容易
- ユーザーが結果を予測しやすい（「URLにこの文字列が含まれているか」だけ）
- `MatchType` Value Object が不要となり、ドメインモデルが簡潔になる

### 欠点・トレードオフ
- 短いパターン（例: `com`, `http`）を登録すると意図せず広範囲にマッチする
  - **軽減策**: RISK-016 で対応（無効化トグル、ヘルプ表示、将来のプレビュー機能）
- ホスト名のみを厳密に対象にしたいユースケースでは「URLパス中の偶然の一致」が起こり得る
  - **軽減策**: パターンに `://` や `/` を含めることをヘルプで推奨（例: `://meet.google.com/`）
- 正規表現が必要な高度なユーザーは要件外

### 将来の拡張余地
- ドメイン層は `IgnorePattern` Value Object で抽象化されているため、将来 `MatchType` を追加して複数方式を提供する余地は残されている
- その場合は `IgnoreRule` に `matchType` フィールドを追加し、既存ルールは `substring` として永続化フォーマットの `schemaVersion` を 2 にバージョンアップする

## 関連
- US-10「無視URL設定によるタブの除外制御」
- Unit-7（URL Filter）
- Domain Model: `unit-07-url-filter_domain_model.md`
- 関連リスク: RISK-016
- フィードバック: `request/20260528_feedback.md`
- 分析: `aidlc-docs/plans/modification_analysis_20260528_url_filter.md`

---

**作成日**: 2026-05-28
