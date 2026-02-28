import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { useReports } from "../../state/ReportsContext";
import { useAuth } from "../../context/AuthContext";
import { Badge } from "../../components/ui/Badge";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { supabase } from "../../lib/supabase";

const RISK_STYLE = {
    High: { bg: "bg-red-100", text: "text-red-700", border: "border-red-300", badge: "bg-red-500" },
    Medium: { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-300", badge: "bg-amber-500" },
    Low: { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-300", badge: "bg-emerald-500" },
};

function timeAgo(isoString) {
    const diff = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return `${mins}m ago`;
}

function daysUntil(dateStr) {
    return Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
}

function StatusAction({ report, onUpdateStatus }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="relative">
            <button
                onClick={() => setOpen((p) => !p)}
                className="text-slate-400 hover:text-[#13ecc8] transition-colors p-1 bg-slate-50 border border-slate-200 rounded-md"
            >
                <span className="material-symbols-outlined text-[18px]">update</span>
            </button>
            {open && (
                <div className="absolute right-0 top-8 z-50 bg-white border border-slate-200 rounded-lg shadow-xl w-48 py-2 text-sm max-h-64 overflow-y-auto">
                    <div className="px-3 pb-2 mb-2 border-b border-slate-100 font-bold text-xs text-slate-500 uppercase">Update Status</div>
                    <button onClick={() => { onUpdateStatus(report.id, "In Progress"); setOpen(false); }} className="w-full text-left px-4 py-1.5 hover:bg-slate-50 text-slate-700">Mark In Progress</button>
                    <button onClick={() => { onUpdateStatus(report.id, "Resolved"); setOpen(false); }} className="w-full text-left px-4 py-1.5 hover:bg-slate-50 text-slate-700">Mark Resolved</button>
                </div>
            )}
        </div>
    );
}

export default function WorkerDashboard() {
    const { reports, updateStatus } = useReports();
    const { user, logout } = useAuth();
    const [eventAssignments, setEventAssignments] = useState([]);
    const [notifOpen, setNotifOpen] = useState(false);

    const myReports = useMemo(() => {
        return reports.filter(r => r.assigned_worker_id === user?.id || r.status === "Assigned" || r.status === "In Progress");
    }, [reports, user]);

    // Fetch event assignments for this worker
    useEffect(() => {
        if (!user) return;
        const fetchAssignments = async () => {
            const { data } = await supabase
                .from("event_worker_assignments")
                .select("*, events(*), event_predictions(predicted_risk_level, predicted_complaint_increase_percentage)")
                .eq("worker_id", user.uid || user.id);
            if (data) setEventAssignments(data);
        };
        fetchAssignments();
    }, [user]);

    const upcomingAssignments = eventAssignments.filter(a => a.events && daysUntil(a.events.start_date) >= 0);

    return (
        <div className="flex flex-col min-h-screen bg-[#f6f8f8] font-[Public_Sans,sans-serif] text-[#0d1b19]">
            <header className="sticky top-0 z-50 bg-[#f6f8f8]/80 backdrop-blur-md border-b border-[#13ecc8]/10">
                <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-[#13ecc8] p-1.5 rounded-lg flex items-center justify-center">
                            <span className="material-symbols-outlined text-[#0d1b19] text-2xl">local_shipping</span>
                        </div>
                        <h2 className="text-xl font-bold tracking-tight">Worker Portal</h2>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* 🔔 Notification Bell */}
                        <div className="relative">
                            <button
                                onClick={() => setNotifOpen(p => !p)}
                                className="relative p-2 rounded-xl hover:bg-slate-100 transition-colors"
                            >
                                <span className="material-symbols-outlined text-[22px] text-slate-600">notifications</span>
                                {upcomingAssignments.length > 0 && (
                                    <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                                        {upcomingAssignments.length}
                                    </span>
                                )}
                            </button>
                            {/* Notification Dropdown */}
                            {notifOpen && (
                                <div className="absolute right-0 top-12 w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden">
                                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                                        <span className="font-bold text-sm">Event Assignments</span>
                                        <span className="text-xs text-slate-400">{upcomingAssignments.length} upcoming</span>
                                    </div>
                                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                                        {upcomingAssignments.length === 0 ? (
                                            <p className="text-center text-slate-400 text-sm py-6">No upcoming event assignments.</p>
                                        ) : (
                                            upcomingAssignments.map(a => {
                                                const ev = a.events;
                                                const riskLevel = a.event_predictions?.[0]?.predicted_risk_level;
                                                const rs = RISK_STYLE[riskLevel] || RISK_STYLE.Low;
                                                return (
                                                    <div key={a.id} className="p-3 hover:bg-slate-50">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className={`text-[10px] font-bold text-white px-2 py-0.5 rounded-full ${rs.badge}`}>{riskLevel || "Event"}</span>
                                                            <span className="text-xs text-slate-400">{daysUntil(ev.start_date) === 0 ? "TODAY" : `in ${daysUntil(ev.start_date)}d`}</span>
                                                        </div>
                                                        <div className="font-bold text-sm">{ev.event_name}</div>
                                                        <div className="text-xs text-slate-500">📍 {ev.location} · 📅 {ev.start_date}</div>
                                                        <div className="text-xs text-emerald-700 font-medium mt-1 bg-emerald-50 rounded px-2 py-1">{a.role_description}</div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        {user && (
                            <div className="flex items-center gap-3">
                                <div className="text-right hidden sm:block">
                                    <p className="text-xs font-bold text-[#0d1b19] tracking-tight">{user.email}</p>
                                    <p className="text-[10px] text-slate-500 font-medium uppercase">Field Worker</p>
                                </div>
                                <button onClick={logout} className="text-xs font-bold text-red-600 hover:underline">Logout</button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <main className="flex-grow max-w-5xl mx-auto w-full px-6 py-8">

                {/* ── EVENT ASSIGNMENT NOTIFICATIONS ── */}
                {upcomingAssignments.length > 0 && (
                    <div className="mb-8">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="material-symbols-outlined text-violet-600 text-[22px]">event_available</span>
                            <h2 className="font-extrabold text-lg">Your Event Assignments</h2>
                            <span className="text-xs font-bold text-white px-2 py-0.5 rounded-full bg-violet-600">{upcomingAssignments.length}</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {upcomingAssignments.map(a => {
                                const ev = a.events;
                                const riskLevel = a.event_predictions?.[0]?.predicted_risk_level;
                                const rs = RISK_STYLE[riskLevel] || RISK_STYLE.Low;
                                const days = daysUntil(ev.start_date);
                                return (
                                    <div key={a.id} className={`bg-white rounded-xl border-2 ${rs.border} p-4 shadow-sm`}>
                                        <div className="flex items-start justify-between mb-2">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    {riskLevel && (
                                                        <span className={`text-[10px] font-bold text-white px-2 py-0.5 rounded-full ${rs.badge}`}>{riskLevel} Risk</span>
                                                    )}
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${days === 0 ? "bg-red-100 text-red-700" : days <= 3 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                                                        {days === 0 ? "TODAY" : days < 0 ? "Past" : `${days}d away`}
                                                    </span>
                                                </div>
                                                <h3 className="font-extrabold text-[#0d1b19]">{ev.event_name}</h3>
                                                <p className="text-xs text-slate-500 mt-0.5">📍 {ev.location} · 📅 {ev.start_date}</p>
                                            </div>
                                            <span className="material-symbols-outlined text-violet-500 text-2xl">event_available</span>
                                        </div>
                                        <div className={`${rs.bg} rounded-lg px-3 py-2 text-xs font-medium ${rs.text} flex items-center gap-1.5`}>
                                            <span className="material-symbols-outlined text-[14px]">person_pin</span>
                                            <span>{a.role_description}</span>
                                        </div>
                                        <div className="mt-2 text-xs text-slate-400 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[12px]">groups</span>
                                            Expected crowd: {ev.expected_crowd_size?.toLocaleString()} people
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="mb-8">
                    <h1 className="text-3xl font-extrabold mb-2">My Assigned Tasks</h1>
                    <p className="text-slate-600">Review and update the status of your assigned waste collection tasks.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
                        <span className="material-symbols-outlined text-4xl text-orange-500 mb-2">pending_actions</span>
                        <span className="text-3xl font-bold text-[#0d1b19]">{myReports.filter(r => r.status === "Assigned" || r.status === "In Progress").length}</span>
                        <span className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Active Tasks</span>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
                        <span className="material-symbols-outlined text-4xl text-[#13ecc8] mb-2">check_circle</span>
                        <span className="text-3xl font-bold text-[#0d1b19]">{myReports.filter(r => r.status === "Resolved").length}</span>
                        <span className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Completed Today</span>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <h2 className="text-[#0d1b19] font-bold text-sm uppercase tracking-wider">Queue</h2>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {myReports.length === 0 ? (
                            <div className="p-8 text-center text-slate-500">No tasks assigned to you right now.</div>
                        ) : (
                            myReports.map(report => (
                                <div key={report.id} className="p-6 flex flex-col md:flex-row gap-6 hover:bg-slate-50 transition-colors">
                                    {report.image_url && (
                                        <div className="w-full md:w-48 h-32 rounded-lg bg-slate-200 overflow-hidden shrink-0">
                                            <img src={report.image_url} alt="Report issue" className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                    <div className="flex-1 flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-start justify-between mb-2">
                                                <div>
                                                    <h3 className="font-bold text-lg text-[#0d1b19] mb-1">{report.category}</h3>
                                                    <p className="text-sm font-medium text-[#4c9a8d] flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-[16px]">location_on</span>
                                                        {report.location}
                                                    </p>
                                                </div>
                                                <Badge variant={report.status}>{report.status}</Badge>
                                            </div>
                                            <p className="text-sm text-slate-600 mb-4">{report.notes || "No additional notes provided."}</p>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex gap-4 text-xs font-bold text-slate-500">
                                                <span className="bg-slate-100 px-2 py-1 rounded border border-slate-200">Severity: {report.severity || "Medium"}</span>
                                                <span className="bg-slate-100 px-2 py-1 rounded border border-slate-200">Reported {timeAgo(report.created_at)}</span>
                                            </div>
                                            <div>
                                                {report.status !== "Resolved" && (
                                                    <StatusAction report={report} onUpdateStatus={updateStatus} />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Map Widget */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-[#0d1b19] mb-4">Nearby Bins & Hotspots</h3>
                    <div className="h-64 w-full rounded-lg overflow-hidden border border-slate-200 z-0">
                        <MapContainer center={[9.95, 78.15]} zoom={12} scrollWheelZoom={false} className="w-full h-full z-0">
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            {myReports.filter(r => r.latitude && r.longitude).map(r => (
                                <Marker key={r.id} position={[r.latitude, r.longitude]}>
                                    <Popup>{r.category} ({r.status})</Popup>
                                </Marker>
                            ))}
                        </MapContainer>
                    </div>
                </div>
            </main>
        </div>
    );
}
