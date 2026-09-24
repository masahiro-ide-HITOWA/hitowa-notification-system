ここまでの実装内容を反映し、システム全体の最新仕様・設計・環境構築手順を網羅した**完全版システム仕様・構築ドキュメント**を作成しました。

以下のドキュメント内容をプロジェクトルート直下の `README.md` または `docs/SYSTEM_SPEC.md` に反映（または更新）してください。

---

# 📄 HITOWA 業務ポータル 通知・LINE連携システム ドキュメント

本システムは、外部システム（カオナビ・TOKIUM・クラウドハウス労務等）からの通知メールを自動受信・解析し、社員ポータル上の「マイ通知画面」への即時表示および「LINE Push通知」への自動転送を実現する通知基盤システムです。

---

## 1. 要件定義書 (Requirements Specification)

### 1.1 背景と目的

各業務システムからの重要通知が個別メールに埋もれてしまい、確認漏れや対応遅延が発生する課題を解決するため、ポータル上のマイ通知画面および LINE Messaging API を活用した一元的な通知通知配信・閲覧環境を提供します。

### 1.2 主な機能要件

| ID | 機能名 | 詳細・仕様 |
| --- | --- | --- |
| **REQ-01** | **マイページ UI & SAML属性保持** | SAML SSO 認証時に取得した `portalUserId`（社員番号）、氏名、所属名、`officeCode`（施設コード）等の属性を DynamoDB (`HitowaUserMappings`) へ動的保存・表示する。 |
| **REQ-02** | **LINE連携・アンリンク機能** | - ワンタイムコード発行（6桁数字）とポーリングによるLINEアカウント連携。<br>

<br>- 連携解除（アンリンク）時はデータを物理削除せず `status = "UNLINKED"` および `unlinkedAt` を記録（論理更新）。 |
| **REQ-03** | **お知らせ一斉配信 API** | - `ALL`（全社）または `OFFICE`（施設コード `officeCode` 指定）による対象ユーザー絞り込み配信。<br>

<br>- LINE Messaging API Multicast を活用し、500件単位で自動チャンク分割送信。 |
| **REQ-04** | **外部通知メール受信用 Webhook** | - 送信元ドメイン（`kaonavi.jp` 等）や件名・本文から送信元システム名、宛先、本文サマリーを自動パース。<br>

<br>- 宛先メールから `portalUserId` を解決し、`HitowaNotifications` テーブルへ永続化保存。 |
| **REQ-05** | **LINE Push 自動転送** | - Webhook メール保存完了後、対象ユーザーが LINE 連携済み（`COMPLETED`）であれば、自動で LINE にも Push 通知を転送。<br>

<br>- LINE 送信側の例外・失敗で Webhook 自体が 500 エラーにならないよう非同期フォールバック処理を実施。 |
| **REQ-06** | **マイ通知画面 (`/notifications`)** | - ポータル設定画面（`/mypage`）から独立させた通知履歴専用画面。<br>

<br>- DynamoDB から `createdAt` 降順でリアルタイム取得。<br>

<br>- カードクリックによる即時「既読（`isRead: true`）」更新 API と連動。 |

### 1.3 非機能要件・コード制約

* **型安全性の徹底**: `any` 型の使用を全面的に禁止。
* **可読性・保守性**: 1ファイル 200 行以内を厳格遵守。コンポーネントおよびロジックを適切に分割。
* **品質保証 (TDD)**: Vitest による単体テスト駆動開発を実施し、主要ロジックのグリーン状態を確保。

---

## 2. 技術スタック (Technical Stack)

* **フロントエンド / バックエンド (API)**: Next.js (App Router, `apps/web/app`), TypeScript, React, Tailwind CSS
* **データベース**: AWS DynamoDB (DynamoDB Local 対応)
* `@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb`


* **外部連携 API**: LINE Messaging API (Multicast / Push), Webhook Ingestion
* **テスト環境**: Vitest (モックテスト、エイリアス設定 `@/` 対応)

---

## 3. データモデル構造 (DynamoDB Data Models)

### 3.1 `HitowaUserMappings` (ユーザー・LINE連携・属性テーブル)

* **PK (Partition Key)**: `oneTimeCode` (String) ※連携前コード / レコードID
* **主要属性**:
* `portalUserId` (String, GSI / Scan検索用キー)
* `lineUserId` (String)
* `status` (String: `"PENDING"` | `"COMPLETED"` | `"UNLINKED"`)
* `attributes` (Map: `email`, `officeCode`, `divisionName`, `displayName` 等)
* `linkedAt` / `unlinkedAt` (String: ISO8601)



### 3.2 `HitowaNotifications` (通知履歴保存テーブル)

* **PK (Partition Key)**: `portalUserId` (String)
* **SK (Sort Key)**: `id` (String: UUID)
* **主要属性**:
* `systemName` (String: `"カオナビ"` | `"TOKIUM"` | `"クラウドハウス労務"` | `"全社ポータル"`)
* `title` (String)
* `body` (String)
* `isRead` (Boolean)
* `createdAt` (String: ISO8601)



---

## 4. API エンドポイント一覧 (API Specifications)

