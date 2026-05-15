import React from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, MessageSquare, Send, User, MessageCircle } from "lucide-react";
import { cn } from "../../lib/utils";
import { useChatStore } from "../../store/useChatStore";

interface BottomNavItemProps {
  to?: string;
  icon: React.ElementType;
  label: string;
  action?: () => void;
}

const BottomNavItem: React.FC<BottomNavItemProps> = ({ to, icon: Icon, label, action }) => {
  if (action) {
    return (
      <button
        onClick={action}
        className="flex flex-col items-center justify-center gap-1 flex-1 transition-all duration-300 text-slate-400 hover:text-blue-600"
      >
        <div className="p-1 rounded-xl transition-all">
            <Icon className="w-5 h-5 stroke-2" />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      </button>
    );
  }

  return (
    <NavLink
      to={to!}
      className={({ isActive }) =>
        cn(
          "flex flex-col items-center justify-center gap-1 flex-1 transition-all duration-300 relative",
          isActive ? "text-blue-600 scale-110" : "text-slate-400"
        )
      }
    >
      {({ isActive }) => (
        <>
          <div className={cn(
              "p-1 rounded-xl transition-all",
              isActive ? "bg-blue-50" : ""
          )}>
              <Icon className={cn("w-5 h-5", isActive ? "stroke-[2.5px]" : "stroke-2")} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
          {isActive && (
            <div className="absolute -top-1 w-1 h-1 bg-blue-600 rounded-full" />
          )}
        </>
      )}
    </NavLink>
  );
};

export const BottomNav: React.FC<{ role: "admin" | "client" }> = ({ role }) => {
  const openChat = () => useChatStore.getState().setIsPaneOpen(true);

  const items = role === "admin" 
    ? [
        { to: "/admin/dashboard", icon: LayoutDashboard, label: "Home" },
        { to: "/admin/clients", icon: MessageSquare, label: "Users" },
        { action: openChat, icon: MessageCircle, label: "Messagerie" },
        { to: "/admin/senders", icon: Send, label: "IDs" },
        { to: "/admin/profile", icon: User, label: "Moi" },
      ]
    : [
        { to: "/client/dashboard", icon: LayoutDashboard, label: "Home" },
        { to: "/client/campaigns", icon: Send, label: "Sms" },
        { action: openChat, icon: MessageCircle, label: "Messagerie" },
        { to: "/client/contacts", icon: MessageSquare, label: "Contacts" },
        { to: "/client/profile", icon: User, label: "Moi" },
      ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-md border-t border-slate-200 z-[100] transition-all animate-slide-up pb-safe">
      <div className="flex items-center justify-around gap-1 px-2 py-2">
        {items.map((item, idx) => (
          <BottomNavItem key={item.to || item.label + idx} {...item} />
        ))}
      </div>
    </nav>
  );
};
