import React from "react";
import { Modal } from "./Modal";
import { AlertTriangle } from "lucide-react";
import { Button } from "./Button";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "primary";
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "Confirmer", 
  cancelText = "Annuler",
  variant = "primary"
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md p-0 overflow-hidden">
      <div className="p-6 lg:p-8">
        <div className="flex items-center gap-4 mb-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
            variant === "danger" ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
          }`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">{title}</h3>
        </div>
        
        <p className="text-slate-600 leading-relaxed mb-8">
          {message}
        </p>
        
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={onClose} 
            className="flex-1 border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            {cancelText}
          </Button>
          <Button 
            onClick={() => {
              onConfirm();
              onClose();
            }} 
            className={`flex-1 ${
              variant === "danger" ? "bg-red-600 hover:bg-red-700 text-white" : ""
            }`}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
