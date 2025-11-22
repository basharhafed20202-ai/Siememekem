import React, { useState, useMemo } from 'react';
import { MetadataItem, ADOBE_CATEGORIES } from '../types';

interface ResultsTableProps {
  items: MetadataItem[];
  onUpdate: (id: string, field: keyof MetadataItem, value: string) => void;
  onBulkUpdate: (ids: string[], field: keyof MetadataItem, value: string) => void;
}

export const ResultsTable: React.FC<ResultsTableProps> = ({ items, onUpdate, onBulkUpdate }) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkCategory, setBulkCategory] = useState<string>('');

  const allSelected = items.length > 0 && selectedIds.size === items.length;
  const isIndeterminate = selectedIds.size > 0 && selectedIds.size < items.length;

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(i => i.id)));
    }
  };

  const handleSelectRow = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleApplyBulkCategory = () => {
    if (!bulkCategory || selectedIds.size === 0) return;
    onBulkUpdate(Array.from(selectedIds), 'category', bulkCategory);
    // Optional: Clear selection after apply, or keep it? Keeping it is often better for successive edits.
    setBulkCategory('');
  };

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Bulk Actions Toolbar */}
      <div className={`transition-all duration-300 overflow-hidden ${selectedIds.size > 0 ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="bg-blue-900/20 border border-blue-800/50 rounded-lg p-3 flex items-center gap-4 shadow-sm">
          <div className="text-blue-200 font-medium text-sm pl-2 flex items-center gap-2">
            <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5 font-bold">
              {selectedIds.size}
            </span>
            Selected
          </div>
          <div className="h-4 w-px bg-blue-800/50 mx-2"></div>
          
          <div className="flex items-center gap-3 flex-1">
            <label className="text-blue-300 text-sm whitespace-nowrap">Set Category:</label>
            <select
              className="bg-slate-800 border border-slate-600 text-slate-200 text-sm rounded px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none flex-1 max-w-xs"
              value={bulkCategory}
              onChange={(e) => setBulkCategory(e.target.value)}
            >
              <option value="">Select a category...</option>
              {ADOBE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <button
              onClick={handleApplyBulkCategory}
              disabled={!bulkCategory}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-4 py-1.5 rounded text-sm font-medium transition-colors"
            >
              Apply
            </button>
          </div>
          
          <button 
            onClick={() => setSelectedIds(new Set())}
            className="text-slate-400 hover:text-white text-sm px-3"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 overflow-auto rounded-lg border border-slate-700 bg-slate-900 shadow-inner relative">
        <table className="w-full text-left text-sm text-slate-400">
          <thead className="bg-slate-800 text-xs uppercase text-slate-200 sticky top-0 z-10 shadow-sm">
            <tr>
              <th scope="col" className="w-12 px-4 py-3 text-center">
                <input 
                  type="checkbox" 
                  className="rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-800 cursor-pointer w-4 h-4"
                  checked={allSelected}
                  ref={input => {
                    if (input) input.indeterminate = isIndeterminate;
                  }}
                  onChange={handleSelectAll}
                />
              </th>
              <th scope="col" className="px-6 py-3 font-semibold w-32">Filename</th>
              <th scope="col" className="px-6 py-3 font-semibold w-64">Title</th>
              <th scope="col" className="px-6 py-3 font-semibold">Keywords</th>
              <th scope="col" className="px-6 py-3 font-semibold w-40">Category</th>
              <th scope="col" className="px-6 py-3 font-semibold w-24">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {items.map((item) => {
              const isSelected = selectedIds.has(item.id);
              return (
                <tr 
                  key={item.id} 
                  className={`transition-colors ${isSelected ? 'bg-blue-900/10 hover:bg-blue-900/20' : 'hover:bg-slate-800/50'}`}
                  onClick={(e) => {
                    // Allow clicking row to select, but ignore if interacting with inputs
                    if ((e.target as HTMLElement).tagName !== 'TEXTAREA' && (e.target as HTMLElement).tagName !== 'INPUT') {
                       handleSelectRow(item.id);
                    }
                  }}
                >
                  <td className="px-4 py-4 text-center">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-800 cursor-pointer w-4 h-4"
                      checked={isSelected}
                      onChange={() => handleSelectRow(item.id)}
                    />
                  </td>
                  <td className="px-6 py-4 font-mono text-slate-300 truncate max-w-[150px]" title={item.filename}>
                    {item.filename}
                  </td>
                  <td className="px-6 py-4">
                    {item.status === 'completed' ? (
                      <textarea
                        className={`w-full bg-transparent border-b border-dashed ${isSelected ? 'border-blue-500/50' : 'border-slate-600'} focus:border-blue-500 outline-none resize-none overflow-hidden h-auto text-slate-200`}
                        rows={2}
                        value={item.title}
                        onChange={(e) => onUpdate(item.id, 'title', e.target.value)}
                      />
                    ) : (
                      <span className="text-slate-600 italic">Generating...</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {item.status === 'completed' ? (
                      <textarea
                        className={`w-full bg-transparent border-b border-dashed ${isSelected ? 'border-blue-500/50' : 'border-slate-600'} focus:border-blue-500 outline-none resize-none h-20 text-xs text-slate-400`}
                        value={item.keywords}
                        onChange={(e) => onUpdate(item.id, 'keywords', e.target.value)}
                      />
                    ) : (
                      <div className="h-2 bg-slate-800 rounded animate-pulse w-3/4"></div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {item.status === 'completed' ? (
                       <div className="relative group">
                         <select 
                            value={item.category}
                            onChange={(e) => onUpdate(item.id, 'category', e.target.value)}
                            className="w-full bg-transparent text-xs text-blue-300 border border-blue-900 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500 appearance-none cursor-pointer hover:bg-slate-800"
                         >
                            {ADOBE_CATEGORIES.map(cat => (
                              <option key={cat} value={cat} className="bg-slate-800">{cat}</option>
                            ))}
                         </select>
                         {/* Custom arrow icon could be added here via absolute positioning, using browser default for simplicity */}
                       </div>
                    ) : null}
                  </td>
                  <td className="px-6 py-4">
                    {item.status === 'pending' && <span className="text-slate-500">Pending</span>}
                    {item.status === 'processing' && <span className="text-yellow-500 animate-pulse">Processing</span>}
                    {item.status === 'completed' && <span className="text-green-500">Done</span>}
                    {item.status === 'error' && <span className="text-red-500" title={item.errorMessage}>Error</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};