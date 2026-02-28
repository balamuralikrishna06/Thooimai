export function Badge({ variant = "default", children, className = "" }) {
  const variants = {
    default: "bg-slate-100 text-slate-600 border border-slate-200",
    reported: "bg-slate-100 text-slate-600 border border-slate-200",
    assigned: "bg-blue-50 text-blue-600 border border-blue-100",
    "in progress": "bg-primary/20 text-teal-700 border border-primary/20",
    resolved: "bg-primary text-navy border border-primary",
    completed: "bg-green-100 text-green-700 border border-green-200",
    high: "bg-red-50 text-red-700 border border-red-100",
    medium: "bg-teal-50 text-teal-700 border border-teal-100",
    low: "bg-slate-50 text-slate-600 border border-slate-200",
  };
  const style = variants[variant.toLowerCase()] || variants.default;
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${style} ${className}`}>
      {children}
    </span>
  );
}
