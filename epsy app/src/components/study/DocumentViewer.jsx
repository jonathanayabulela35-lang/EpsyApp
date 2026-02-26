import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { X, ZoomIn, ZoomOut, Copy, FileText, Image, Type, Maximize2, RotateCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function DocumentViewer({ materials }) {
  const [fullscreenMaterial, setFullscreenMaterial] = useState(null);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [headerVisible, setHeaderVisible] = useState(true);
  const contentRef = useRef(null);

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  const handleCopy = async () => {
    if (fullscreenMaterial?.extracted_content) {
      await navigator.clipboard.writeText(fullscreenMaterial.extracted_content);
      toast.success('Content copied to clipboard');
    }
  };

  const handleCopySelection = async () => {
    const selection = window.getSelection()?.toString();
    if (selection) {
      await navigator.clipboard.writeText(selection);
      toast.success('Selection copied');
    }
  };

  const openFullscreen = (material) => {
    setFullscreenMaterial(material);
    setScale(1);
    setRotation(0);
    setHeaderVisible(true);
  };

  const closeFullscreen = () => {
    setFullscreenMaterial(null);
    setScale(1);
    setRotation(0);
    setHeaderVisible(true);
  };

  const toggleHeader = () => {
    setHeaderVisible(prev => !prev);
  };

  const getIcon = (type) => {
    if (type === 'pdf') return <FileText className="w-4 h-4 text-red-500" />;
    if (type === 'image') return <Image className="w-4 h-4 text-blue-500" />;
    return <Type className="w-4 h-4 text-green-500" />;
  };

  if (!materials || materials.length === 0) return null;

  return (
    <>
      {/* Material Cards */}
      <div className="px-4 py-3 border-b border-stone-100 bg-stone-50/50">
        <p className="text-xs text-stone-500 mb-2 font-medium">Your Materials</p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {materials.map((material, idx) => (
            <button
              key={idx}
              onClick={() => openFullscreen(material)}
              className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-stone-200 hover:border-[#E5E4E2]/30 hover:bg-[#E5E4E2]/5 transition-all min-w-fit group"
            >
              <div className="flex items-center justify-center px-1.5 py-0.5 rounded bg-stone-100">
                <span className="font-semibold text-stone-600 text-xs">#{material.number || idx + 1}</span>
              </div>
              {getIcon(material.type)}
              <span className="text-sm text-stone-700 truncate max-w-[120px]">{material.name}</span>
              <Maximize2 className="w-3 h-3 text-stone-400 group-hover:text-[#E5E4E2]" />
            </button>
          ))}
        </div>
      </div>

      {/* Fullscreen Modal */}
      <AnimatePresence>
        {fullscreenMaterial && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex flex-col"
          >
            {/* Header */}
            <AnimatePresence>
            {headerVisible && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-between p-4 bg-black/50 backdrop-blur-sm"
            >
              <div className="flex items-center gap-3">
                {getIcon(fullscreenMaterial.type)}
                <span className="text-white font-medium truncate max-w-[150px] sm:max-w-none">{fullscreenMaterial.name}</span>
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleZoomOut}
                  className="text-white hover:bg-white/20 rounded-full h-9 w-9 sm:h-10 sm:w-10"
                >
                  <ZoomOut className="w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
                <span className="text-white/70 text-xs sm:text-sm min-w-[40px] sm:min-w-[50px] text-center">{Math.round(scale * 100)}%</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleZoomIn}
                  className="text-white hover:bg-white/20 rounded-full h-9 w-9 sm:h-10 sm:w-10"
                >
                  <ZoomIn className="w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRotate}
                  className="text-white hover:bg-white/20 rounded-full ml-1 sm:ml-2 h-9 w-9 sm:h-10 sm:w-10"
                >
                  <RotateCw className="w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCopy}
                  className="text-white hover:bg-white/20 rounded-full ml-1 sm:ml-2 h-9 w-9 sm:h-10 sm:w-10"
                >
                  <Copy className="w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={closeFullscreen}
                  className="text-white hover:bg-white/20 rounded-full ml-2 sm:ml-4 h-9 w-9 sm:h-10 sm:w-10"
                  title="Close"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
                </Button>
              </div>
            </motion.div>
            )}
            </AnimatePresence>

            {/* Content */}
            <div 
              className="flex-1 overflow-auto p-4 touch-pinch-zoom flex items-center justify-center"
              style={{ touchAction: 'pan-x pan-y pinch-zoom' }}
              onClick={toggleHeader}
            >
              <div
                ref={contentRef}
                onDoubleClick={handleCopySelection}
                className="w-full h-full flex items-center justify-center"
                style={{ 
                  transform: `rotate(${rotation}deg) scale(${scale})`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.2s ease-out'
                }}
              >
                {fullscreenMaterial.type === 'image' && fullscreenMaterial.url ? (
                  <img 
                    src={fullscreenMaterial.url} 
                    alt={fullscreenMaterial.name}
                    className="rounded-lg select-all"
                    draggable={false}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      width: 'auto',
                      height: 'auto',
                      objectFit: 'contain'
                    }}
                  />
                ) : (
                  <div className="bg-white rounded-xl p-6 max-w-3xl w-full shadow-2xl">
                    <pre className="whitespace-pre-wrap font-sans text-stone-800 text-sm leading-relaxed select-text">
                      {fullscreenMaterial.extracted_content || 'No content available'}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            {/* Footer hint */}
            <AnimatePresence>
            {headerVisible && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
              className="p-3 bg-black/50 backdrop-blur-sm text-center"
            >
              <p className="text-white/50 text-xs">Pinch to zoom • Tap content to toggle controls</p>
            </motion.div>
            )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}