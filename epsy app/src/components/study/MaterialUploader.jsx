import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Upload, FileText, Image, Type, X, Loader2, Camera, Maximize2, Minimize2, MessageSquare, Plus, GripVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import UpgradePrompt from '@/components/UpgradePrompt';

export default function MaterialUploader({ onMaterialAdded, existingMaterials = [] }) {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const fileInputRef = useRef(null);
  const captureInputRef = useRef(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [limitFeature, setLimitFeature] = useState('');

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    await processFiles(files);
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    await processFiles(files);
  };

  const processFiles = async (files, isCapture = false) => {
    // Check usage limit first
    try {
      const limitCheck = await base44.functions.invoke('checkUsageLimit', {
        feature: 'chat_material_uploads'
      });

      if (!limitCheck.data.allowed) {
        setLimitFeature('chat_material_uploads');
        setShowUpgradePrompt(true);
        return;
      }

      setUploading(true);
      
      for (const file of files) {
        const fileType = file.type.includes('pdf') ? 'pdf' : 
                         file.type.includes('image') ? 'image' : null;
        
        if (!fileType) continue;

        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        
        let extractedContent = '';
        
        const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url,
          json_schema: {
            type: "object",
            properties: {
              content: { type: "string", description: "All text content from the document" }
            }
          }
        });
        
        if (result.status === 'success') {
          extractedContent = result.output?.content || '';
        }

        onMaterialAdded({
          name: file.name,
          type: fileType,
          url: file_url,
          extracted_content: extractedContent,
          isCapture,
          isInitialImage: existingMaterials.length === 0
        });

        // Increment usage counter
        await base44.functions.invoke('incrementUsage', {
          feature: 'chat_material_uploads',
          usageId: limitCheck.data.usageId
        });
      }
      
      setUploading(false);
    } catch (error) {
      console.error('Error processing files:', error);
      setUploading(false);
    }
  };

  const handleCaptureImage = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      await processFiles(files, true);
    }
  };



  const handleTextSubmit = () => {
    if (!textInput.trim()) return;
    
    onMaterialAdded({
      name: `Note - ${new Date().toLocaleDateString()}`,
      type: 'text',
      url: '',
      extracted_content: textInput
    });
    
    setTextInput('');
    setShowTextInput(false);
  };



  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer
          transition-all duration-300 ease-out
          ${isDragging 
            ? 'border-[#191970] bg-[#191970]/5' 
            : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50/50'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-[#E5E4E2] animate-spin" />
            <p className="text-stone-600">Processing your materials...</p>
          </div>
        ) : (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#E5E4E2]/10 to-[#E5E4E2]/5 flex items-center justify-center">
              <Upload className="w-7 h-7 text-[#E5E4E2]" />
            </div>
            <p className="text-stone-800 font-medium mb-1">Drop your learning materials here</p>
            <p className="text-stone-500 text-sm">PDFs, images of textbooks or notes</p>
          </>
        )}
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => captureInputRef.current?.click()}
          className="flex-1 h-12 rounded-xl border-stone-200 hover:bg-stone-50"
        >
          <Camera className="w-4 h-4 mr-2" />
          Capture Image
        </Button>
        <Button
          variant="outline"
          onClick={() => setShowTextInput(!showTextInput)}
          className="flex-1 h-12 rounded-xl border-stone-200 hover:bg-stone-50"
        >
          <Type className="w-4 h-4 mr-2" />
          Add Text Notes
        </Button>
      </div>
      
      <input
        ref={captureInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCaptureImage}
        className="hidden"
      />

      <AnimatePresence>
        {showTextInput && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="p-4 border-stone-200">
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Paste or type your notes here..."
                className="w-full h-32 p-3 text-sm border border-stone-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#E5E4E2]/20 focus:border-[#E5E4E2]"
              />
              <div className="flex justify-end gap-2 mt-3">
                <Button variant="ghost" onClick={() => setShowTextInput(false)}>
                  Cancel
                </Button>
                <Button onClick={handleTextSubmit} className="bg-[#E5E4E2] hover:bg-[#E5E4E2]/90 text-stone-800 font-semibold">
                  Add Notes
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {existingMaterials.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">Uploaded Materials</p>
          {existingMaterials.map((material, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl">
              <span className="font-semibold text-stone-600 text-sm">#{idx + 1}</span>
              {material.type === 'pdf' && <FileText className="w-5 h-5 text-red-500" />}
              {material.type === 'image' && <Image className="w-5 h-5 text-blue-500" />}
              {material.type === 'text' && <Type className="w-5 h-5 text-green-500" />}
              <span className="text-sm text-stone-700 truncate flex-1">{material.name}</span>
            </div>
          ))}
        </div>
      )}

      <UpgradePrompt
        open={showUpgradePrompt}
        onOpenChange={setShowUpgradePrompt}
        feature={limitFeature}
      />
    </div>
  );
}