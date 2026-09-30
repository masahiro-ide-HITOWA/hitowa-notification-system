これまでの構築・改修内容を網羅し、Cursor との相互理解および開発の引き継ぎ（ドキュメント保管）が完全に行えるよう、**全般的なシステム仕様・環境変数・アーキテクチャ・フォルダ/ファイル構成**を整理しました。

このドキュメントをプロジェクトの `README.md` や `docs/system-spec.md` に保存、または Cursor (Composer) に提示することで、次回以降のセッションでも全く同じ前提知識・共通認識から開発を再開できます。

---

# 📘 HITOWA 統合通知ポータル システム全般仕様・ナレッジベース

## 1. システム概要と開発状況

* **システム名**: HITOWA 統合通知ポータル (`hitowa-notification-system`)
* **主要目的**: 外部 SaaS (TOKIUM, カオナビ, クラウドハウス等) からの通知メールを自動受信・パースし、統合ポータル画面および LINE 公式アカウントへ即時配信する。
* **現在のステータス**:
* メール受信・パース・通知登録・LINE 配信パイプラインは本番稼働成功。
* SAML 2.0 (検証用 IdP) 認証連携および認証ガードの実装完了。
* ルーティングのスリム化（`/` ➔ `/mypage`）と「マイ通知」画面のフィルター機能追加済み。



---

## 2. インフラ・アーキテクチャ構成

* **フロントエンド / Web サーバー**: AWS Amplify Hosting (Next.js SSR / App Router)
* **認証基盤**: SAML 2.0 (検証環境 / 本番環境) または モック認証 (ローカル / テスト用)
* **シークレット管理**: AWS Secrets Manager (`hitowa/notification-portal/saas-mail-credentials`)
* IMAP 接続資格情報をセキュアに管理。取得結果はメモリ上に 8 分間キャッシュ。


* **アクセス権限**: IAM ロール `AmplifySSRComputeRole` に対して Secrets Manager (`GetSecretValue`) 読み取り権限を付与。
* **メール基盤 (IMAP)**: KAGOYA メール / Google Workspace (Gmail API/IMAP)
* Google アカウント利用時は 2 段階認証 ＋ 16 桁の「アプリパスワード」を使用。
* TLS/SSL 接続（ポート `993`）およびタイムアウト調整済み。



---

## 3. フォルダ・ファイル構成

```
hitowa-notification-system/
├── apps/
│   └── web/                                # Next.js フロントエンド & API Routes
│       ├── app/
│       │   ├── layout.tsx                  # ルートレイアウト
│       │   ├── page.tsx                    # ルート (/) ➔ /mypage へ redirect
│       │   ├── mypage/
│       │   │   └── page.tsx                # マイ通知画面 (個人通知一覧 + 2系統フィルター)
│       │   ├── mail-settings/              # Webメール設定画面 (独立)
│       │   ├── line-settings/              # LINE連携設定画面 (独立)
│       │   └── api/
│       │       ├── auth/
│       │       │   ├── logout/             # テスト用ログアウト API (Cookie削除)
│       │       │   └── saml/
│       │       │       ├── login/route.ts  # AuthnRequest 生成 & IdP リダイレクト
│       │       │       ├── callback/route.ts# ACS エンドポイント (アサーション検証 & セッション発行)
│       │       │       └── metadata/route.ts# SP Metadata XML 出力
│       │       └── cron/
│       │           └── fetch-emails/route.ts# メール受信・パース実行 Cron API
│       ├── components/
│       │   ├── Header.tsx                  # ヘッダー (ロゴ / マイ通知リンク / テスト用ログアウト)
│       │   └── ...
│       ├── lib/
│       │   ├── auth.ts                     # セッション / モック / 認証ユーティリティ
│       │   ├── saml.ts                     # SAML クライアント (import 'server-only')
│       │   ├── secrets.ts                  # Secrets Manager (ap-northeast-1 明示)
│       │   └── email-fetcher.ts            # IMAP受信・メールパース・ユーザー紐付けロジック
│       └── middleware.ts                   # 未ログイン保護ガード (USE_MOCK_AUTH=false 時)
├── packages/                               # ドメインロジック・共通パッケージ
└── docs/                                   # システムドキュメント

```

---

## 4. 環境変数一覧 (`apps/web/.env.local` および Amplify 管理画面)

