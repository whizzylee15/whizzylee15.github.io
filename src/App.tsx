import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Upload, 
  Plus, 
  Trash2, 
  Download, 
  Link as LinkIcon, 
  AlertCircle, 
  Layers, 
  Check, 
  ChevronRight, 
  Info,
  GripHorizontal,
  Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import JSZip from 'jszip';
import axios from 'axios';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Sticker, PackMetadata } from './types.ts';

const MAX_PER_PACK = 30;

// Sortable Item Component
const SortableSticker = ({ 
  sticker, 
  index, 
  onRemove,
}: { 
  sticker: Sticker; 
  index: number; 
  onRemove: (id: string) => void;
  key?: React.Key;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: sticker.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : (isHovered ? 60 : 1),
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`aspect-square rounded-xl flex items-center justify-center relative group border transition-all ${
        isDragging ? 'shadow-2xl scale-105 border-white/40 ring-2 ring-blue-500/50' : ''
      } ${
        index >= 30 ? 'bg-blue-600/10 border-blue-500/30' : 'bg-white/5 border-white/5'
      } ${isHovered && !isDragging ? 'bg-white/10 ring-1 ring-white/20' : ''}`}
    >
      <div 
        {...attributes} 
        {...listeners}
        className="absolute top-1 right-2 p-1 text-white/20 hover:text-white/60 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripHorizontal size={14} />
      </div>

      <img 
        src={sticker.url} 
        className="max-w-[70%] max-h-[70%] object-contain pointer-events-none" 
        referrerPolicy="no-referrer" 
      />
      <span className="absolute top-1.5 left-2 text-[10px] text-white/30 font-bold">{index + 1}</span>
      
      {sticker.isAnimated && (
        <div className="absolute top-1.5 right-6 bg-blue-500/20 text-blue-400 p-0.5 rounded shadow-sm" title="Animated Sticker">
          <Play size={8} fill="currentColor" />
        </div>
      )}

      {/* Hover Floating Preview */}
      <AnimatePresence>
        {isHovered && !isDragging && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 h-32 glass-panel border border-white/20 rounded-2xl shadow-2xl p-4 flex items-center justify-center pointer-events-none z-[100]"
          >
            <img 
              src={sticker.url} 
              className="w-full h-full object-contain" 
              referrerPolicy="no-referrer" 
            />
            {sticker.isAnimated && (
               <div className="absolute top-2 right-2 flex items-center gap-1">
                 <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                 <span className="text-[8px] font-bold text-blue-400 uppercase tracking-tighter">Preview</span>
               </div>
            )}
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#1e293b] rotate-45 border-r border-b border-white/10" />
          </motion.div>
        )}
      </AnimatePresence>

      <button 
        onClick={(e) => {
          e.stopPropagation();
          onRemove(sticker.id);
        }}
        className="absolute bottom-1 right-1 bg-red-500 rounded-full p-1 opacity-1 group-hover:opacity-100 md:opacity-0 transition-opacity hover:scale-110"
      >
        <Trash2 size={10} />
      </button>
      
      {sticker.emoji && (
        <span className="absolute bottom-1 left-2 text-[10px] opacity-40">{sticker.emoji}</span>
      )}
    </div>
  );
};

