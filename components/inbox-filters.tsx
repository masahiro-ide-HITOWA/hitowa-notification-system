import { CATEGORY_LABEL } from "@/lib/mock-notifications";
import type {
  NotificationCategory,
  ReadFilter,
} from "@/lib/notification-types";

const CATEGORIES: Array<NotificationCategory | "all"> = [
  "all",
  "attendance",
  "expense",
  "hr",
  "evaluation",
];

function chipClass(active: boolean): string {
  return active
    ? "bg-[#0B3A6E] text-white"
    : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50";
}

export function InboxFilters({
  readFilter,
  category,
  onReadFilterChange,
  onCategoryChange,
}: {
  readFilter: ReadFilter;
  category: NotificationCategory | "all";
  onReadFilterChange: (value: ReadFilter) => void;
  onCategoryChange: (value: NotificationCategory | "all") => void;
}) {
  return (
    <div className="space-y-3">
      <div
        className="inline-flex rounded-lg bg-slate-100 p-1"
        role="tablist"
        aria-label="既読状態"
      >
        <button
          type="button"
          role="tab"
          aria-selected={readFilter === "unread"}
          className={`rounded-md px-4 py-1.5 text-sm font-medium ${chipClass(readFilter === "unread")}`}
          onClick={() => onReadFilterChange("unread")}
        >
          未読
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={readFilter === "all"}
          className={`rounded-md px-4 py-1.5 text-sm font-medium ${chipClass(readFilter === "all")}`}
          onClick={() => onReadFilterChange("all")}
        >
          すべて
        </button>
      </div>
      <div className="flex flex-wrap gap-2" aria-label="カテゴリ">
        {CATEGORIES.map((item) => (
          <button
            key={item}
            type="button"
            className={`rounded-full px-3 py-1 text-xs font-medium ${chipClass(category === item)}`}
            onClick={() => onCategoryChange(item)}
          >
            {item === "all" ? "すべて" : CATEGORY_LABEL[item]}
          </button>
        ))}
      </div>
    </div>
  );
}
