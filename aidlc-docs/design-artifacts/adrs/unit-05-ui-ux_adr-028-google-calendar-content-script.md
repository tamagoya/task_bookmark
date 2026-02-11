# ADR-028: Google Calendar への復元ボタン注入（Content Script）

## ステータス
採用

## コンテキスト
ユーザーがタスクブックマークの復元を、サイドパネルに加えて Google Calendar の予定詳細画面からも行えるようにする必要がある。カレンダー上で予定を開いた際に「復元」ボタンを表示し、クリックでその予定の状態にブラウザを復元する。

## 決定
- **Google Calendar（calendar.google.com）への UI 注入は、Manifest V3 の Content Script で行う。**
- Content Script は `matches: ["https://calendar.google.com/*"]` で注入し、予定詳細の表示を検知して「復元」ボタンを DOM に挿入する。
- 復元の実行は既存の `RESTORE_WORK_STATE` メッセージを利用し、Service Worker 側の復元フローは変更しない。
- **イベント説明欄の JSON に eventId を格納する**。保存後に Calendar API でイベントを PATCH し、説明欄に `eventId` を追加する。Content Script は表示中の説明欄テキストをパースして eventId を取得する。これにより、Google の URL 仕様（eid 等）に依存せず、確実に復元対象を特定できる。

## 代替案
- **URL の eid パラメータから eventId を取得する**: Google Calendar の URL は base64 エンコードされた eid を含むが、仕様が非公式で変更の影響を受けやすい。採用しなかった。
- **サイドパネルのみで復元する**: ユーザー体験として、カレンダー上からの復元を諦める。要件で「Google Calendar GUI 上でも使えるようにしたい」とされているため不採用。

## 結果
- manifest に `content_scripts` と `host_permissions`（`https://calendar.google.com/*`）を追加する。
- 保存処理の後に説明欄を PATCH して eventId を格納する処理を追加する。
- Content Script は説明欄の JSON から eventId を取得し、ボタンクリックで `RESTORE_WORK_STATE` を送信する。
- **「前のタスクへ」**: 説明欄 JSON に `restoredFrom` が含まれる場合、「前のタスクへ」ボタンを表示する。クリック時に `GET_EVENT_CALENDAR_URL`（payload: `{ eventId: restoredFrom }`）を送信し、Service Worker がカレンダーIDとイベントIDから Google Calendar のイベント詳細 URL を構築して返す。Content Script は返却 URL に遷移する。URL 形式は `https://calendar.google.com/calendar/u/0/r/eventedit/<eid>`（eid は calendarId と eventId から生成）。非公式仕様に依存するため、URL 構築ロジックは一箇所に集約する。
- Google の DOM 変更時はセレクタの見直しが必要になるリスク（RISK-015）を軽減するため、セレクタを定数化し、複数候補のフォールバックを検討する。

## 関連
- Unit 4（状態復元）、Unit 5（UI/UX）
- RISK-015: Google Calendar の DOM 変更による復元ボタン表示不具合
- modification_plan.md（Google Calendar GUI 復元ボタン）
