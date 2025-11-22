import React, { useState, useEffect, useCallback, useRef } from 'react';
import { generateMetadataBatch, BatchInput } from './services/geminiService';
import { InputArea } from './components/InputArea';
import { ResultsTable } from './components/ResultsTable';
import { AppState, MetadataItem } from './types';

// Helper to escape CSV fields
const escapeCsv = (str: string) => {
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.INPUT);
  const [promptsText, setPromptsText] = useState('');
  const [filenamesText, setFilenamesText] = useState('');
  const [items, setItems] = useState<MetadataItem[]>([]);
  
  // Config for Batch Processing
  const BATCH_SIZE = 5; // Number of images per API call
  const MAX_CONCURRENT_BATCHES = 4; // Number of parallel API calls
  
  // Track active batches to prevent race conditions in the effect loop
  const activeBatchIds = useRef<Set<string>>(new Set());

  const promptLines = promptsText.split('\n').filter(line => line.trim() !== '');
  const fileLines = filenamesText.split('\n').filter(line => line.trim() !== '');
  
  const isValid = promptLines.length > 0 && promptLines.length === fileLines.length;

  const handleStartProcessing = () => {
    if (!isValid) return;

    const newItems: MetadataItem[] = promptLines.map((prompt, index) => ({
      id: `item-${index}`,
      filename: fileLines[index].trim(),
      originalPrompt: prompt.trim(),
      title: '',
      keywords: '',
      category: '',
      status: 'pending',
    }));

    setItems(newItems);
    activeBatchIds.current.clear();
    setAppState(AppState.PROCESSING);
  };

  const processBatch = useCallback(async () => {
    if (appState !== AppState.PROCESSING) return;

    // Calculate current load based on status
    const processingCount = items.filter(i => i.status === 'processing').length;
    
    // If we have capacity
    if (processingCount < MAX_CONCURRENT_BATCHES * BATCH_SIZE) {
      // Find pending items that aren't already tracked in our ref (double safety)
      const pendingItems = items.filter(i => i.status === 'pending' && !activeBatchIds.current.has(i.id));
      
      if (pendingItems.length === 0) return;

      // Take the next batch
      const batchToProcess = pendingItems.slice(0, BATCH_SIZE);
      const batchIds = batchToProcess.map(i => i.id);

      // 1. Mark as tracked immediately to prevent other loops picking them up
      batchIds.forEach(id => activeBatchIds.current.add(id));

      // 2. Update UI state to processing
      setItems(prev => prev.map(item => 
        batchIds.includes(item.id) 
          ? { ...item, status: 'processing' } 
          : item
      ));

      // 3. Execute API call
      const inputs: BatchInput[] = batchToProcess.map(item => ({
        id: item.id,
        prompt: item.originalPrompt
      }));

      try {
        const results = await generateMetadataBatch(inputs);
        
        setItems(prev => prev.map(item => {
          if (batchIds.includes(item.id)) {
             const result = results.find(r => r.id === item.id);
             if (result) {
               return { ...item, ...result, status: 'completed' };
             } else {
               return { ...item, status: 'error', errorMessage: 'Item missing from batch response' };
             }
          }
          return item;
        }));
      } catch (err: any) {
        setItems(prev => prev.map(item => 
          batchIds.includes(item.id) 
            ? { ...item, status: 'error', errorMessage: err.message || 'Batch failed' } 
            : item
        ));
      } finally {
        // Cleanup tracking
        batchIds.forEach(id => activeBatchIds.current.delete(id));
      }
    }
  }, [items, appState]);

  // Reactive Processing Loop
  // Triggers whenever items change (e.g., a batch finishes) to see if we can start a new one
  useEffect(() => {
    if (appState === AppState.PROCESSING) {
      processBatch();
    }
  }, [items, appState, processBatch]);

  // Completion Check
  useEffect(() => {
    if (appState === AppState.PROCESSING && items.length > 0) {
      const allFinished = items.every(i => i.status === 'completed' || i.status === 'error');
      if (allFinished) {
        setAppState(AppState.REVIEW);
      }
    }
  }, [items, appState]);


  const handleUpdateItem = (id: string, field: keyof MetadataItem, value: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleBulkUpdate = (ids: string[], field: keyof MetadataItem, value: string) => {
    setItems(prev => prev.map(item => ids.includes(item.id) ? { ...item, [field]: value } : item));
  };

  const handleDownloadCsv = () => {
    const header = ['Filename', 'Title', 'Keywords', 'Category'];
    const rows = items.map(item => [
      escapeCsv(item.filename),
      escapeCsv(item.title),
      escapeCsv(item.keywords),
      escapeCsv(item.category)
    ]);

    const csvContent = [
      header.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'adobe_stock_metadata.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const progress = items.length > 0 
    ? (items.filter(i => i.status === 'completed' || i.status === 'error').length / items.length) * 100 
    : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 p-6 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
              Adobe Stock Metadata Generator
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Batch process prompts to CSV | Powered by Gemini 2.5 Flash
            </p>
          </div>
          {appState !== AppState.INPUT && (
             <button 
               onClick={() => setAppState(AppState.INPUT)}
               className="text-sm text-slate-400 hover:text-white underline"
             >
               Start Over
             </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-6 flex flex-col gap-6">
        
        {/* Input Phase */}
        {appState === AppState.INPUT && (
          <div className="flex-1 flex flex-col gap-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[60vh]">
              <InputArea 
                label="Prompts (Visual Descriptions)" 
                value={promptsText} 
                onChange={setPromptsText}
                placeholder="Paste your image descriptions here, one per line..."
                count={promptLines.length}
              />
              <InputArea 
                label="Filenames" 
                value={filenamesText} 
                onChange={setFilenamesText}
                placeholder="Paste filenames (e.g., 2031_x9.jpg) here, one per line..."
                count={fileLines.length}
              />
            </div>
            
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-slate-400 text-sm">
                {!isValid ? (
                  <span className="text-amber-400 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    Line counts must match and not be empty. ({promptLines.length} prompts vs {fileLines.length} files)
                  </span>
                ) : (
                  <span className="text-emerald-400 flex items-center gap-2">
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                     Ready to process {promptLines.length} images.
                  </span>
                )}
              </div>
              <button
                disabled={!isValid}
                onClick={handleStartProcessing}
                className={`px-8 py-3 rounded-lg font-semibold text-white shadow-lg transition-all transform active:scale-95 flex items-center gap-2
                  ${!isValid 
                    ? 'bg-slate-700 cursor-not-allowed opacity-50' 
                    : 'bg-blue-600 hover:bg-blue-500 hover:shadow-blue-500/20'
                  }`}
              >
                Start Batch Generation (High Speed)
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </button>
            </div>
          </div>
        )}

        {/* Processing & Review Phase */}
        {(appState === AppState.PROCESSING || appState === AppState.REVIEW) && (
          <div className="flex-1 flex flex-col gap-4">
             {/* Status Bar */}
             <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 flex justify-between items-center sticky top-0 z-20 shadow-md">
                <div className="flex items-center gap-4 w-1/2">
                   <div className="text-sm font-medium text-slate-300 whitespace-nowrap flex items-center gap-2">
                     Progress: {Math.round(progress)}%
                     {appState === AppState.PROCESSING && (
                       <span className="text-xs text-slate-500 font-normal">(Batch Processing)</span>
                     )}
                   </div>
                   <div className="w-full bg-slate-700 rounded-full h-2.5 overflow-hidden">
                     <div 
                        className="bg-gradient-to-r from-blue-500 to-emerald-400 h-2.5 rounded-full transition-all duration-300" 
                        style={{ width: `${progress}%` }}
                     ></div>
                   </div>
                </div>
                <div>
                  <button
                    onClick={handleDownloadCsv}
                    // Enabled as long as there are items in the list
                    disabled={items.length === 0}
                    className={`px-6 py-2 rounded-lg font-semibold text-white text-sm flex items-center gap-2 transition-all
                      ${items.length === 0
                        ? 'bg-slate-700 opacity-50 cursor-not-allowed' 
                        : 'bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-500/20'
                      }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Download CSV
                  </button>
                </div>
             </div>

             <ResultsTable 
                items={items} 
                onUpdate={handleUpdateItem} 
                onBulkUpdate={handleBulkUpdate} 
             />
          </div>
        )}

      </main>
    </div>
  );
};

export default App;