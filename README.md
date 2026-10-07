# 📘 HITOWA 統合通知ポータル システム全般仕様・ナレッジベース

## 1. システム概要
* **システム名**: HITOWA 統合通知ポータル (`hitowa-notification-system`)
* **主要目的**: 外部 SaaS (TOKIUM, カオナビ, クラウドハウス等) からの通知メールを自動受信・パースし、統合ポータル画面および LINE 公式アカウントへ即時配信する。
* **主要ステータス**: 
  * メール受信・パース・通知登録・LINE 配信パイプライン構築完了・本番稼働成功。
  * SAML 2.0 (検証用 IdP) 認証連携およびミドルウェアによる未ログインガードの実装完了。
  * トップ (`/`) へのアクセスはマイ通知 (`/mypage`) へダイレクト転送。マイ通知画面に既読・SaaS の 2 系統フィルターを搭載。
  * 通知対象システムは DynamoDB `HitowaNotificationSystems` で動的管理。デプロイなしで追加・変更できる。

---

## 2. ディレクトリ・ファイル構成 (正本)

hitowa-notification-system/
├── apps/
│   └── web/                                # Next.js App Router (Amplify SSR)
│       ├── app/
│       │   ├── layout.tsx                  # ルートレイアウト
│       │   ├── page.tsx                    # トップ (/) ➔ redirect('/mypage')
│       │   ├── mypage/page.tsx             # マイ通知 (既読フィルター + SaaS フィルター)
│       │   ├── notifications/page.tsx      # 通知一覧画面 (残存ルート。ヘッダーのマイ通知は /mypage)
│       │   ├── settings/
│       │   │   ├── page.tsx                # 独立設定 (プロフィール / LINE 連携等)
│       │   │   └── mail/page.tsx           # メール接続設定
│       │   ├── mail/page.tsx               # Webメール画面
│       │   ├── saas/[source]/[id]/page.tsx # 各SaaS詳細画面
│       │   └── api/
│       │       ├── auth/
│       │       │   ├── code/route.ts       # 連携コード検証 API
│       │       │   ├── logout/route.ts     # テスト用ログアウト API (Cookie削除)
│       │       │   ├── me/route.ts         # ログインユーザー情報 API
│       │       │   └── saml/
│       │       │       ├── login/route.ts  # AuthnRequest 生成 & IdP リダイレクト
│       │       │       ├── callback/route.ts# ACS エンドポイント (アサーション検証 & セッション発行)
│       │       │       └── metadata/route.ts# SP Metadata XML 出力
│       │       ├── cron/
│       │       │   └── fetch-emails/route.ts# メール受信・パース実行 Cron API
│       │       ├── line/                   # LINE メッセージ送信 & issue-code API
│       │       ├── mail/                   # Webメールデータ API
│       │       ├── notifications/          # 通知一括操作・既読更新 API
│       │       └── webhooks/               # メール受信等外部 Webhook 処理 (email/ 等)
│       ├── components/
│       │   └── Header.tsx                  # ヘッダー (ロゴ / マイ通知 / 設定 / Webメール / テスト用ログアウト)
│       ├── lib/
│       │   ├── auth-mode.ts                # モック判定・パス定数
│       │   ├── auth-session.ts             # セッション Cookie 管理
│       │   ├── auth-guard.ts               # 未ログイン判定ロジック
│       │   ├── saml-profile.ts             # SAML アトリビュートマッピング
│       │   ├── saml.ts                     # SAML クライアント (import "server-only")
│       │   ├── secrets.ts                  # Secrets Manager (ap-northeast-1)
│       │   ├── email-fetcher.ts            # IMAP 未読取得。保存成功後に SEEN 化
│       │   ├── email-ingest.ts             # 判定一致メールの保存と LINE 送信
│       │   ├── notification-system-rule.ts # 送信元・件名の一致判定
│       │   └── notification-system-cache.ts# 判定条件のインメモリキャッシュ
│       └── middleware.ts                   # 未ログイン保護ガード (USE_MOCK_AUTH=false 時)
├── packages/                               # ドメインロジック・共通パッケージ
└── tests/                                  # Vitest 単体・統合テスト群

---

## 3. 環境変数一覧 (`apps/web/.env.local` および Amplify 管理画面)

| 環境変数名 | 設定値例 | 説明 |
| :--- | :--- | :--- |
| `USE_MOCK_AUTH` | `"false"` / `"true"` | `"false"` 時に SAML 2.0 認証を有効化 |
| `SESSION_SECRET` | `"任意署名キー"` | セッション Cookie の HMAC 署名用キー（任意。未設定時は `SAML_ISSUER` 等へ自動フォールバック） |
| `AWS_REGION` | `"ap-northeast-1"` | Secrets Manager 等の接続リージョン |
| `SAML_ISSUER` | `https://<domain>/api/auth/saml/metadata` | SP Entity ID |
| `SAML_CALLBACK_URL` | `https://<domain>/api/auth/saml/callback` | SP ACS URL |
| `SAML_ENTRY_POINT` | `https://<idp-domain>/saml/sso` | IdP SSO URL |
| `SAML_IDP_ISSUER` | `https://<idp-domain>` | IdP Entity ID |
| `SAML_CERT` | `"MIIDXTCC..."` | IdP X.509 証明書文字列 |
| `DYNAMODB_NOTIFICATION_SYSTEM_TABLE` | `"HitowaNotificationSystems"` | 通知対象システムの判定条件テーブル。未設定時はこの名前 |
| `NOTIFICATION_SYSTEM_CACHE_TTL_MS` | `300000` | 判定条件のインメモリキャッシュ有効期限。未設定時は 5 分 |

