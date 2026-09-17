import type { PortalUserProfile } from "@/lib/saml-user-attributes";

interface MypageProfileCardProps {
  userProfile: PortalUserProfile;
  isLinked: boolean;
}

export function MypageProfileCard({ userProfile, isLinked }: MypageProfileCardProps) {
  return (
    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-base font-bold text-slate-900">{userProfile.name}</h1>
          <span
            aria-label="所属会社"
            className="shrink-0 px-2 py-0.5 bg-indigo-50 text-indigo-700 font-semibold text-[11px] rounded border border-indigo-100"
          >
            {userProfile.companyName}
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          社員番号: <span className="font-mono font-bold text-slate-700">{userProfile.portalUserId}</span>
          │ 所属: <span className="font-semibold text-slate-700">{userProfile.divisionName}</span>
          │ Mail: <span className="text-slate-600">{userProfile.email}</span>
        </p>
      </div>
      <span
        className={`px-3 py-1 border rounded-lg text-xs font-bold ${
          isLinked
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : "bg-amber-50 text-amber-700 border-amber-200"
        }`}
      >
        {isLinked ? "✅ LINE連携済み" : "⚠️ LINE未連携"}
      </span>
    </div>
  );
}
