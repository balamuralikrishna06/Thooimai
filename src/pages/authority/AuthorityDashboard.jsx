import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useReports } from "../../state/ReportsContext";
import { Badge } from "../../components/ui/Badge";

const CATEGORIES = [
  "All",
  "Illegal Dumping",
  "Overflowing Bin",
  "Plastic Waste",
  "Construction Debris",
  "Junkyard/Scrap Pile",
  "Burning Waste",
];

const STATUSES = ["All", "Reported", "Assigned", "In Progress", "Resolved"];

function timeAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return `${mins}m ago`;
}

function exportCsv(data) {
  const headers = ["ID", "Category", "Location", "Severity", "AI Score", "Status", "Reported"];
  const rows = data.map((r) => [
    r.id, r.category, r.locationText, r.severity, r.aiUrgencyScore, r.status, new Date(r.createdAt).toLocaleString()
  ]);
  const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "waste_reports.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function StatusAction({ report, onUpdate }) {
  const [open, setOpen] = useState(false);
  const next = ["Assign", "Mark In Progress", "Mark Resolved"];
  const statusMap = { "Assign": "Assigned", "Mark In Progress": "In Progress", "Mark Resolved": "Resolved" };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="text-slate-400 hover:text-[#13ecc8] transition-colors p-1"
      >
        <span className="material-symbols-outlined">more_horiz</span>
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-50 bg-white border border-slate-200 rounded-lg shadow-xl w-44 py-1 text-sm">
          {next.map((action) => (
            <button
              key={action}
              onClick={() => { onUpdate(report.id, statusMap[action]); setOpen(false); }}
              className="w-full text-left px-4 py-2 hover:bg-[#13ecc8]/10 hover:text-[#0d1b19] font-medium text-slate-700"
            >
              {action}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AuthorityDashboard() {
  const { reports, updateStatus } = useReports();
  const [searchLocation, setSearchLocation] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterCategory, setFilterCategory] = useState("All");
  const [page, setPage] = useState(1);
  const PER_PAGE = 5;

  const filtered = useMemo(() => {
    return reports.filter((r) => {
      const matchStatus = filterStatus === "All" || r.status === filterStatus;
      const matchCat = filterCategory === "All" || r.category === filterCategory;
      const matchLoc = r.locationText.toLowerCase().includes(searchLocation.toLowerCase());
      return matchStatus && matchCat && matchLoc;
    });
  }, [reports, filterStatus, filterCategory, searchLocation]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const pending = reports.filter((r) => r.status === "Reported").length;
  const overflowing = reports.filter((r) => r.category === "Overflowing Bin").length;
  const plasticTons = (reports.filter((r) => r.category === "Plastic Waste").length * 0.4).toFixed(1);

  return (
    <div className="bg-[#f6f8f8] font-[Public_Sans,sans-serif] text-[#0d1b19] min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-200 bg-white flex flex-col shrink-0 hidden md:flex">
        <div className="p-6 flex items-center gap-3">
          <div className="bg-[#13ecc8] size-8 rounded-lg flex items-center justify-center text-[#0d1b19]">
            <span className="material-symbols-outlined font-bold text-[20px]">delete_sweep</span>
          </div>
          <div>
            <h1 className="text-[#0d1b19] font-bold text-sm leading-tight uppercase tracking-wider">Authority</h1>
            <p className="text-slate-500 text-xs font-medium">Waste Command</p>
          </div>
        </div>
        <nav className="flex-1 px-4 space-y-1 mt-4">
          {[
            { icon: "dashboard", label: "Dashboard", active: true },
            { icon: "delete", label: "Waste Reports" },
            { icon: "recycling", label: "Plastic Tracking" },
            { icon: "group", label: "Sanitation Teams" },
            { icon: "location_on", label: "Bin Locations" },
          ].map(({ icon, label, active }) => (
            <a
              key={label}
              href="#"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                active
                  ? "bg-[#13ecc8]/10 text-[#13ecc8]"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">{icon}</span>
              <span className="text-sm font-medium">{label}</span>
            </a>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-200">
          <Link
            to="/citizen"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            <span className="text-sm font-medium">Citizen Portal</span>
          </Link>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-8 flex-1">
            <div className="flex items-center gap-2">
              <div className="size-6 text-[#13ecc8]">
                <svg fill="currentColor" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 42.4379C4 42.4379 14.0962 36.0744 24 41.1692C35.0664 46.8624 44 42.2078 44 42.2078L44 7.01134C44 7.01134 35.068 11.6577 24.0031 5.96913C14.0971 0.876274 4 7.27094 4 7.27094L4 42.4379Z" />
                </svg>
              </div>
              <h2 className="text-[#0d1b19] text-lg font-bold tracking-tight">Clean Madurai AI</h2>
            </div>
            <div className="max-w-md w-full relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">search</span>
              <input
                className="w-full bg-slate-100 border-none rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-[#13ecc8]/50 text-[#0d1b19] placeholder:text-slate-400"
                placeholder="Search by location..."
                type="text"
                value={searchLocation}
                onChange={(e) => { setSearchLocation(e.target.value); setPage(1); }}
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-slate-500 hover:text-[#0d1b19] transition-colors">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-2 right-2 size-2 bg-red-500 rounded-full border-2 border-white" />
            </button>
            <div className="h-8 w-[1px] bg-slate-200" />
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs font-bold text-[#0d1b19] uppercase tracking-tight">Rajesh Kumar</p>
                <p className="text-[10px] text-slate-500 font-medium">Zone 4 Authority</p>
              </div>
              <div
                className="size-9 rounded-full bg-slate-200 bg-center bg-cover border border-slate-200"
                style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAslvRC4ZjFbCWA-NMOzdC08YhDH8H8jtr-owHhjxl-eP8RC_nNrlxBeLVXRKQDvhPK8NS2uY9nw_5CpLF79-3LLnp0cXi7owYJpcYWtjZIzYSbUtZ-Jb4M0h6fNeL-DlihVkKsDqXuAVYoHGbeDgJS4DdtU6Z5IfnO_O0D0onKIvMdoOk5fGhopxHYKGm7Y0CYXVLddgzemfjZhxo1nx6zVeNn56GDnyiussAxHYaeBc6GYpavaaayHvJ5Tpt3_6RP9JHdPUhd8D6V')" }}
              />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50/50">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: "Pending Waste Reports", value: pending, accent: "text-orange-500", extra: "+5 new", bar: "bg-orange-500", width: "w-3/4" },
              { label: "Bins Overflowing", value: overflowing, accent: "text-red-500", extra: "Critical", bar: "bg-red-500", width: "w-1/2" },
              { label: "Plastic Waste", value: `${plasticTons}tn`, accent: "text-teal-500", extra: "Collected Today", bar: "bg-[#13ecc8]", width: "w-2/3" },
            ].map(({ label, value, accent, extra, bar, width }) => (
              <div key={label} className="bg-white p-6 rounded-lg shadow-sm border border-slate-100 flex flex-col justify-between">
                <div>
                  <p className="text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-2">{label}</p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-3xl font-bold text-[#0d1b19]">{value}</h3>
                    <span className={`${accent} text-xs font-bold`}>{extra}</span>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${bar} ${width}`} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Reports Table */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-[#0d1b19] font-bold">Live Waste Incidents</h2>
                <p className="text-[10px] text-slate-500 font-medium">Real-time reports from across Madurai</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Status filter */}
                <select
                  value={filterStatus}
                  onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                  className="h-8 bg-white border border-slate-200 rounded-lg px-3 text-xs font-bold text-slate-600 focus:ring-2 focus:ring-[#13ecc8]/50"
                >
                  {STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
                {/* Category filter */}
                <select
                  value={filterCategory}
                  onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
                  className="h-8 bg-white border border-slate-200 rounded-lg px-3 text-xs font-bold text-slate-600 focus:ring-2 focus:ring-[#13ecc8]/50"
                >
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
                <button
                  onClick={() => exportCsv(filtered)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#13ecc8] text-[#0d1b19] text-xs font-bold hover:brightness-95 transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">file_download</span>
                  Export CSV
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-500 text-[11px] uppercase tracking-wider font-bold">
                    {["ID", "Category", "Location", "AI Severity", "Score", "Status", "Reported", "Action"].map((h) => (
                      <th key={h} className="px-6 py-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginated.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-slate-400 text-sm">
                        No reports match your filters.
                      </td>
                    </tr>
                  )}
                  {paginated.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 text-sm font-bold text-[#0d1b19] font-mono">{r.id}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{r.category}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 max-w-[160px] truncate">{r.locationText}</td>
                      <td className="px-6 py-4">
                        <Badge variant={r.severity}>{r.severity}</Badge>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-700">{r.aiUrgencyScore}</td>
                      <td className="px-6 py-4">
                        <Badge variant={r.status}>{r.status}</Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">{timeAgo(r.createdAt)}</td>
                      <td className="px-6 py-4 text-center">
                        <StatusAction report={r} onUpdate={updateStatus} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
              <p className="text-slate-500 text-xs font-medium">
                Showing {Math.min(paginated.length, PER_PAGE)} of {filtered.length} reports
              </p>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1 rounded border border-slate-200 text-xs font-medium text-slate-500 disabled:opacity-50"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-3 py-1 rounded border text-xs font-bold transition-colors ${
                      p === page
                        ? "bg-slate-100 border-slate-200 text-[#0d1b19]"
                        : "border-slate-200 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  disabled={page === totalPages || totalPages === 0}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1 rounded border border-slate-200 text-xs font-medium text-slate-500 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          {/* Bottom panels */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-[#13ecc8]">auto_awesome</span>
                <h3 className="text-[#0d1b19] font-bold text-sm uppercase tracking-wide">Waste Hotspot Map</h3>
              </div>
              <div className="h-48 bg-slate-100 rounded-lg flex items-center justify-center relative overflow-hidden">
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-40"
                  style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDSqsWlhvl4yV8p0TSB9kXyXW2gNffV_ktnfikezjo2_nYXfN2rqpbdcLP_exd8Vsg1ItPBdXIr43rD_f5I_oHB8YFxo8dSQjxt9YOHNDlIm4O9nOU1KsoJyV3nH9KAoh_7lmgjsGvHuUon5kwOT4WmajSr7I3mHT95C6rpPbKeIA_Sk_9FAcEujLlYBwRt1IozO4bs6B3oek8ia4ZahBPNMu0FDEdw0tROcUZFQp71Ayefq-KyBh0o0t_3sho4ngGTWzu8oTNwwcJS')" }}
                />
                <p className="relative z-10 text-[10px] font-bold text-slate-500 bg-white/90 px-4 py-2 rounded-full border border-slate-200 uppercase tracking-widest shadow-sm">
                  Live Heatmap: Madurai Central
                </p>
              </div>
              <p className="mt-4 text-xs text-slate-500 leading-relaxed italic border-l-2 border-[#13ecc8] pl-3">
                "AI Prediction: High probability of plastic accumulation near Teppakulam area. Recommendation: Deploy 2 extra mobile units."
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#13ecc8]">analytics</span>
                  <h3 className="text-[#0d1b19] font-bold text-sm uppercase tracking-wide">Sanitation Metrics</h3>
                </div>
              </div>
              <div className="space-y-4">
                {[
                  { label: "Avg. Clearance Time", value: "2.4 hrs (Optimal)", color: "bg-[#13ecc8]", pct: "w-[85%]", textColor: "text-[#13ecc8]" },
                  { label: "Plastic Recycled", value: "62% Monthly Goal", color: "bg-blue-500", pct: "w-[62%]", textColor: "text-blue-500" },
                  { label: "Bin Health Index", value: "74% Functional", color: "bg-orange-500", pct: "w-[74%]", textColor: "text-orange-500" },
                ].map(({ label, value, color, pct, textColor }) => (
                  <div key={label}>
                    <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase mb-1">
                      <span>{label}</span>
                      <span className={textColor}>{value}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div className={`${color} h-full ${pct}`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
