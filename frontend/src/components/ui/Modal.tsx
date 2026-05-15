import React, { useEffect } from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  className?: string;
  hideClose?: boolean;
}

export const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  children, 
  title, 
  className = "max-w-md",
  hideClose = false
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Content */}
      <div 
        className={`
          relative w-full glass-card rounded-[2rem] shadow-2xl p-6 lg:p-8 
          border border-white/60 animate-in zoom-in-95 fade-in slide-in-from-bottom-8 duration-300
          ${className}
        `}
      >
        {!hideClose && (
          <button 
            onClick={onClose}
            className="absolute top-5 right-5 p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        
        {title && (
          <h2 className="text-xl font-bold text-slate-800 mb-4">{title}</h2>
        )}
        
        {children}
      </div>
    </div>
  );
};
