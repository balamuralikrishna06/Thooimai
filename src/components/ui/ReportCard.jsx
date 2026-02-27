import { Badge } from "./Badge";

const CATEGORY_ICONS = {
  "Illegal Dumping": { icon: "delete_sweep", bg: "bg-orange-50", color: "text-orange-600" },
  "Overflowing Bin": { icon: "delete_outline", bg: "bg-teal-50", color: "text-teal-600" },
  "Plastic Waste": { icon: "shopping_bag", bg: "bg-teal-50", color: "text-teal-600" },
  "Construction Debris": { icon: "foundation", bg: "bg-orange-50", color: "text-orange-600" },
  "Junkyard/Scrap Pile": { icon: "build", bg: "bg-slate-100", color: "text-slate-600" },
  "Burning Waste": { icon: "local_fire_department", bg: "bg-red-50", color: "text-red-600" },
};

function timeAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return days === 1 ? "Yesterday" : `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return `${mins}m ago`;
}

export function ReportCard({ report }) {
  const cat = CATEGORY_ICONS[report.category] || CATEGORY_ICONS["Overflowing Bin"];

  return (
    <div className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`size-10 ${cat.bg} ${cat.color} rounded-lg flex items-center justify-center`}>
            <span className="material-symbols-outlined">{cat.icon}</span>
          </div>
          <div>
            <h3 className="font-bold text-navy text-lg">{report.category}</h3>
            <p className="text-xs text-[#4c9a8d] font-medium">{report.location}</p>
          </div>
        </div>
        <Badge variant={report.status}>{report.status}</Badge>
      </div>

      <div className="flex gap-2 mb-4">
        <Badge variant={report.severity || "Medium"}>Severity: {report.severity || "Medium"}</Badge>
        <span className="flex items-center gap-1 px-2 py-0.5 bg-slate-50 rounded-md border border-slate-100 text-[10px] font-bold text-[#4c9a8d] uppercase">
          <span className="material-symbols-outlined text-[12px]">recycling</span>
          AI Score: {report.ai_urgency_score || 50}
        </span>
      </div>

      {report.image_url && (
        <div className="h-40 w-full rounded-lg bg-slate-100 mb-4 overflow-hidden">
          <img
            src={report.image_url}
            alt={report.category}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-[#4c9a8d]">
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">schedule</span>
          Reported {timeAgo(report.created_at)}
        </span>
        <span className="font-mono font-bold opacity-60 text-[10px]" title={report.id}>
          {report.id.slice(0, 8)}...
        </span>
      </div>
    </div>
  );
}
