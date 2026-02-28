import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { generateWasteSurgeAlert } from "../../lib/gemini";
import { Toast } from "../../components/ui/Toast";


const EVENT_TYPES = ["festival", "public", "political", "sports", "religious"];

const RISK_COLORS = {
    High: { bg: "bg-red-100", text: "text-red-700", border: "border-red-300", badge: "bg-red-500", circle: "#ef4444" },
    Medium: { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-300", badge: "bg-amber-500", circle: "#f59e0b" },
    Low: { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-300", badge: "bg-emerald-500", circle: "#10b981" },
};

const INITIAL_FORM = {
    event_name: "", event_type: "festival", location: "", latitude: 9.9252,
    longitude: 78.1198, start_date: "", end_date: "", expected_crowd_size: 1000,
};

function computeRisk(crowdSize, historicalIncrease) {
    if (crowdSize > 5000 || historicalIncrease > 30) return { level: "High", increase: Math.max(35, historicalIncrease) };
    if (crowdSize > 2000 || historicalIncrease > 10) return { level: "Medium", increase: Math.max(15, historicalIncrease) };
    return { level: "Low", increase: Math.max(5, historicalIncrease) };
}

function daysUntil(dateStr) {
    return Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
}


export default function EventIntelligence() {
    const [events, setEvents] = useState([]);
    const [predictions, setPredictions] = useState({});
    const [workers, setWorkers] = useState([]);
    const [assignments, setAssignments] = useState({}); // { event_id: [{ worker, role_description }] }
    const [loading, setLoading] = useState(true);
    const [formOpen, setFormOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);
    const [form, setForm] = useState(INITIAL_FORM);
    const [analyzing, setAnalyzing] = useState(null);
    const [toast, setToast] = useState(null);
    const [activeTab, setActiveTab] = useState("calendar");

    // Fetch all data
    const fetchData = useCallback(async () => {
        setLoading(true);
        const [eventsRes, predictionsRes, workersRes, assignmentsRes] = await Promise.all([
            supabase.from("events").select("*").order("start_date"),
            supabase.from("event_predictions").select("*"),
            supabase.from("users").select("id,email,full_name").eq("role", "worker"),
            supabase.from("event_worker_assignments").select("*"),
        ]);
        if (eventsRes.data) setEvents(eventsRes.data);
        if (predictionsRes.data) {
            const byEvent = {};
            predictionsRes.data.forEach((p) => { byEvent[p.event_id] = p; });
            setPredictions(byEvent);
        }
        if (workersRes.data) setWorkers(workersRes.data);
        if (assignmentsRes.data) {
            const byEvent = {};
            assignmentsRes.data.forEach((a) => {
                if (!byEvent[a.event_id]) byEvent[a.event_id] = [];
                byEvent[a.event_id].push(a);
            });
            setAssignments(byEvent);
        }
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // High-risk events within 3 days
    const urgentAlerts = events.filter((ev) => {
        const pred = predictions[ev.id];
        return pred?.predicted_risk_level === "High" && daysUntil(ev.start_date) <= 3 && daysUntil(ev.start_date) >= 0;
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = { ...form, expected_crowd_size: parseInt(form.expected_crowd_size) };
        let err;

        if (editingEvent) {
            ({ error: err } = await supabase.from("events").update(payload).eq("id", editingEvent.id));
        } else {
            ({ error: err } = await supabase.from("events").insert([payload]));
        }

        if (err) { setToast({ message: `Error: ${err.message}`, type: "error" }); return; }
        setToast({ message: editingEvent ? "Event updated!" : "Event added!", type: "success" });
        setFormOpen(false); setEditingEvent(null); setForm(INITIAL_FORM);
        fetchData();
    };

    const handleEdit = (ev) => {
        setEditingEvent(ev);
        setForm({ ...ev });
        setFormOpen(true);
    };

    const handleDelete = async (id) => {
        if (!confirm("Delete this event and its predictions?")) return;
        await supabase.from("events").delete().eq("id", id);
        setToast({ message: "Event deleted.", type: "success" });
        fetchData();
    };

    const runAnalysis = async (ev) => {
        setAnalyzing(ev.id);
        try {
            const historicalIncrease = 0;
            const { level, increase } = computeRisk(ev.expected_crowd_size, historicalIncrease);

            let alertData = {
                alertBanner: null,
                suggestedActions: [
                    `Deploy sanitation teams to ${ev.location} on ${ev.start_date}`,
                    "Install temporary waste bins along the event perimeter",
                    "Increase pickup frequency to 3x per day during the event",
                ],
            };

            if (level === "High" || level === "Medium") {
                try {
                    alertData = await generateWasteSurgeAlert(ev, level, increase);
                } catch (geminiErr) {
                    console.warn("Gemini API failed, using fallback:", geminiErr.message);
                }
            }

            // Save prediction
            const predPayload = {
                event_id: ev.id,
                predicted_risk_level: level,
                predicted_complaint_increase_percentage: increase,
                alert_banner: alertData.alertBanner,
                suggested_actions: alertData.suggestedActions,
            };
            const existing = predictions[ev.id];
            if (existing) {
                await supabase.from("event_predictions").update(predPayload).eq("id", existing.id);
            } else {
                await supabase.from("event_predictions").insert([predPayload]);
            }

            // === AUTO-ASSIGN WORKERS BASED ON RISK ===
            const workerCount = level === "High"
                ? Math.min(workers.length, Math.max(10, Math.floor(ev.expected_crowd_size / 500)))
                : level === "Medium"
                    ? Math.min(workers.length, Math.max(5, Math.floor(ev.expected_crowd_size / 1000)))
                    : Math.min(workers.length, Math.max(2, Math.floor(ev.expected_crowd_size / 2000)));

            const roles = [
                `Zone A – Perimeter waste collection at ${ev.location}`,
                `Zone B – Overflow bin monitoring near ${ev.location}`,
                `Zone C – Post-event deep clean at ${ev.location}`,
                `Rapid Response – Immediate waste overflow at ${ev.location}`,
                `Segregation Duty – Plastic & organic sorting at ${ev.location}`,
                `Transport Lead – Waste vehicle coordination for ${ev.event_name}`,
                `Night Shift – Evening cleanup after ${ev.event_name}`,
                `Entry Point Monitor – Track incoming waste at ${ev.location}`,
                `Exit Point Cleanup – Post-crowd dispersal at ${ev.location}`,
                `Bin Refill Team – Replenish temporary bins during ${ev.event_name}`,
                `Water & Sanitation – Liquid waste management at ${ev.location}`,
                `Hazardous Watch – Monitor hazardous items at ${ev.location}`,
                `Crowd Zone Monitor – High density area sweep at ${ev.location}`,
                `Logistics Support – Supply temporary bins to ${ev.location}`,
                `Supervisor – Oversee all sanitation teams at ${ev.event_name}`,
            ];

            // Remove old assignments for this event
            await supabase.from("event_worker_assignments").delete().eq("event_id", ev.id);

            // Pick workers (round-robin from pool)
            const selectedWorkers = workers.slice(0, workerCount);
            const newAssignments = selectedWorkers.map((w, i) => ({
                event_id: ev.id,
                worker_id: w.id,
                role_description: roles[i % roles.length],
            }));

            if (newAssignments.length > 0) {
                await supabase.from("event_worker_assignments").insert(newAssignments);
            }

            setToast({ message: `AI Analysis complete: ${level} risk — ${workerCount} workers assigned!`, type: level === "High" ? "error" : "success" });
            fetchData();
        } catch (err) {
            setToast({ message: `Analysis failed: ${err.message}`, type: "error" });
        } finally {
            setAnalyzing(null);
        }
    };

    const removeWorkerAssignment = async (eventId, workerId) => {
        await supabase.from("event_worker_assignments")
            .delete()
            .eq("event_id", eventId)
            .eq("worker_id", workerId);
        setToast({ message: "Worker removed from event.", type: "success" });
        fetchData();
    };

    return (
        <div className="min-h-screen bg-[#f6f8f8] font-[Public_Sans,sans-serif] text-[#0d1b19]">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link to="/authority" className="flex items-center gap-2 text-slate-500 hover:text-[#13ecc8] transition-colors text-sm">
                            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                            Authority Dashboard
                        </Link>
                        <span className="text-slate-300">|</span>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
                                <span className="material-symbols-outlined text-white text-[18px]">auto_awesome</span>
                            </div>
                            <h1 className="text-lg font-bold">Event Intelligence</h1>
                        </div>
                    </div>
                    <button
                        onClick={() => { setFormOpen(true); setEditingEvent(null); setForm(INITIAL_FORM); }}
                        className="flex items-center gap-2 h-9 px-4 bg-[#13ecc8] text-[#0d1b19] rounded-xl font-bold text-sm hover:opacity-90 transition-opacity"
                    >
                        <span className="material-symbols-outlined text-[16px]">add</span>
                        Add Event
                    </button>
                </div>
            </header>

            {/* Urgent Alerts Banner */}
            {urgentAlerts.length > 0 && (
                <div className="bg-red-600 text-white px-6 py-3">
                    <div className="max-w-7xl mx-auto flex items-center gap-3 flex-wrap">
                        <span className="material-symbols-outlined animate-pulse">warning</span>
                        <span className="font-bold text-sm">URGENT ALERTS ({urgentAlerts.length}):</span>
                        {urgentAlerts.map((ev) => (
                            <span key={ev.id} className="bg-white/20 rounded-full px-3 py-0.5 text-sm font-medium">
                                ⚠ {ev.event_name} in {ev.location} — {daysUntil(ev.start_date) === 0 ? "TODAY" : `${daysUntil(ev.start_date)}d`}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Tab Navigation */}
            <div className="max-w-7xl mx-auto px-6 pt-6">
                <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit mb-6">
                    {[
                        { id: "calendar", label: "Event Calendar", icon: "calendar_month" },
                        { id: "predictions", label: "AI Predictions", icon: "psychology" },
                        { id: "map", label: "Risk Map", icon: "map" },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === tab.id
                                ? "bg-white text-[#0d1b19] shadow-sm"
                                : "text-slate-500 hover:text-[#0d1b19]"
                                }`}
                        >
                            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* EVENT CALENDAR TAB */}
                {activeTab === "calendar" && (
                    <div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                            {[
                                { label: "Total Events", value: events.length, icon: "event", color: "text-violet-600" },
                                { label: "High Risk", value: Object.values(predictions).filter((p) => p.predicted_risk_level === "High").length, icon: "warning", color: "text-red-600" },
                                { label: "Upcoming (7d)", value: events.filter((e) => daysUntil(e.start_date) >= 0 && daysUntil(e.start_date) <= 7).length, icon: "upcoming", color: "text-blue-600" },
                                { label: "Workers in Pool", value: workers.length, icon: "group", color: "text-emerald-600" },
                            ].map((stat) => (
                                <div key={stat.label} className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4">
                                    <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center">
                                        <span className={`material-symbols-outlined ${stat.color} text-2xl`}>{stat.icon}</span>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-extrabold text-[#0d1b19]">{stat.value}</div>
                                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">{stat.label}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {loading ? (
                            <div className="text-center py-20 text-slate-400">Loading events...</div>
                        ) : events.length === 0 ? (
                            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
                                <span className="material-symbols-outlined text-5xl text-slate-300 mb-4 block">event_busy</span>
                                <p className="font-bold text-slate-500">No events yet. Add your first event!</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-10">
                                {events.map((ev) => {
                                    const pred = predictions[ev.id];
                                    const colors = pred ? RISK_COLORS[pred.predicted_risk_level] : null;
                                    const days = daysUntil(ev.start_date);
                                    const eventAssignments = assignments[ev.id] || [];
                                    return (
                                        <div key={ev.id} className={`bg-white rounded-xl border-2 ${pred ? colors.border : "border-slate-200"} p-5 shadow-sm`}>
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h3 className="font-extrabold text-[#0d1b19] text-lg">{ev.event_name}</h3>
                                                        {pred && (
                                                            <span className={`text-xs font-bold text-white px-2 py-0.5 rounded-full ${colors.badge}`}>
                                                                {pred.predicted_risk_level} Risk
                                                            </span>
                                                        )}
                                                        {eventAssignments.length > 0 && (
                                                            <span className="text-xs font-bold text-white px-2 py-0.5 rounded-full bg-emerald-600">
                                                                👷 {eventAssignments.length} Workers
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-slate-500 mt-0.5">{ev.location}</p>
                                                </div>
                                                <div className={`text-xs font-bold px-2.5 py-1 rounded-lg ${days === 0 ? "bg-red-100 text-red-700" : days <= 3 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                                                    {days < 0 ? "Past" : days === 0 ? "Today!" : `${days}d away`}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-3 gap-3 text-xs mb-4">
                                                <div>
                                                    <div className="text-slate-400 uppercase font-bold tracking-wider">Type</div>
                                                    <div className="font-bold capitalize">{ev.event_type}</div>
                                                </div>
                                                <div>
                                                    <div className="text-slate-400 uppercase font-bold tracking-wider">Crowd</div>
                                                    <div className="font-bold">{ev.expected_crowd_size?.toLocaleString()}</div>
                                                </div>
                                                <div>
                                                    <div className="text-slate-400 uppercase font-bold tracking-wider">Dates</div>
                                                    <div className="font-bold">{ev.start_date}</div>
                                                </div>
                                            </div>

                                            {pred && (
                                                <div className={`${colors.bg} rounded-lg p-3 mb-3 text-sm ${colors.text}`}>
                                                    <div className="font-bold mb-1 flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-[16px]">insights</span>
                                                        +{pred.predicted_complaint_increase_percentage}% waste surge predicted
                                                    </div>
                                                    {pred.alert_banner && <p className="text-xs opacity-80 leading-relaxed">{pred.alert_banner}</p>}
                                                </div>
                                            )}

                                            {/* ── ASSIGNED WORKERS PANEL ── */}
                                            {eventAssignments.length > 0 && (
                                                <div className="mb-3 border border-emerald-200 bg-emerald-50 rounded-lg p-3">
                                                    <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs mb-2 uppercase tracking-wider">
                                                        <span className="material-symbols-outlined text-[14px]">group</span>
                                                        Assigned Workers ({eventAssignments.length})
                                                    </div>
                                                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                                                        {eventAssignments.map((a) => {
                                                            const w = workers.find(wr => wr.id === a.worker_id);
                                                            return (
                                                                <div key={a.id} className="flex items-center gap-2 text-xs bg-white rounded-lg px-2 py-1.5 border border-emerald-100">
                                                                    <div className="w-6 h-6 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center text-[10px] shrink-0">
                                                                        {(w?.full_name || w?.email || "W")[0].toUpperCase()}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="font-bold text-slate-800 truncate">{w?.full_name || w?.email || a.worker_id.slice(0, 8)}</div>
                                                                        <div className="text-slate-500 truncate text-[10px]">{a.role_description}</div>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => removeWorkerAssignment(ev.id, a.worker_id)}
                                                                        className="text-red-400 hover:text-red-600 transition-colors shrink-0 ml-1"
                                                                        title="Remove"
                                                                    >
                                                                        <span className="material-symbols-outlined text-[14px]">close</span>
                                                                    </button>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => runAnalysis(ev)}
                                                    disabled={analyzing === ev.id}
                                                    className="flex-1 flex items-center justify-center gap-1.5 h-9 bg-violet-600 text-white rounded-lg text-xs font-bold hover:bg-violet-700 transition-colors disabled:opacity-50"
                                                >
                                                    {analyzing === ev.id ? (
                                                        <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                                                    ) : (
                                                        <span className="material-symbols-outlined text-[16px]">psychology</span>
                                                    )}
                                                    {analyzing === ev.id ? "Analyzing & Assigning..." : "Run AI Analysis"}
                                                </button>
                                                <button onClick={() => handleEdit(ev)} className="h-9 px-3 bg-slate-100 rounded-lg text-slate-600 hover:bg-slate-200 transition-colors">
                                                    <span className="material-symbols-outlined text-[16px]">edit</span>
                                                </button>
                                                <button onClick={() => handleDelete(ev.id)} className="h-9 px-3 bg-red-50 rounded-lg text-red-600 hover:bg-red-100 transition-colors">
                                                    <span className="material-symbols-outlined text-[16px]">delete</span>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* AI PREDICTIONS TAB */}
                {activeTab === "predictions" && (
                    <div className="pb-10">
                        {Object.keys(predictions).length === 0 ? (
                            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
                                <span className="material-symbols-outlined text-5xl text-slate-300 block mb-4">psychology</span>
                                <p className="font-bold text-slate-500">No AI predictions yet.</p>
                                <p className="text-sm text-slate-400 mt-1">Go to Event Calendar and click "Run AI Analysis" on any event.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {events.filter((ev) => predictions[ev.id]).map((ev) => {
                                    const pred = predictions[ev.id];
                                    const colors = RISK_COLORS[pred.predicted_risk_level];
                                    return (
                                        <div key={ev.id} className={`bg-white rounded-2xl border-2 ${colors.border} p-6 shadow-sm`}>
                                            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                                                <div>
                                                    <div className="flex items-center gap-3">
                                                        <h3 className="font-extrabold text-xl">{ev.event_name}</h3>
                                                        <span className={`text-sm font-bold text-white px-3 py-1 rounded-full ${colors.badge}`}>
                                                            {pred.predicted_risk_level} Risk
                                                        </span>
                                                    </div>
                                                    <p className="text-slate-500 text-sm mt-1">📍 {ev.location} · {ev.start_date}</p>
                                                </div>
                                                <div className={`text-4xl font-black ${colors.text}`}>
                                                    +{pred.predicted_complaint_increase_percentage}%
                                                    <div className="text-xs font-bold text-slate-400 text-right">surge</div>
                                                </div>
                                            </div>

                                            {pred.alert_banner && (
                                                <div className={`${colors.bg} border ${colors.border} rounded-xl p-4 mb-4`}>
                                                    <p className={`font-bold text-sm ${colors.text} leading-relaxed`}>
                                                        ⚠ {pred.alert_banner}
                                                    </p>
                                                </div>
                                            )}

                                            {pred.suggested_actions?.length > 0 && (
                                                <div>
                                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Recommended Actions</div>
                                                    <div className="space-y-2">
                                                        {pred.suggested_actions.map((action, i) => (
                                                            <div key={i} className="flex items-start gap-2 text-sm">
                                                                <div className="w-5 h-5 rounded-full bg-[#13ecc8]/20 text-[#0d8a7c] font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</div>
                                                                <p className="text-slate-600 leading-relaxed">{action}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="mt-4 text-xs text-slate-400">
                                                Analysis generated: {new Date(pred.generated_at).toLocaleString()}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* MAP TAB */}
                {activeTab === "map" && (
                    <div className="pb-10">
                        <div className="flex gap-4 flex-col xl:flex-row">
                            {/* Map */}
                            <div className="flex-1 bg-white border border-slate-200 rounded-2xl overflow-hidden">
                                <div className="p-4 border-b border-slate-100 flex items-center gap-4 flex-wrap">
                                    <span className="font-bold text-sm">🗺 Waste Surge Risk Map</span>
                                    <div className="flex items-center gap-4 ml-auto text-xs font-bold">
                                        <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-full bg-red-500 shadow-md" /> High Risk</div>
                                        <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-full bg-amber-400 shadow-md" /> Medium</div>
                                        <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-full bg-emerald-500 shadow-md" /> Low</div>
                                        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-blue-300" /> Past Complaint</div>
                                    </div>
                                </div>
                                <MapContainer center={mapCenter} zoom={13} style={{ height: "520px" }} scrollWheelZoom>
                                    <TileLayer
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    />
                                    <FitBoundsToEvents events={events} />
                                    {/* Event risk zone circles */}
                                    {events.map((ev) => {
                                        const pred = predictions[ev.id];
                                        const riskColor = pred ? RISK_COLORS[pred.predicted_risk_level].circle : "#6b7280";
                                        const riskLevel = pred?.predicted_risk_level;
                                        const baseRadius = riskLevel === "High" ? 1500 : riskLevel === "Medium" ? 1000 : 600;
                                        const crowdFactor = Math.min(3, (ev.expected_crowd_size || 1000) / 5000);
                                        const radius = baseRadius + (baseRadius * crowdFactor * 0.5);
                                        return (
                                            <Circle
                                                key={`glow-${ev.id}`}
                                                center={[ev.latitude, ev.longitude]}
                                                radius={radius * 1.4}
                                                color={riskColor}
                                                fillColor={riskColor}
                                                fillOpacity={0.06}
                                                weight={0}
                                            />
                                        );
                                    })}
                                    {events.map((ev) => {
                                        const pred = predictions[ev.id];
                                        const riskColor = pred ? RISK_COLORS[pred.predicted_risk_level].circle : "#6b7280";
                                        const riskLevel = pred?.predicted_risk_level;
                                        const baseRadius = riskLevel === "High" ? 1500 : riskLevel === "Medium" ? 1000 : 600;
                                        const crowdFactor = Math.min(3, (ev.expected_crowd_size || 1000) / 5000);
                                        const radius = baseRadius + (baseRadius * crowdFactor * 0.5);
                                        return (
                                            <Circle
                                                key={`zone-${ev.id}`}
                                                center={[ev.latitude, ev.longitude]}
                                                radius={radius}
                                                color={riskColor}
                                                fillColor={riskColor}
                                                fillOpacity={riskLevel === "High" ? 0.28 : 0.18}
                                                weight={2}
                                            />
                                        );
                                    })}
                                    {/* Center markers */}
                                    {events.map((ev) => {
                                        const pred = predictions[ev.id];
                                        const riskColor = pred ? RISK_COLORS[pred.predicted_risk_level].circle : "#6b7280";
                                        const riskLevel = pred?.predicted_risk_level;
                                        return (
                                            <Marker
                                                key={`marker-${ev.id}`}
                                                position={[ev.latitude, ev.longitude]}
                                                icon={createRiskIcon(riskColor)}
                                            >
                                                <Popup maxWidth={260}>
                                                    <div style={{ fontFamily: 'sans-serif', minWidth: '200px' }}>
                                                        <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>{ev.event_name}</div>
                                                        <div style={{ color: '#6b7280', fontSize: '12px' }}>📍 {ev.location}</div>
                                                        <div style={{ fontSize: '12px', marginTop: '4px' }}>👥 {ev.expected_crowd_size?.toLocaleString()} people</div>
                                                        <div style={{ fontSize: '12px' }}>📅 {ev.start_date}</div>
                                                        {pred && (
                                                            <div style={{ marginTop: '8px', padding: '6px', background: riskColor + '22', borderRadius: '6px', borderLeft: `3px solid ${riskColor}` }}>
                                                                <div style={{ fontWeight: 'bold', color: riskColor, fontSize: '12px' }}>
                                                                    ⚠ {pred.predicted_risk_level} Risk — +{pred.predicted_complaint_increase_percentage}% surge
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </Popup>
                                            </Marker>
                                        );
                                    })}
                                    {/* Past complaint density dots */}
                                    {reports.filter((r) => r.latitude && r.longitude).slice(0, 100).map((r, i) => (
                                        <Circle
                                            key={i}
                                            center={[r.latitude, r.longitude]}
                                            radius={150}
                                            color="#3b82f6"
                                            fillColor="#3b82f6"
                                            fillOpacity={0.4}
                                            weight={0}
                                        />
                                    ))}
                                </MapContainer>
                            </div>

                            {/* Risk Event Sidebar */}
                            <div className="xl:w-72 bg-white border border-slate-200 rounded-2xl p-4 space-y-3 max-h-[600px] overflow-y-auto">
                                <div className="font-bold text-sm uppercase tracking-wider text-slate-500 mb-2">Risk Summary</div>
                                {events.length === 0 && (
                                    <p className="text-slate-400 text-sm text-center py-8">No events added yet.</p>
                                )}
                                {events.map((ev) => {
                                    const pred = predictions[ev.id];
                                    const colors = pred ? RISK_COLORS[pred.predicted_risk_level] : null;
                                    return (
                                        <div key={ev.id} className={`rounded-xl p-3 border-2 ${colors ? colors.border + ' ' + colors.bg : 'border-slate-100 bg-slate-50'}`}>
                                            <div className="flex justify-between items-start">
                                                <div className="font-bold text-sm leading-tight">{ev.event_name}</div>
                                                {pred ? (
                                                    <span className={`text-[10px] font-bold text-white px-2 py-0.5 rounded-full ${colors.badge} ml-2 shrink-0`}>
                                                        {pred.predicted_risk_level}
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] font-bold text-slate-400 ml-2">No analysis</span>
                                                )}
                                            </div>
                                            <div className="text-xs text-slate-500 mt-1">{ev.location}</div>
                                            {pred && (
                                                <div className={`text-xs font-bold mt-2 ${colors.text}`}>
                                                    +{pred.predicted_complaint_increase_percentage}% waste surge
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Add / Edit Event Modal */}
            {formOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="font-extrabold text-xl">{editingEvent ? "Edit Event" : "Add New Event"}</h2>
                            <button onClick={() => setFormOpen(false)} className="text-slate-400 hover:text-slate-700">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Event Name *</label>
                                <input required value={form.event_name} onChange={(e) => setForm((p) => ({ ...p, event_name: e.target.value }))}
                                    className="w-full h-11 border-2 border-slate-200 rounded-xl px-4 focus:border-[#13ecc8] focus:ring-2 focus:ring-[#13ecc8]/20 outline-none transition-all"
                                    placeholder="e.g. Chithirai Festival 2025" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Event Type *</label>
                                    <select required value={form.event_type} onChange={(e) => setForm((p) => ({ ...p, event_type: e.target.value }))}
                                        className="w-full h-11 border-2 border-slate-200 rounded-xl px-4 focus:border-[#13ecc8] outline-none capitalize appearance-none">
                                        {EVENT_TYPES.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Expected Crowd *</label>
                                    <input required type="number" min="1" value={form.expected_crowd_size}
                                        onChange={(e) => setForm((p) => ({ ...p, expected_crowd_size: e.target.value }))}
                                        className="w-full h-11 border-2 border-slate-200 rounded-xl px-4 focus:border-[#13ecc8] outline-none" placeholder="5000" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Location Name *</label>
                                <input required value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                                    className="w-full h-11 border-2 border-slate-200 rounded-xl px-4 focus:border-[#13ecc8] outline-none"
                                    placeholder="e.g. Meenakshi Amman Temple, Madurai" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Latitude *</label>
                                    <input required type="number" step="any" value={form.latitude}
                                        onChange={(e) => setForm((p) => ({ ...p, latitude: parseFloat(e.target.value) }))}
                                        className="w-full h-11 border-2 border-slate-200 rounded-xl px-4 focus:border-[#13ecc8] outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Longitude *</label>
                                    <input required type="number" step="any" value={form.longitude}
                                        onChange={(e) => setForm((p) => ({ ...p, longitude: parseFloat(e.target.value) }))}
                                        className="w-full h-11 border-2 border-slate-200 rounded-xl px-4 focus:border-[#13ecc8] outline-none" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Start Date *</label>
                                    <input required type="date" value={form.start_date}
                                        onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
                                        className="w-full h-11 border-2 border-slate-200 rounded-xl px-4 focus:border-[#13ecc8] outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">End Date *</label>
                                    <input required type="date" value={form.end_date}
                                        onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))}
                                        className="w-full h-11 border-2 border-slate-200 rounded-xl px-4 focus:border-[#13ecc8] outline-none" />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setFormOpen(false)}
                                    className="flex-1 h-11 rounded-xl border-2 border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                                    Cancel
                                </button>
                                <button type="submit"
                                    className="flex-[2] h-11 rounded-xl bg-[#13ecc8] text-[#0d1b19] font-extrabold hover:opacity-90 transition-opacity shadow-lg shadow-[#13ecc8]/20">
                                    {editingEvent ? "Save Changes" : "Add Event"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}
