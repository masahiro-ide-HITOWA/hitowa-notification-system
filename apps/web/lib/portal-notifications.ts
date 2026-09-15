export type PortalSaasSource = "kaonavi" | "tokium" | "cloudhouse";

export interface PortalInboxItem {
  id: string;
  source: PortalSaasSource;
  saasName: string;
  title: string;
  summary: string;
  date: string;
  deadline?: string;
  actionUrl: string;
  badgeClass: string;
  procedureTitle: string;
  procedureSteps: string[];
}

export function buildSaasPath(source: PortalSaasSource, id: string): string {
  return `/saas/${source}/${id}`;
}

export const PORTAL_INBOX_ITEMS: PortalInboxItem[] = [
  {
    id: "1",
    source: "kaonavi",
    saasName: "カオナビ (評価・人事)",
    title: "2026年度上期 人事評価シート提出のお願い",
    summary:
      "山田 太郎 様、2026年度上期評価シートの入力期限が迫っています。期日までにカオナビよりご提出をお願いいたします。",
    date: "2026/09/08",
    deadline: "2026/09/15",
    actionUrl: buildSaasPath("kaonavi", "1"),
    badgeClass: "bg-blue-600",
    procedureTitle: "評価シートの確認・提出（デモ）",
    procedureSteps: [
      "対象期間（2026年度上期）と評価者を確認する",
      "自己評価コメントを入力する",
      "内容を確認して提出する",
    ],
  },
  {
    id: "2",
    source: "tokium",
    saasName: "TOKIUM経費精算",
    title: "8月分 交通費・経費申請の差し戻し連絡",
    summary:
      "申請ID: #TK-8820 領収書画像の解像度が不足しているため差し戻されました。再アップロードをお願いします。",
    date: "2026/09/07",
    deadline: "2026/09/10",
    actionUrl: buildSaasPath("tokium", "2"),
    badgeClass: "bg-emerald-600",
    procedureTitle: "差し戻し申請の再提出（デモ）",
    procedureSteps: [
      "申請ID #TK-8820 の差し戻し理由を確認する",
      "領収書画像を再アップロードする",
      "内容を確認して再提出する",
    ],
  },
  {
    id: "3",
    source: "cloudhouse",
    saasName: "クラウドハウス労務",
    title: "定期健康診断 問診票の回答手続き",
    summary:
      "今年度の定期健康診断に向けた事前Web問診票の回答フォームが公開されました。",
    date: "2026/09/05",
    deadline: "2026/09/20",
    actionUrl: buildSaasPath("cloudhouse", "3"),
    badgeClass: "bg-purple-600",
    procedureTitle: "健康診断問診票の回答（デモ）",
    procedureSteps: [
      "受診対象者（山田 太郎）を確認する",
      "事前問診項目に回答する",
      "内容を確認して送信する",
    ],
  },
];

export function getPortalNotification(
  source: string,
  id: string,
): PortalInboxItem | undefined {
  return PORTAL_INBOX_ITEMS.find(
    (item) => item.source === source && item.id === id,
  );
}
