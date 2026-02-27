export function Button({ variant = "primary", size = "md", children, className = "", ...props }) {
  const base = "inline-flex items-center justify-center font-bold rounded-xl transition-all focus:outline-none";
  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-5 text-sm",
    lg: "h-14 px-8 text-lg",
  };
  const variants = {
    primary: "bg-primary text-navy shadow-sm hover:opacity-90 hover:scale-[1.01] active:scale-95",
    secondary: "border-2 border-slate-200 text-navy hover:bg-slate-50 active:scale-95",
    ghost: "text-muted hover:text-primary hover:bg-primary/10",
    danger: "bg-red-500 text-white hover:opacity-90",
  };
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
