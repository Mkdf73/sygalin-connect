import React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "../../lib/utils";
import {
  Send,
  X
} from "lucide-react";

interface SidebarItem {
  icon: React.ElementType;
  label: string;
  href?: string;
  action?: () => void;
}

interface SidebarProps {
  items: SidebarItem[];
  role: "Sygalin Admin" | "Espace Client";
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ items, role, isOpen, onClose }) => {
  const location = useLocation();

  return (
    <>
      {/* Fond sombre (Mobile) */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar principale */}
      <div className={cn(
        "w-64 h-screen fixed top-0 left-0 flex flex-col glass border-r z-50 transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="p-6 flex items-center justify-center border-b border-slate-200/50 relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-lg lg:hidden transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-xl shadow-lg flex items-center justify-center">
              <Send className="text-white w-5 h-5" />
            </div>
            <h1 className="font-bold text-xl tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              SYGALIN
            </h1>
            <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-blue-100 text-blue-700 uppercase tracking-widest">
              {role}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {items.map((item) => {
            if (item.action) {
              return (
                <button
                  key={item.label}
                  onClick={() => {
                    item.action!();
                    if (window.innerWidth < 1024) onClose();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                >
                  <item.icon className="w-5 h-5 text-slate-500" />
                  {item.label}
                </button>
              );
            }

            const isActive = item.href ? location.pathname.startsWith(item.href) : false;
            return (
              <Link
                key={item.href || item.label}
                to={item.href || "#"}
                onClick={() => {
                  if (window.innerWidth < 1024) onClose();
                }}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive ? "text-white" : "text-slate-500")} />
                {item.label}
              </Link>
            );
          })}
        </div>

      </div>
    </>
  );
};
