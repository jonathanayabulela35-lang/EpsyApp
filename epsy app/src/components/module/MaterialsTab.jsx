import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Plus, Upload, Camera, Grid3x3, List, FolderOpen, FileText, Image as ImageIcon, File, MoreVertical, Trash2, Edit2, StickyNote, X, ZoomIn, ZoomOut, RotateCw, Maximize2 } from 'lucide-react';
import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import UpgradePrompt from '@/components/UpgradePrompt';

export default function MaterialsTab({ moduleName }) {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState('list');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedMaterials, setSelectedMaterials] = useState([]);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [bundleDialogOpen, setBundleDialogOpen] = useState(false);
  const [bundleName, setBundleName] = useState('');
  const [pressTimer, setPressTimer] = useState(null);
  const [viewingMaterial, setViewingMaterial] = useState(null);
  const [renamingMaterial, setRenamingMaterial] = useState(null);
  const [newMaterialName, setNewMaterialName] = useState('');
  const [notesPanelOpen, setNotesPanelOpen] = useState(false);
  const [notes, setNotes] = useState([]);
  const [currentNote, setCurrentNote] = useState(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [imageZoom, setImageZoom] = useState(100);
  const [imageRotation, setImageRotation] = useState(0);
  const [showViewerControls, setShowViewerControls] = useState(true);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [limitFeature, setLimitFeature] = useState('');

  const { data: materials = [], isLoading: materialsLoading } = useQuery({
    queryKey: ['materials', moduleName],
    queryFn: () => base44.entities.Material.filter({ module_name: moduleName }),
    staleTime: 30000,
    placeholderData: (previousData) => previousData,
  });

  const { data: bundles = [] } = useQuery({
    queryKey: ['bundles', moduleName],
    queryFn: () => base44.entities.MaterialBundle.filter({ module_name: moduleName }),
    staleTime: 30000,
    placeholderData: (previousData) => previousData,
  });

  const { data: moduleData } = useQuery({
    queryKey: ['module-data', moduleName],
    queryFn: async () => {
      const results = await base44.entities.Module.filter({ name: moduleName });
      return results[0];
    },
  });

  React.useEffect(() => {
    if (moduleData?.notes) {
      try {
        setNotes(JSON.parse(moduleData.notes));
      } catch {
        setNotes([]);
      }
    }
  }, [moduleData]);

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      // Check usage limit first
      const limitCheck = await base44.functions.invoke('checkUsageLimit', {
        feature: 'module_material_uploads'
      });

      if (!limitCheck.data.allowed) {
        throw new Error('LIMIT_REACHED');
      }

      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      let extracted_content = '';
      if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
        const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url,
          json_schema: {
            type: 'object',
            properties: {
              text: { type: 'string' }
            }
          }
        });
        if (extractResult.status === 'success' && extractResult.output?.text) {
          extracted_content = extractResult.output.text;
        }
      }

      const material = await base44.entities.Material.create({
        module_name: moduleName,
        name: file.name,
        type: file.type.startsWith('image/') ? 'image' : file.type === 'application/pdf' ? 'pdf' : 'text',
        url: file_url,
        extracted_content
      });

      // Increment usage counter
      await base44.functions.invoke('incrementUsage', {
        feature: 'module_material_uploads',
        usageId: limitCheck.data.usageId
      });

      return material;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials', moduleName] });
      setUploadDialogOpen(false);
    },
    onError: (error) => {
      if (error.message === 'LIMIT_REACHED') {
        setUploadDialogOpen(false);
        setLimitFeature('module_material_uploads');
        setShowUpgradePrompt(true);
      }
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (ids) => Promise.all(ids.map(id => base44.entities.Material.delete(id))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials', moduleName] });
      setSelectedMaterials([]);
      setSelectMode(false);
    },
  });

  const renameMaterialMutation = useMutation({
    mutationFn: ({ id, name }) => base44.entities.Material.update(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials', moduleName] });
      setRenamingMaterial(null);
      setNewMaterialName('');
    },
  });

  const createBundleMutation = useMutation({
    mutationFn: async (data) => {
      const bundle = await base44.entities.MaterialBundle.create(data);
      await Promise.all(selectedMaterials.map(id => 
        base44.entities.Material.update(id, { bundle_id: bundle.id })
      ));
      return bundle;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bundles', moduleName] });
      queryClient.invalidateQueries({ queryKey: ['materials', moduleName] });
      setBundleDialogOpen(false);
      setBundleName('');
      setSelectedMaterials([]);
      setSelectMode(false);
    },
  });

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => uploadMutation.mutate(file));
  };

  const handleCreateBundle = () => {
    if (bundleName.trim()) {
      createBundleMutation.mutate({
        module_name: moduleName,
        name: bundleName,
      });
    }
  };

  const handlePressStart = (materialId) => {
    const timer = setTimeout(() => {
      setSelectMode(true);
      setSelectedMaterials([materialId]);
    }, 500);
    setPressTimer(timer);
  };

  const handlePressEnd = () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      setPressTimer(null);
    }
  };

  const toggleMaterialSelection = (materialId) => {
    if (selectMode) {
      setSelectedMaterials(prev => 
        prev.includes(materialId) 
          ? prev.filter(id => id !== materialId)
          : [...prev, materialId]
      );
    }
  };

  const handleSelectAll = () => {
    if (selectedMaterials.length === materials.length) {
      setSelectedMaterials([]);
    } else {
      setSelectedMaterials(materials.map(m => m.id));
    }
  };

  const handleDelete = () => {
    if (selectedMaterials.length > 0) {
      deleteMutation.mutate(selectedMaterials);
    }
  };

  const getIconForMaterial = (material) => {
    if (material.type === 'pdf') return <File className="w-5 h-5" />;
    if (material.type === 'image') return <ImageIcon className="w-5 h-5" />;
    return <FileText className="w-5 h-5" />;
  };

  const handleMaterialClick = (material) => {
    if (!selectMode) {
      setViewingMaterial(material);
    } else {
      toggleMaterialSelection(material.id);
    }
  };

  const handleRenameMaterial = (material) => {
    setRenamingMaterial(material);
    setNewMaterialName(material.name);
  };

  const handleRenameSubmit = () => {
    if (newMaterialName.trim()) {
      renameMaterialMutation.mutate({ id: renamingMaterial.id, name: newMaterialName });
    }
  };

  const saveNotesMutation = useMutation({
    mutationFn: async (notesArray) => {
      if (!moduleData?.id) return;
      return base44.entities.Module.update(moduleData.id, { notes: JSON.stringify(notesArray) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['module-data', moduleName] });
    },
  });

  const handleSaveNote = () => {
    if (!noteTitle.trim()) return;
    
    const newNote = {
      id: currentNote?.id || Date.now().toString(),
      title: noteTitle,
      content: noteContent,
      timestamp: new Date().toISOString()
    };

    const updatedNotes = currentNote 
      ? notes.map(n => n.id === currentNote.id ? newNote : n)
      : [...notes, newNote];
    
    setNotes(updatedNotes);
    saveNotesMutation.mutate(updatedNotes);
    setCurrentNote(null);
    setNoteTitle('');
    setNoteContent('');
    setIsEditingNote(false);
  };

  const handleEditNote = (note) => {
    setCurrentNote(note);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setIsEditingNote(true);
  };

  const handleNewNote = () => {
    setCurrentNote(null);
    setNoteTitle('');
    setNoteContent('');
    setIsEditingNote(true);
  };

  const handleDeleteNote = (noteId) => {
    const updatedNotes = notes.filter(n => n.id !== noteId);
    setNotes(updatedNotes);
    saveNotesMutation.mutate(updatedNotes);
  };

  return (
    <div className="h-full flex overflow-hidden relative">
      {/* Materials Section */}
      <motion.div 
        className="flex-1 overflow-y-auto p-4"
        animate={{ 
          marginRight: notesPanelOpen ? 0 : 0,
          width: notesPanelOpen ? 'calc(100% - 384px)' : '100%'
        }}
        transition={{ type: 'tween', duration: 0.3 }}
      >
      {/* Actions Bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2 items-center">
          {selectMode && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              className="rounded-xl"
            >
              {selectedMaterials.length === materials.length ? 'Deselect All' : 'Select All'}
            </Button>
          )}
          {!selectMode && (
            <>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-xl"
                style={viewMode === 'list' ? { backgroundColor: 'var(--theme-primary)', color: 'var(--theme-text)' } : {}}
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-xl"
                style={viewMode === 'grid' ? { backgroundColor: 'var(--theme-primary)', color: 'var(--theme-text)' } : {}}
              >
                <Grid3x3 className="w-4 h-4" />
              </Button>
              <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="rounded-xl font-semibold" style={{ backgroundColor: 'var(--theme-primary)', color: 'var(--theme-text)' }}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-3xl" style={{ backgroundColor: 'var(--theme-bg)' }}>
                  <DialogHeader>
                    <DialogTitle style={{ color: 'var(--theme-text)' }}>Add Material</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 pt-4">
                    <label className="cursor-pointer">
                      <input type="file" accept="application/pdf,image/*" multiple onChange={handleFileUpload} className="hidden" />
                      <div className="border-2 border-dashed rounded-xl p-6 text-center transition-colors" style={{ borderColor: 'var(--theme-primary-light)' }}>
                        <Upload className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--theme-primary)' }} />
                        <p className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>Upload PDF or Image</p>
                      </div>
                    </label>
                    <label className="cursor-pointer">
                      <input type="file" accept="image/*" capture="environment" onChange={handleFileUpload} className="hidden" />
                      <Button variant="outline" className="w-full rounded-xl" style={{ borderColor: 'var(--theme-primary-light)', color: 'var(--theme-text)' }}>
                        <Camera className="w-4 h-4 mr-2" />
                        Take Photo
                      </Button>
                    </label>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>

        <div className="flex gap-2">
          {selectMode ? (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-xl">
                    <MoreVertical className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleDelete} disabled={selectedMaterials.length === 0}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete ({selectedMaterials.length})
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setBundleDialogOpen(true)}
                    disabled={selectedMaterials.length < 2}
                  >
                    <FolderOpen className="w-4 h-4 mr-2" />
                    Bundle ({selectedMaterials.length})
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectMode(false);
                  setSelectedMaterials([]);
                }}
                className="rounded-xl"
              >
                Cancel
              </Button>
            </>
          ) : null}
        </div>
        
        <Button
          size="sm"
          onClick={() => setNotesPanelOpen(!notesPanelOpen)}
          className="rounded-xl font-semibold"
          style={{ backgroundColor: 'var(--theme-primary)', color: 'var(--theme-text)' }}
        >
          <StickyNote className="w-4 h-4 mr-1" />
          Notes
        </Button>
      </div>

      {/* Bundle Dialog */}
      <Dialog open={bundleDialogOpen} onOpenChange={setBundleDialogOpen}>
        <DialogContent className="bg-white max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle>Create Bundle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Input
              value={bundleName}
              onChange={(e) => setBundleName(e.target.value)}
              placeholder="Bundle name..."
              className="rounded-xl"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateBundle()}
            />
            <Button onClick={handleCreateBundle} className="w-full rounded-xl font-semibold" style={{ backgroundColor: 'var(--theme-primary)', color: 'var(--theme-text)' }}>
              Create Bundle
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bundles Section */}
      {bundles.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-3">Bundles</h3>
          <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-3' : 'space-y-2'}>
            {bundles.map((bundle) => (
              <Card key={bundle.id} className="p-4 bg-white border-0 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--theme-primary)' }}>
                    <FolderOpen className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-black truncate text-sm">{bundle.name}</h4>
                    <p className="text-xs text-stone-500">Bundle</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Materials Section */}
      <div>
        <h3 className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-3">Materials</h3>
        {materialsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-white/50 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : materials.length > 0 ? (
          <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-3' : 'space-y-2'}>
            {materials.map((material, idx) => (
              <motion.div
                key={material.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                onTouchStart={() => handlePressStart(material.id)}
                onTouchEnd={handlePressEnd}
                onMouseDown={() => handlePressStart(material.id)}
                onMouseUp={handlePressEnd}
                onMouseLeave={handlePressEnd}
              >
                <Card className={`p-4 border-0 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer relative bg-white ${selectedMaterials.includes(material.id) ? 'ring-2' : ''}`} style={selectedMaterials.includes(material.id) ? { borderColor: 'var(--theme-primary)' } : {}}>
                  {selectMode && (
                    <div className="absolute top-2 right-2">
                      <Checkbox checked={selectedMaterials.includes(material.id)} />
                    </div>
                  )}
                  <div className="flex items-center gap-3" onClick={() => handleMaterialClick(material)}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white" style={{ backgroundColor: 'var(--theme-primary)' }}>
                      <span className="text-white">{getIconForMaterial(material)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate text-sm text-black">{material.name}</h4>
                      <p className="text-xs capitalize text-stone-500">{material.type}</p>
                    </div>
                    {!selectMode && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="rounded-xl h-8 w-8">
                            <MoreVertical className="w-4 h-4 text-stone-500" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            handleRenameMaterial(material);
                          }}>
                            <Edit2 className="w-4 h-4 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteMutation.mutate([material.id]);
                            }}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                          {selectedMaterials.length === 0 && (
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              setSelectMode(true);
                              setSelectedMaterials([material.id]);
                            }}>
                              <FolderOpen className="w-4 h-4 mr-2" />
                              Bundle
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card className="p-8 bg-white/70 border-0 rounded-2xl text-center">
            <Upload className="w-10 h-10 text-stone-300 mx-auto mb-3" />
            <p className="text-stone-500 text-sm">No materials yet</p>
          </Card>
        )}
      </div>

      {/* Material Viewer Dialog */}
      <Dialog open={!!viewingMaterial} onOpenChange={() => {
        setViewingMaterial(null);
        setImageZoom(100);
        setImageRotation(0);
        setShowViewerControls(true);
      }}>
        <DialogContent className="max-w-4xl w-[calc(100vw-1rem)] rounded-2xl bg-stone-900 max-h-[95vh] p-0 border-0">
          {/* Header with controls */}
          <AnimatePresence>
          {showViewerControls && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="p-3 bg-stone-800/90 backdrop-blur-sm flex items-center justify-between sticky top-0 z-10 rounded-t-2xl"
          >
            <DialogTitle className="text-white text-sm font-medium truncate max-w-[50%]">{viewingMaterial?.name}</DialogTitle>
            
            <div className="flex items-center gap-1">
              {viewingMaterial?.type === 'image' && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setImageZoom(prev => Math.max(25, prev - 25))}
                    className="h-9 w-9 p-0 rounded-lg hover:bg-stone-700 text-white"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <span className="text-white text-xs font-medium px-2 min-w-[3.5rem] text-center">
                    {imageZoom}%
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setImageZoom(prev => Math.min(300, prev + 25))}
                    className="h-9 w-9 p-0 rounded-lg hover:bg-stone-700 text-white"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                  <div className="w-px h-6 bg-stone-600 mx-1" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setImageRotation(prev => (prev + 90) % 360)}
                    className="h-9 w-9 p-0 rounded-lg hover:bg-stone-700 text-white"
                    title="Rotate"
                  >
                    <RotateCw className="w-4 h-4" />
                  </Button>
                  <div className="w-px h-6 bg-stone-600 mx-1" />
                </>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const elem = document.getElementById('material-viewer-fullscreen');
                  if (elem) {
                    if (document.fullscreenElement) {
                      document.exitFullscreen();
                    } else {
                      elem.requestFullscreen();
                    }
                  }
                }}
                className="h-9 w-9 p-0 rounded-lg hover:bg-stone-700 text-white"
                title="Fullscreen"
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
              <div className="w-px h-6 bg-stone-600 mx-1" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setViewingMaterial(null);
                  setImageZoom(100);
                  setImageRotation(0);
                }}
                className="h-9 w-9 p-0 rounded-lg hover:bg-stone-700 text-white"
                title="Close"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
          )}
          </AnimatePresence>
          
          <div 
            id="material-viewer-fullscreen" 
            className="overflow-auto max-h-[calc(95vh-60px)] bg-stone-900 flex items-center justify-center p-4 cursor-pointer"
            onClick={() => setShowViewerControls(prev => !prev)}
          >
            {viewingMaterial?.type === 'image' && (
              <div className="flex items-center justify-center w-full h-full">
                <img 
                  src={viewingMaterial.url} 
                  alt={viewingMaterial.name} 
                  className="rounded-lg transition-transform duration-200"
                  style={{ 
                    transform: `scale(${imageZoom / 100}) rotate(${imageRotation}deg)`,
                    maxWidth: '100%',
                    maxHeight: '100%',
                    width: 'auto',
                    height: 'auto',
                    objectFit: 'contain'
                  }}
                />
              </div>
            )}
            {viewingMaterial?.type === 'pdf' && (
              <iframe src={viewingMaterial.url} className="w-full h-[75vh] rounded-lg border-0 bg-white" />
            )}
            {viewingMaterial?.type === 'text' && viewingMaterial?.extracted_content && (
              <div className="w-full max-w-3xl p-6 bg-white rounded-lg">
                <p className="text-sm text-stone-700 whitespace-pre-wrap leading-relaxed">{viewingMaterial.extracted_content}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Material Dialog */}
      <Dialog open={!!renamingMaterial} onOpenChange={() => setRenamingMaterial(null)}>
        <DialogContent className="bg-white max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle>Rename Material</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Input
              value={newMaterialName}
              onChange={(e) => setNewMaterialName(e.target.value)}
              placeholder="Material name..."
              className="rounded-xl"
              onKeyDown={(e) => e.key === 'Enter' && handleRenameSubmit()}
            />
            <Button 
              onClick={handleRenameSubmit} 
              className="w-full rounded-xl font-semibold" 
              style={{ backgroundColor: 'var(--theme-primary)', color: 'var(--theme-text)' }}
            >
              Rename
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </motion.div>

      {/* Notes Panel - Slide Out */}
      <AnimatePresence>
      {notesPanelOpen && (
        <motion.div 
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'tween', duration: 0.3 }}
          className="w-full md:w-96 flex flex-col border-l border-stone-200 bg-white shadow-lg"
        >
          <div className="p-4 border-b border-stone-200 flex items-center justify-between">
            <h3 className="font-semibold text-stone-800">Notes</h3>
            <div className="flex items-center gap-2">
              {isEditingNote ? (
                <>
                  <Button
                    onClick={handleSaveNote}
                    disabled={!noteTitle.trim()}
                    size="sm"
                    className="rounded-xl font-semibold text-xs"
                    style={{ 
                      backgroundColor: 'var(--theme-primary)', 
                      color: 'var(--theme-text, #1C1917)'
                    }}
                  >
                    Save
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCurrentNote(null);
                      setNoteTitle('');
                      setNoteContent('');
                      setIsEditingNote(false);
                    }}
                    className="rounded-xl text-xs"
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setNotesPanelOpen(false)}
                  className="rounded-xl h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {isEditingNote ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-4 space-y-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 120px)' }}>
                <Input
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="Note title..."
                  className="rounded-xl font-semibold"
                />
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Write your note here..."
                  className="w-full p-3 text-sm border border-stone-200 rounded-xl resize-none focus:outline-none focus:ring-2"
                  style={{ 
                    minHeight: '400px',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    '--tw-ring-color': 'var(--theme-primary)'
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <div className="p-4">
                <Button
                  onClick={handleNewNote}
                  className="w-full rounded-xl font-semibold mb-4"
                  style={{ 
                    backgroundColor: 'var(--theme-primary)', 
                    color: 'var(--theme-text, #1C1917)'
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Note
                </Button>
              </div>

              {notes.length > 0 ? (
                <div className="space-y-2 px-4">
                  {notes.map((note) => (
                    <Card key={note.id} className="p-3 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-2">
                        <div 
                          className="flex-1 cursor-pointer"
                          onClick={() => handleEditNote(note)}
                        >
                          <h4 className="font-medium text-stone-800 text-sm mb-1">{note.title}</h4>
                          <p className="text-xs text-stone-500 line-clamp-2">{note.content}</p>
                          <p className="text-xs text-stone-400 mt-1">
                            {new Date(note.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteNote(note.id);
                          }}
                          className="h-8 w-8 p-0 rounded-lg text-stone-400 hover:text-red-600"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 px-4">
                  <StickyNote className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                  <p className="text-sm text-stone-500">No notes yet</p>
                  <p className="text-xs text-stone-400 mt-1">Create your first note</p>
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}
      </AnimatePresence>

      <UpgradePrompt
        open={showUpgradePrompt}
        onOpenChange={setShowUpgradePrompt}
        feature={limitFeature}
      />
    </div>
  );
}