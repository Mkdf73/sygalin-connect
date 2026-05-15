import React from "react";
import { Modal } from "./Modal";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "./Button";

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  buttonText?: string;
  onAction?: () => void;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  buttonText = "Continuer",
  onAction 
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} hideClose className="max-w-md text-center py-10 px-8">
      <div className="flex flex-col items-center gap-6">
        {/* Animated Checkmark Circle */}
        <div className="relative">
          <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl scale-125 animate-pulse" />
          <div className="relative w-20 h-20 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20 animate-in zoom-in-50 duration-500">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h2>
          <p className="text-slate-500 leading-relaxed px-4">{message}</p>
        </div>

        <Button 
          onClick={onAction || onClose}
          className="w-full mt-4 h-12 text-base group"
        >
          {buttonText}
          <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>
    </Modal>
  );
};
