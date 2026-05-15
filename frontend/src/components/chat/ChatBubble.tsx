import React from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale/fr";

interface ChatBubbleProps {
  content: string;
  timestamp: string;
  isMe: boolean;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ content, timestamp, isMe }) => {
  return (
    <div className={`flex w-full mb-4 ${isMe ? "justify-end bubble-me" : "justify-start bubble-other"}`}>
      <div
        className={`max-w-[85%] md:max-w-[75%] px-4 py-2.5 rounded-2xl shadow-sm transition-all hover:shadow-md ${
          isMe
            ? "bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-tr-none"
            : "bg-white border border-slate-100 text-slate-800 rounded-tl-none"
        }`}
      >
        <p className="text-[13px] md:text-[15px] leading-relaxed break-words whitespace-pre-wrap font-medium">{content}</p>
        <div
          className={`text-[9px] mt-1.5 font-bold uppercase tracking-tighter opacity-70 flex items-center gap-1 ${
            isMe ? "justify-end" : "justify-start"
          }`}
        >
          {format(new Date(timestamp), "HH:mm", { locale: fr })}
          {isMe && <span className="w-1 h-1 bg-white/50 rounded-full"></span>}
        </div>
      </div>
    </div>
  );
};
