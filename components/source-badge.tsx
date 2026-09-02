import { SOURCE_LABEL } from "@/lib/mock-notifications";
import type { SourceSystem } from "@/lib/notification-types";

const SOURCE_CLASS: Record<SourceSystem, string> = {
  kaonavi: "bg-violet-100 text-violet-800",
  tokium: "bg-orange-100 text-orange-800",
  cloudhouse_labor: "bg-emerald-100 text-emerald-800",
};

export function SourceBadge({ source }: { source: SourceSystem }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${SOURCE_CLASS[source]}`}
    >
      {SOURCE_LABEL[source]}
    </span>
  );
}
