@AGENTS.md

# HITOWA統合通知ポータルシステム 開発ガイド

## 起動対象
- Next.js の正本は `apps/web` のみ。ルートの `app/` は使わない。

## 主要コマンド
- フロント起動: `npm run dev --workspace=apps/web`
- Web 型チェック: `npx tsc --noEmit --project apps/web/tsconfig.json`
- テスト実行: `npx vitest run`
- CDKビルド/検証: `npm run cdk synth --workspace=packages/infrastructure`（infrastructure パッケージ作成後）