| Method | Endpoint | 概要・用途 |
| --- | --- | --- |
| `POST` | `/api/line/unlink` | LINE連携解除（`status: UNLINKED` 更新） |
| `POST` | `/api/line/send-announcement` | お知らせ一斉配信（`ALL` / `OFFICE` 絞り込み & Multicast 500件送信） |
| `POST` | `/api/webhooks/email` | 外部メール受信・解析 Webhook（DB保存 & 連携済みユーザーへ LINE Push 自動転送） |
| `GET` | `/api/notifications` | マイ通知一覧取得（DynamoDB Query/Scan + フォールバック、`createdAt` 降順） |
| `POST` | `/api/notifications/read` | 通知の既読化更新（`isRead = true`） |

---

## 5. ディレクトリ構造 (Directory Structure)

```text
apps/web/
├── app/
│   ├── api/
│   │   ├── line/
│   │   │   ├── unlink/route.ts
│   │   │   └── send-announcement/route.ts
│   │   ├── notifications/
│   │   │   ├── route.ts
│   │   │   └── read/route.ts
│   │   └── webhooks/
│   │       └── email/route.ts
│   ├── mypage/
│   │   └── page.tsx                # 設定・LINE連携・マイ通知導線
│   └── notifications/
│       └── page.tsx                # マイ通知履歴閲覧画面
├── components/
│   ├── MypageLinkedPanel.tsx       # 連携済み状態パネル
│   ├── MypagePendingCodePanel.tsx  # コード発行状態パネル
│   └── NotificationList.tsx        # 通知カード一覧・既読化UI
└── lib/
    ├── dynamodb.ts                 # DynamoDB Client
    ├── email-parser.ts             # メール解析ロジック
    ├── email-notification.ts       # メール→通知データ変換
    ├── line-announcement.ts        # お知らせ一斉送信ロジック
    ├── line-push.ts                # LINE Push転送ロジック
    ├── line-unlink.ts              # 連携解除処理
    ├── notification-store.ts       # DynamoDB通知取得処理
    └── notification-read.ts        # DynamoDB既読更新処理

```

---

## 6. 環境構築・動作確認手順 (Setup & Verification)

### 6.1 環境変数の設定 (`.env.local`)

`apps/web/.env.local` を作成または更新し、以下の項目を設定します。

```env
# DynamoDB（コード発行 POST /api/line/issue-code が参照するキー）
# Amplify では AWS_REGION 手動設定ができない場合あり。未設定時は lib/dynamodb.ts が ap-northeast-1 を使用。
DYNAMODB_TABLE_NAME=HitowaUserMappings
DYNAMODB_NOTIFICATION_TABLE=HitowaNotifications
DYNAMODB_MAIL_CONFIG_TABLE=HitowaMailConfigs

# LINE Messaging API（Webhook / Push。コード発行自体には不要）
LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token
LINE_BOT_BASIC_ID=@your_line_basic_id

# メール設定パスワード暗号化（KMS ARN ではない）
ENCRYPTION_KEY=replace-with-a-long-random-secret
```

### 6.2 DynamoDB テーブルの作成

#### GUI (AWS Console) で作成する場合

1. **`HitowaUserMappings`**
* **PK**: `oneTimeCode` (文字列)


2. **`HitowaNotifications`**
* **PK**: `portalUserId` (文字列)
* **SK**: `id` (文字列)



#### AWS CLI で作成する場合

```powershell
# HitowaNotifications テーブルの作成
aws dynamodb create-table `
    --table-name HitowaNotifications `
    --attribute-definitions `
        AttributeName=portalUserId,AttributeType=S `
        AttributeName=id,AttributeType=S `
    --key-schema `
        AttributeName=portalUserId,KeyType=HASH `
        AttributeName=id,KeyType=RANGE `
    --billing-mode PAY_PER_REQUEST

```

### 6.3 依存関係のインストールと開発サーバー起動

```powershell
# インストール
npm install

# 単体テスト (Vitest) の実行
npx vitest run

# 開発サーバーの起動
npm run dev

```

### 6.4 主要機能の動作確認コマンド (PowerShell)

#### ① 外部メール受信 ＆ LINE Push 自動転送 Webhook テスト

```powershell
$body = @{
    from    = "noreply@kaonavi.jp"
    to      = "mei-sei@hitowa.com"
    subject = "【カオナビ】目標管理シート提出のお願い"
    body    = "目標管理シートの提出期限は今週末までとなっております。"
} | ConvertTo-Json -Compress

$bytes = [System.Text.Encoding]::UTF8.GetBytes($body)

Invoke-RestMethod -Uri "http://localhost:3000/api/webhooks/email" `
                  -Method Post `
                  -ContentType "application/json; charset=utf-8" `
                  -Body $bytes

```

#### ② お知らせ一斉配信（施設コード指定）テスト

```powershell
$body = @{
    title      = "施設内清掃のお知らせ"
    content    = "本日15時より清掃作業を実施します。"
    targetType = "OFFICE"
    officeCode = "1"
} | ConvertTo-Json -Compress

$bytes = [System.Text.Encoding]::UTF8.GetBytes($body)

Invoke-RestMethod -Uri "http://localhost:3000/api/line/send-announcement" `
                  -Method Post `
                  -ContentType "application/json; charset=utf-8" `
                  -Body $bytes

```

---

ドキュメントの更新内容は以上です。次回の作業開始時やチーム共有の際にぜひご活用ください！