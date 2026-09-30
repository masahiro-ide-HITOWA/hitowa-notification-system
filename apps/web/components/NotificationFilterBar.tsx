"use client";

import {
  NOTIFICATION_READ_FILTERS,
  NOTIFICATION_SAAS_FILTERS,
  type NotificationFilter,
  type NotificationSaasFilter,
} from "@/lib/notification-query";

function tabClass(active: boolean): string {
  return `px-2.5 py-1 rounded-full text-[11px] font-bold ${
    active ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
  }`;
}

export function NotificationFilterBar({
  readFilter,
  saasFilter,
  onReadChange,
  onSaasChange,
}: {
  readFilter: NotificationFilter;
  saasFilter: NotificationSaasFilter;
  onReadChange: (filter: NotificationFilter) => void;
  onSaasChange: (filter: NotificationSaasFilter) => void;
}) {
  return (
    <div className="px-4 pt-3 space-y-2">
      <div>
        <p className="text-[10px] font-bold text-slate-400 mb-1">既読状態</p>
        <div className="flex flex-wrap gap-1.5">
          {NOTIFICATION_READ_FILTERS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onReadChange(tab.id)}
              className={tabClass(readFilter === tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 mb-1">SaaS サービス</p>
        <div className="flex flex-wrap gap-1.5">
          {NOTIFICATION_SAAS_FILTERS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSaasChange(tab.id)}
              className={tabClass(saasFilter === tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
