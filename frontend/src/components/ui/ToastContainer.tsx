import React from "react";
import { useToastStore, type ToastType } from "../../store/useToastStore";
import { 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  X, 
  AlertTriangle 
} from "lucide-react";

const icons: Record<ToastType, React.ElementType> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const styles: Record<ToastType, string> = {
  success: "border-emerald-500/50 bg-emerald-500/10 text-emerald-700",
  error: "border-red-500/50 bg-red-500/10 text-red-700",
  info: "border-blue-500/50 bg-blue-500/10 text-blue-700",
  warning: "border-amber-500/50 bg-amber-500/10 text-amber-700",
};

export const ToastContainer = () => {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
      {toasts.map((toast) => {
        const Icon = icons[toast.type];
        
        return (
          <div
            key={toast.id}
            className={`
              pointer-events-auto flex items-center justify-between gap-4 p-4 rounded-2xl 
              backdrop-blur-md border shadow-lg animate-in fade-in slide-in-from-right-8 duration-300
              ${styles[toast.type]}
            `}
          >
            <div className="flex items-center gap-3">
              <Icon className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-bold leading-tight">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 hover:bg-black/5 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 opacity-50" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
