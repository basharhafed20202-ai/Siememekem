import React, { useRef } from 'react';

interface InputAreaProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  count: number;
}

export const InputArea: React.FC<InputAreaProps> = ({
  label,
  value,
  onChange,
  placeholder,
  count,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        onChange(text);
      };
      reader.readAsText(file);
    }
    // Reset input to allow re-uploading same file
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-800 rounded-xl p-4 border border-slate-700 shadow-lg">
      <div className="flex justify-between items-center mb-3">
        <label className="text-slate-200 font-semibold flex items-center gap-2">
          {label}
          <span className="text-xs bg-slate-600 px-2 py-0.5 rounded-full text-slate-100">
            {count} lines
          </span>
        </label>
        <div>
          <input
            type="file"
            accept=".txt,.csv"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-xs bg-slate-700 hover:bg-slate-600 text-blue-300 py-1 px-3 rounded transition-colors border border-slate-600"
          >
            Load File (.txt)
          </button>
        </div>
      </div>
      <textarea
        className="flex-1 w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none font-mono"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
      />
    </div>
  );
};