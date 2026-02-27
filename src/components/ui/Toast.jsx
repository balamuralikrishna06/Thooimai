import { useEffect, useState } from "react";

export function Toast({ message, type = "success", onClose }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  const colors = {
    success: "bg-primary text-navy",
    error: "bg-red-500 text-white",
  };

  return (
    <div
      className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-3 rounded-full shadow-xl font-bold text-sm transition-all duration-300 ${colors[type]} ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
    >
      <span className="material-symbols-outlined text-[18px]">
        {type === "success" ? "check_circle" : "error"}
      </span>
      {message}
    </div>
  );
}
