# 📘 HITOWA 統合通知ポータル システム全般仕様・ナレッジベース

## 1. システム概要
* **システム名**: HITOWA 統合通知ポータル (`hitowa-notification-system`)
* **主要目的**: 外部 SaaS (TOKIUM, カオナビ, クラウドハウス等) からの通知メールを自動受信・パースし、統合ポータル画面および LINE 公式アカウントへ即時配信する。
* **主要ステータス**: 
  * メール受信・パース・通知登録・LINE 配信パイプライン構築完了・本番稼働成功。
  * SAML 2.0 (検証用 IdP) 認証連携およびミドルウェアによる未ログインガードの実装完了。
  * トップ (`/`) へのアクセスはマイ通知 (`/mypage`) へダイレクト転送。マイ通知画面に既読・SaaS の 2 系統フィルターを搭載。

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
│       │   └── email-fetcher.ts            # IMAP受信・メールパース・ユーザー紐付けロジック
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
3. **認証 & ミドルウェア (`middleware.ts`)**:
   * `USE_MOCK_AUTH=false` かつ未ログインの場合、保護対象ルートへのアクセスを自動で `/api/auth/saml/login` へ転送。
   * SAML エンドポイント、Cron API、Webhook、静的ファイルは除外。
4. **テスト用ログアウト (`/api/auth/logout`)**:
   * ヘッダーのボタンからセッション Cookie を削除し、`/api/auth/saml/login` へ再送信して IdP ログイン検証を可能にする。

---

## 5. メール受信・パース処理 (`/api/cron/fetch-emails`)

* **Secrets Manager**: `hitowa/notification-portal/saas-mail-credentials` から IMAP 接続資格情報を取得（8分キャッシュ）。
* **IMAP 接続**: SSL/TLS (ポート `993`) 接続。タイムアウトおよび `tlsOptions.rejectUnauthorized: false` 構成。
* **パースロジック**: `Fwd:` 等の転送メール本文から宛先（例: `masahiro-ide@hitowa.com`）や社員番号（`00400611`）を自動抽出し、対象ユーザーへ通知を紐付けて DB 登録 ＋ LINE 即時 Push 送信。

---

## ⚠️ 開発ルール（開発AI/Cursor 厳守事項）
* **指示された画面・ファイル以外は絶対に変更しないこと。**
* 存在しない `apps/web/app/mail-settings` や `line-settings`、`lib/auth.ts`、`app/api/auth/login/route.ts` などを新規作成しないこと。正本のファイル構造に従うこと。