---

## 4. ルーティング & 認証仕様

1. **画面ルーティング**:
   * `/` ➔ `/mypage` へ `redirect('/mypage')`。
   * ヘッダーロゴ・マイ通知リンク ➔ `/mypage`
   * `/notifications` ➔ 残存ルート（ヘッダーからの遷移先は `/mypage` に統一）
   * 設定リンク ➔ `/settings`
   * Webメールリンク ➔ `/mail` (未設定時は `/settings/mail`)
2. **マイ通知 (`/mypage`)**:
   * 「すべて / 未読 / 既読」×「すべて / カオナビ / TOKIUM / クラウドハウス」の 2 系統フィルターを搭載。
   * 「今すぐ同期」で `/api/cron/fetch-emails` を実行し、接続状態・未読数・取り込み件数・対象外件数・エラー詳細をその場に表示する。
   * 通知カードの既読化では一覧を再読込しない。スクロール位置を維持し、ヘッダーの未読バッジを同時に 1 件減らす。`/notifications` の一覧も同じ既読更新を使う。
3. **認証 & ミドルウェア (`middleware.ts`)**:
   * `USE_MOCK_AUTH=false` かつ未ログインの場合、保護対象ルートへのアクセスを自動で `/api/auth/saml/login` へ転送。
   * SAML エンドポイント、Cron API、Webhook、静的ファイルは除外。
4. **テスト用ログアウト (`/api/auth/logout`)**:
   * ヘッダーのボタンからセッション Cookie を削除し、`/api/auth/saml/login` へ再送信して IdP ログイン検証を可能にする。

---

## 5. 通知対象システムの動的管理 (`HitowaNotificationSystems`)

判定条件は DynamoDB テーブル `HitowaNotificationSystems` に置く。行の追加・変更・停止にアプリケーションのデプロイは不要。1 行が 1 種類の通知（例: TOKIUM 経費精算と TOKIUM インボイスは別行）。

| 属性 | 内容 |
| :--- | :--- |
| `systemName` | マイ通知と LINE に出すシステム名 |
| `fromAddresses` | 送信元メールアドレス。完全一致。複数可 |
| `subjectPrefixes` | 件名の先頭文字列。複数可。空なら件名では絞らない |
| `enabled` | `false` の行は使わない |

`/api/cron/fetch-emails` はバッチ開始時にこのテーブルを 1 回読み、メモリにキャッシュする。有効期限は `NOTIFICATION_SYSTEM_CACHE_TTL_MS`（既定 5 分）。同じプロセス内の次の実行は、期限まで DynamoDB を読み直さない。テーブルが空、または読めない場合は判定行が無いものとして、メールは保存も LINE 送信もしない。

## 6. メール取り込み・判定 (`/api/cron/fetch-emails`)

* **Secrets Manager**: `hitowa/notification-portal/saas-mail-credentials` から IMAP 接続資格情報を取得（8分キャッシュ）。
* **IMAP 接続**: SSL/TLS (ポート `993`) 接続。タイムアウトおよび `tlsOptions.rejectUnauthorized: false` 構成。
* **取得範囲**: IMAP の未読（`UNSEEN`）だけを検索・取得する。既読メールは取得しない。
* **送信元**: メールの `From` が登録アドレスと完全一致すれば一致とする。Gmail 転送で `From` が個人アドレスになっている場合は、本文先頭の転送ブロックにある `From:` または `差出人:` を元の送信元として判定する。本文の途中にアドレスが書かれているだけでは一致にしない。直接 `my-notification@hitowa.com` へ届くメールは `From` を使う。
* **件名**: 比較前に先頭の `Re:`、`Fw:`、`Fwd:`、`転送:`、`返信:` を外す。`subjectPrefixes` に文字列がある行は、そのいずれかで件名が始まっている必要がある。
* **件名フィルタの省略**: `subjectPrefixes` が未定義、空配列 `[]`、空文字、または `[""]` のときは件名を見ない。`fromAddresses` が一致すれば対象にする（カオナビのように件名が一定しないシステム向け）。
* **両条件**: 件名条件がある行は、同じ行の送信元アドレスと件名先頭の両方が一致したメールだけを対象にする。
* **ノイズ**: どの有効行にも一致しないメール（Google のセキュリティ通知など）は、マイ通知への保存も LINE 送信もしない。
* **保存と LINE**: 一致したメールだけ DynamoDB のマイ通知へ保存する。LINE はその保存に成功したメールだけ送る。
* **重複防止**: 保存に成功したメール、および Message-ID または UID が同じユーザーの通知として既にあるメールは、IMAP 上で既読（`SEEN`）にする。次回の同期で取り直さず、LINE も再送しない。対象外の未定義メールは既読化しない。
* **宛先**: 共有受信箱 `my-notification@hitowa.com` 宛ては、転送本文や Cc から本来の `@hitowa.com` 宛先を特定してマイ通知へ紐付ける。

---

## ⚠️ 開発ルール（開発AI/Cursor 厳守事項）
* **指示された画面・ファイル以外は絶対に変更しないこと。**
* 存在しない `apps/web/app/mail-settings` や `line-settings`、`lib/auth.ts`、`app/api/auth/login/route.ts` などを新規作成しないこと。正本のファイル構造に従うこと。