export default function App() {
  const [stickers, setStickers] = useState<Sticker[]>(() => {
    const saved = localStorage.getItem('stickerPackItems');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved stickers", e);
      }
    }
    return [];
  });
  const [metadata, setMetadata] = useState<PackMetadata>(() => {
    const saved = localStorage.getItem('stickerPackMetadata');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved metadata", e);
      }
    }
    return {
      title: 'My Sticker Pack',
      author: 'StickerChef'
    };
  });
  const [telegramLink, setTelegramLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isHoveringPreview, setIsHoveringPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // DND Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // minimum distance before drag starts (prevent accidentally dragging on click)
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Auto-Save: Save on change (using functional initialization above for loading)
  useEffect(() => {
    localStorage.setItem('stickerPackMetadata', JSON.stringify(metadata));
    
    // We strip binary 'file' objects before saving to localStorage to keep it under 5MB limit
    const persistentStickers = stickers.map(({ file, ...rest }: any) => rest);
    localStorage.setItem('stickerPackItems', JSON.stringify(persistentStickers));
  }, [metadata, stickers]);

  const handleShare = async () => {
    const shareText = `Check out my new sticker pack "${metadata.title}" by ${metadata.author}! Created with StickerChef.`;
    const shareUrl = window.location.href;
    const shareData = {
      title: metadata.title,
      text: shareText,
      url: shareUrl,
    };

    try {
      // Small check to see if we're in an iframe - share often fails in iframes
      const isInIframe = window.self !== window.top;

      if (navigator.share && !isInIframe) {
        await navigator.share(shareData);
      } else {
        throw new Error('Share API not supported or blocked');
      }
    } catch (err) {
      // Fallback to clipboard for any failure (user cancellation, desktop browser, iframe restriction)
      try {
        await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
        setSuccess('Link copied to clipboard!');
        setError(null);
      } catch (clipboardErr) {
        console.error('Clipboard fallback failed:', clipboardErr);
        setError('Failed to share or copy link.');
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newStickers: Sticker[] = Array.from(files)
      .filter((file: File) => {
        const ext = file.name.split('.').pop()?.toLowerCase();
        return ['webp', 'png', 'jpg', 'jpeg', 'webm', 'tgs'].includes(ext || '');
      })
      .map((file: File) => {
        const ext = file.name.split('.').pop()?.toLowerCase();
        return {
          id: Math.random().toString(36).substr(2, 9),
          url: URL.createObjectURL(file),
          name: file.name,
          file,
          isAnimated: ['webm', 'tgs'].includes(ext || '') || file.type.includes('webp') // Sharp will double check
        };
      });

    setStickers(prev => [...prev, ...newStickers]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeSticker = (id: string) => {
    setStickers(prev => {
      const filtered = prev.filter(s => s.id !== id);
      const removed = prev.find(s => s.id === id);
      if (removed?.url.startsWith('blob:')) {
        URL.revokeObjectURL(removed.url);
      }
      return filtered;
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setStickers((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over?.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const fetchTelegramPack = async () => {
    if (!telegramLink) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Step 1: Resolve Telegram sticker set name from URL
      let nameToFetch = telegramLink;
      if (nameToFetch.includes('t.me/addstickers/')) {
        nameToFetch = nameToFetch.split('t.me/addstickers/')[1].split('/')[0].split('?')[0];
      } else if (nameToFetch.includes('/')) {
        nameToFetch = nameToFetch.split('/').pop() || '';
      }

      const response = await axios.post('/api/telegram/pack', { packName: nameToFetch });
      const packData = response.data;

      // Update metadata from Telegram pack
      setMetadata({
        title: packData.title || nameToFetch,
        author: packData.publisher || 'Telegram Importer'
      });

      const telegramStickers: Sticker[] = packData.stickers.map((s: any) => ({
        id: s.file_id,
        url: `/api/telegram/file?fileId=${s.file_id}`,
        telegramFileId: s.file_id,
        emoji: s.emoji,
        // Detection for animations (Step 1)
        isAnimated: packData.is_animated || packData.is_video || s.is_animated || s.is_video
      }));

      setStickers(prev => [...prev, ...telegramStickers]);
      setSuccess(`Imported ${telegramStickers.length} stickers from Telegram!`);
      setTelegramLink('');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || "Could not find Telegram pack.");
    } finally {
      setLoading(false);
    }
  };

  const generateWastickers = async () => {
    if (stickers.length === 0) return;
    setLoading(true);
    setProgress(0);
    setSuccess(null);
    setError(null);

    try {
      const processedStickers = [];
      const totalSteps = stickers.length;
      
      for (let i = 0; i < stickers.length; i++) {
        const s = stickers[i];
        let buffer_data: any;
        
        if (s.file) {
          buffer_data = s.file;
        } else {
          const resp = await axios.get(s.url, { responseType: 'blob' });
          buffer_data = resp.data;
        }

        const formData = new FormData();
        formData.append('image', buffer_data);
        // Step 2 Margin Rule & Animation Logic: Pass animation flag to Sharp pipeline
        if (s.isAnimated) formData.append('isAnimated', 'true');
        
        const response = await axios.post('/api/sticker/process', formData, {
          responseType: 'blob'
        });

        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onloadend = () => {
            const base64String = (reader.result as string).split(',')[1];
            resolve(base64String);
          };
          reader.readAsDataURL(response.data);
        });

        const base64 = await base64Promise;
        processedStickers.push({
          data: base64,
          emojis: [s.emoji || '✨']
        });

        setProgress(Math.round(((i + 1) / totalSteps) * 100));
      }

      // Step 3: Packaging & The Deep Link
      const bundleResponse = await axios.post('/api/sticker/bundle', {
        title: metadata.title,
        author: metadata.author,
        stickers: processedStickers,
        isAnimatedPack: stickers.some(s => s.isAnimated)
      });

      const bundleData = bundleResponse.data;
      const jsonString = JSON.stringify(bundleData);
      
      // Intent Logic (Step 3): Open WhatsApp Deep Link
      // data query parameter is expected to be base64 encoded contents.json
      const deepLink = `whatsapp://stickerpack/v1/metadata?data=${btoa(unescape(encodeURIComponent(jsonString)))}`;
      
      // Fallback: Download .wastickers bundle
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${metadata.title.replace(/\s+/g, '_')}.wastickers`;
      
      try {
        // Attempt deep link first for "One-Tap"
        if (!/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
          throw new Error('Not mobile');
        }
        window.location.href = deepLink;
        setSuccess("Triggering WhatsApp import...");
        
        setTimeout(() => {
          link.click();
          setSuccess("One-Tap triggered! (Backup file downloaded)");
        }, 1500);
      } catch (e) {
        link.click();
        setSuccess("WA Stickers bundle generated! Open with a Sticker Importer.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to create WhatsApp pack. Try a smaller set?");
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  const generateZip = async () => {
    if (stickers.length === 0) return;
    setLoading(true);
    setProgress(0);
    setSuccess(null);
    setError(null);
    
    try {
      const zip = new JSZip();
      const packsCount = Math.ceil(stickers.length / MAX_PER_PACK);
      const totalSteps = stickers.length + packsCount;
      let currentStep = 0;
      
      for (let i = 0; i < packsCount; i++) {
        const packFolder = zip.folder(`${metadata.title}_Part_${i + 1}`);
        const packStickers = stickers.slice(i * MAX_PER_PACK, (i + 1) * MAX_PER_PACK);
        
        const packInfo = {
          identifier: `${metadata.title.toLowerCase().replace(/\s+/g, '_')}_${i + 1}`,
          name: `${metadata.title} (Part ${i + 1})`,
          publisher: metadata.author,
          tray_image_file: 'tray_icon.webp',
          image_data_version: '1',
          avoid_cache: false,
          stickers: packStickers.map((s, idx) => ({
            image_file: `${idx + 1}.webp`,
            emojis: [s.emoji || '✨']
          }))
        };

        packFolder?.file('info.json', JSON.stringify(packInfo, null, 2));
        currentStep++;
        setProgress(Math.round((currentStep / totalSteps) * 100));

        for (let j = 0; j < packStickers.length; j++) {
          const s = packStickers[j];
          let blob: Blob;

          if (s.file) {
            blob = s.file;
          } else {
            const resp = await axios.get(s.url, { responseType: 'blob' });
            blob = resp.data;
          }
          
          const formData = new FormData();
          formData.append('image', blob);
          const response = await axios.post('/api/sticker/process', formData, { responseType: 'blob' });
          
          packFolder?.file(`${j + 1}.webp`, response.data);
          if (j === 0) packFolder?.file('tray_icon.webp', response.data);
          
          currentStep++;
          setProgress(Math.round((currentStep / totalSteps) * 100));
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `${metadata.title}_Stickers.zip`;
      link.click();
      
      setSuccess(`Exported ${packsCount} bundle(s) successfully!`);
    } catch (err) {
      console.error(err);
      setError("Failed to generate ZIP.");
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  return (
    <div className="w-full h-full md:w-[95vw] md:h-[90vh] md:max-w-7xl glass-panel md:rounded-[24px] flex flex-col shadow-2xl animate-in fade-in zoom-in duration-500 overflow-hidden">
      {/* Header */}
      <header className="p-6 md:px-8 border-b border-white/10 flex items-center justify-between">
        <div className="logo-gradient font-extrabold text-xl tracking-tighter">STICKERCHEF</div>
        
        <div className="flex gap-3 w-[500px]">
          <input 
            type="text" 
            value={telegramLink}
            onChange={e => setTelegramLink(e.target.value)}
            placeholder="t.me/addstickers/PackName"
            className="flex-grow bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
          />
          <button 
            onClick={fetchTelegramPack}
            disabled={loading || !telegramLink}
            className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
          >
            {loading ? '...' : 'Import Pack'}
          </button>
        </div>
        <div className="w-[100px] flex justify-end gap-3 items-center">
          <button 
            onClick={handleShare}
            className="text-white/40 hover:text-white transition-colors"
            title="Share App Link"
          >
            <LinkIcon size={18} />
          </button>
          <input 
            type="file" 
            multiple 
            accept="image/webp,image/png,image/jpeg,video/webm,.tgs"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="text-white/60 hover:text-white transition-colors"
            title="Upload Local Files"
          >
            <Upload size={20} />
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex flex-grow overflow-hidden">
        {/* Sidebar */}
        <aside className="w-[280px] border-r border-white/10 p-8 flex flex-col gap-6 overflow-y-auto relative">
          <div className="relative">
            <motion.div 
              onMouseEnter={() => setIsHoveringPreview(true)}
              onMouseLeave={() => setIsHoveringPreview(false)}
              onClick={() => fileInputRef.current?.click()}
              className="w-[120px] h-[120px] bg-white/10 border-2 border-dashed border-white/20 rounded-[20px] flex items-center justify-center self-center cursor-pointer hover:bg-white/15 transition-all text-4xl overflow-hidden shadow-inner mx-auto group"
            >
              {stickers.length > 0 ? (
                <img src={stickers[0].url} className="w-[80px] h-[80px] object-contain group-hover:scale-110 transition-transform" referrerPolicy="no-referrer" />
              ) : '✨'}
            </motion.div>

            {/* Hover Enlarged Preview */}
            <AnimatePresence>
              {isHoveringPreview && stickers.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, x: 20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8, x: 20 }}
                  className="absolute left-full top-0 ml-4 w-[200px] h-[200px] glass-panel rounded-3xl p-6 z-[100] shadow-2xl pointer-events-none"
                >
                  <img src={stickers[0].url} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-blue-500/5 rounded-3xl" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[11px] uppercase tracking-wider text-white/50 mb-2 block font-medium">Pack Title</label>
              <input 
                type="text" 
                value={metadata.title}
                onChange={e => setMetadata(prev => ({ ...prev, title: e.target.value }))}
                className="bg-transparent border-b border-white/20 text-white py-1 w-full text-lg focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Enter title..."
              />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-white/50 mb-2 block font-medium">Author</label>
              <input 
                type="text" 
                value={metadata.author}
                onChange={e => setMetadata(prev => ({ ...prev, author: e.target.value }))}
                className="bg-transparent border-b border-white/20 text-white py-1 w-full text-lg focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Enter author..."
              />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-white/50 mb-2 block font-bold">Total Stickers</label>
              <div className="text-2xl font-bold flex items-baseline gap-2">
                {stickers.length} 
                <span className="text-sm font-normal opacity-30">/ auto-split {MAX_PER_PACK}</span>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {(error || success) && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`p-3 rounded-xl text-xs font-semibold border ${
                  error ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-green-500/10 border-green-500/30 text-green-400'
                }`}
              >
                {error || success}
              </motion.div>
            )}
          </AnimatePresence>

          {stickers.length > 30 && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-200/80 leading-relaxed italic">
              ⚠️ <strong>Auto-Split:</strong> Since your pack exceeds 30 stickers, it will be split into multiple sub-packs for WhatsApp compatibility.
            </div>
          )}

          <div className="mt-auto space-y-4">
             {loading && progress > 0 && (
               <div className="space-y-2">
                 <div className="flex justify-between text-[10px] uppercase font-bold text-white/40">
                   <span>Bundling...</span>
                   <span>{progress}%</span>
                 </div>
                 <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                   <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-[#10b981] transition-all" 
                   />
                 </div>
               </div>
             )}
             <button 
              onClick={() => {
                if (confirm('Clear all stickers and metadata?')) {
                  setStickers([]);
                  localStorage.removeItem('stickerPackItems');
                  localStorage.removeItem('stickerPackMetadata');
                }
              }}
              className="w-full text-[10px] text-white/30 hover:text-red-400 uppercase font-black transition-colors"
            >
              Reset All Progress
            </button>
            <div className="space-y-2">
              <button 
                onClick={generateWastickers}
                disabled={loading || stickers.length === 0}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/40 transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
              >
                {loading ? 'OPTIMIZING...' : <><Download size={18} /> ADD TO WHATSAPP</>}
              </button>
              <button 
                onClick={generateZip}
                disabled={loading || stickers.length === 0}
                className="w-full bg-white/5 hover:bg-white/10 text-white/60 font-medium py-3 rounded-xl border border-white/10 transition-all disabled:opacity-50 disabled:grayscale text-sm"
              >
                {loading ? '...' : '.ZIP BUNDLE'}
              </button>
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-grow p-8 overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-bold">Pack Contents</h2>
              <p className="text-xs text-white/50">Drag a sticker to reorder it</p>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs border ${
              stickers.length > 0 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-white/10 text-white/40 border-white/10'
            }`}>
              {stickers.length > 0 ? 'Conversion Ready' : 'Empty Pack'}
            </div>
          </div>

          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-6 gap-4">
              <SortableContext 
                items={stickers.map(s => s.id)}
                strategy={rectSortingStrategy}
              >
                <AnimatePresence>
                  {stickers.map((sticker, idx) => (
                    <SortableSticker 
                      key={sticker.id} 
                      sticker={sticker} 
                      index={idx} 
                      onRemove={removeSticker} 
                    />
                  ))}
                </AnimatePresence>
              </SortableContext>
              
              {stickers.length === 0 && (
                <div className="col-span-6 h-64 flex flex-col items-center justify-center opacity-20 italic">
                  <Layers size={48} className="mb-2" />
                  <p>Add stickers to begin</p>
                </div>
              )}
            </div>
          </DndContext>
        </main>
      </div>
    </div>
  );
}
