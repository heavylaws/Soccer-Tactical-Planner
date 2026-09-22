import React, { useState } from 'react';
import { StickyNote, X, Check } from 'lucide-react';

interface QuickNoteDialogProps {
  isOpen: boolean;
  coords: { x: number; y: number } | null;
  authorName: string;
  onSave: (text: string) => void;
  onClose: () => void;
}

export const QuickNoteDialog: React.FC<QuickNoteDialogProps> = ({
  isOpen,
  coords,
  authorName,
  onSave,
  onClose,
}) => {
  const [text, setText] = useState('');

  if (!isOpen || !coords) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSave(text.trim());
    setText('');
    onClose();
  };

  return (
    <div
      id="quick-note-dialog-backdrop"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div
        id="quick-note-dialog-card"
        className="w-full max-w-sm bg-[#0D1826] border border-[#1F334A] rounded-2xl p-4 shadow-2xl flex flex-col gap-3 text-white"
      >
        <div className="flex items-center justify-between border-b border-[#1A2C40] pb-2">
          <div className="flex items-center gap-2">
            <StickyNote className="w-4 h-4 text-[#FFD600]" />
            <h4 className="text-sm font-bold text-white">Pin Tactical Coaching Note</h4>
          </div>
          <button
            id="quick-note-close-btn"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-[#1A2C40]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <textarea
            id="quick-note-textarea"
            autoFocus
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. 'Press trigger when pivot turns back', 'Early near-post run'..."
            className="w-full bg-[#132338] border border-[#223953] focus:border-[#FFD600] rounded-xl p-2.5 text-xs text-white placeholder-gray-500 focus:outline-none resize-none"
          />

          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-400">By {authorName}</span>
            <div className="flex items-center gap-2">
              <button
                id="quick-note-cancel-btn"
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                id="quick-note-save-btn"
                type="submit"
                disabled={!text.trim()}
                className="px-4 py-1.5 bg-[#FFD600] hover:bg-[#FFE082] text-[#0A131F] font-bold text-xs rounded-lg transition-colors disabled:opacity-40 flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Pin Note</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