| 環境変数名 | 設定例 / 説明 | 備考 |
| --- | --- | --- |
| `USE_MOCK_AUTH` | `"false"` (検証/本番) / `"true"` (ローカル) | `"false"` 時に SAML 2.0 認証を有効化 |
| `AWS_REGION` | `"ap-northeast-1"` | Secrets Manager 等の接続リージョン |
| `SAML_ISSUER` | `https://<domain>/api/auth/saml/metadata` | SP Entity ID |
| `SAML_CALLBACK_URL` | `https://<domain>/api/auth/saml/callback` | SP ACS URL |
| `SAML_ENTRY_POINT` | `https://<idp-domain>/saml/sso` | IdP の SSO ログイン URL |
| `SAML_IDP_ISSUER` | `https://<idp-domain>` | IdP Entity ID |
| `SAML_CERT` | `"MIIDXTCCAkWgAwIBAg..."` | IdP の X.509 証明書文字列 |

---

## 5. 機能仕様（詳細）

### ① 画面単位の機能

* **ルート (`/`)**: アクセス時、即座に `/mypage` へ `redirect('/mypage')`。
* **マイ通知画面 (`/mypage`)**:
* ログインユーザー個人宛の通知を一覧表示。
* **既読状態フィルター**: 「すべて」 | 「未読」 | 「既読」
* **SaaS サービスフィルター**: 「すべて」 | 「カオナビ」 | 「TOKIUM」 | 「クラウドハウス」
* 2 つの条件を掛け合わせた絞り込み表示が可能。


* **独立設定画面**:
* `Webメール設定`、`LINE連携設定` などはマイ通知画面に同梱せず、独立した専用画面として保持。


* **ヘッダー (`Header.tsx`)**:
* ロゴおよび「マイ通知」リンクはすべて `/mypage` を指定。
* **ログアウト (テスト用)** ボタン: `/api/auth/logout` を呼び出してセッション Cookie を破棄し、SAML ログイン画面 (`/api/auth/saml/login`) へ再送。



### ② バックグラウンド処理 & 未ログインガード

* **認証ガード (`middleware.ts`)**:
* `USE_MOCK_AUTH=false` かつ未ログインの場合、保護対象ページへのアクセスを自動で `/api/auth/saml/login` （HITOWA 認証サーバー/IdP）へ転送。
* SAML エンドポイント（`/api/auth/saml/*`）、Webhook、Cron API は除外。



### ③ メール受信・パース・通知登録仕様 (`/api/cron/fetch-emails`)

* **受信プロトコル**: IMAP (Implicit SSL, ポート `993`)
* `tlsOptions: { rejectUnauthorized: false }` により証明書エラーを回避。
* `authTimeout`, `greetingTimeout`, `connectionTimeout` 設定によるタイムアウト対策。


* **パース・分析ロジック**:
* `SEEN`/`UNSEEN` メールの両方をスキャン。
* 転送メール（件名 `Fwd:` 等）の本文を解析。
* 転送元の本文から**宛先メールアドレス**（例: `masahiro-ide@hitowa.com`）や**社員番号**（例: `00400611`）を抽出し、該当ユーザーを識別して通知をDB登録。
* 通知対象となる SaaS アクション URL（`[http://click.keihi.com/](http://click.keihi.com/)...` 等）を自動取得。
* DB 登録と同時に、連携済みの **LINE 公式アカウントへ即時 Push 通知**を送信。



---

### 💡 Cursor との共有手順

Cursor (Composer) で新しいチャットを開始する際は、以下のテキストをプロンプト冒頭に貼り付けてご活用ください。

```markdown
【プロジェクト最新共通理解】
- アプリ構造: Next.js App Router (Amplify SSR)
- トップ (/) は /mypage へ転送。
- マイ通知 (/mypage) には「すべて/未読/既読」と「すべて/カオナビ/TOKIUM/クラウドハウス」の2系統フィルターが設置されています。設定画面は独立しています。
- 認証: USE_MOCK_AUTH=false で SAML 2.0 (lib/saml.ts)。Header にテスト用ログアウトあり。
- メール受信: GET /api/cron/fetch-emails (Secrets Manager + IMAP パース + DB登録 + LINE Push)。
- ルール: 指示されていない画面・ファイルは変更しないこと。

```