import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, Lightbulb, Copy, ThumbsUp, ThumbsDown, FileText, Plus, Globe, Camera, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import DocumentViewer from './DocumentViewer';
import StreamingMessage from './StreamingMessage';
import DefinitionPanel from './DefinitionPanel';
import { useStyleText } from '@/components/StyleText';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ChatInterface({ materials, conversation, onSendMessage, isLoading, onStartSession, onAddMaterials, webEnabled, onWebToggle, sessionId, onImageCapture, onWebEnabledChange }) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const captureInputRef = useRef(null);
  const styleText = useStyleText();
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [showDocuments, setShowDocuments] = useState(false);
  const [streamingMessageIndex, setStreamingMessageIndex] = useState(null);
  const [contextQuestions, setContextQuestions] = useState([]);
  const [editingUserMsg, setEditingUserMsg] = useState(null);
  const [editedUserText, setEditedUserText] = useState('');
  const [showImageOptions, setShowImageOptions] = useState(false);
  const [capturingImage, setCapturingImage] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [imageQuestion, setImageQuestion] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selectedTextForDefinition, setSelectedTextForDefinition] = useState('');
  
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });
  
  // Session hasn't started until AI sends initial prompt
  const sessionStarted = conversation.length > 0;
  const userHasAsked = conversation.some(m => m.role === 'user');
  
  // Load suggested questions from session on mount
  useEffect(() => {
    const loadSuggestedQuestions = async () => {
      if (sessionId) {
        try {
          const sessions = await base44.entities.StudySession.filter({ id: sessionId });
          if (sessions.length > 0 && sessions[0].suggestedQuestions) {
            setContextQuestions(sessions[0].suggestedQuestions);
          }
        } catch (error) {
          console.error('Failed to load suggested questions:', error);
        }
      }
    };
    loadSuggestedQuestions();
  }, [sessionId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation]);

  // Auto-start session when materials are ready and no conversation yet
  useEffect(() => {
    const hasContent = materials.some(m => m.extracted_content && m.extracted_content.trim().length > 50);
    if (hasContent && !sessionStarted && onStartSession && conversation.length === 0) {
      onStartSession();
    }
  }, [materials, sessionStarted, onStartSession, conversation.length]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    onSendMessage(input);
    setInput('');
  };

  // Trigger streaming animation for new AI messages
  useEffect(() => {
    if (!isLoading && conversation.length > 0) {
      const lastMsg = conversation[conversation.length - 1];
      if (lastMsg.role === 'assistant' && lastMsg.suggestedQuestions) {
        setStreamingMessageIndex(conversation.length - 1);
        setContextQuestions(lastMsg.suggestedQuestions);
      }
    }
  }, [conversation.length, isLoading]);

  // This function is no longer needed as questions are generated in Study.js
  const generateContextQuestions = () => {
    // Questions are now generated and saved in Study.js handleSendMessage
    return;
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (content, idx) => {
    navigator.clipboard.writeText(content);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleEditUserMessage = (msgIdx) => {
    setEditingUserMsg(msgIdx);
    setEditedUserText(conversation[msgIdx].content);
  };

  const handleSaveUserEdit = (msgIdx) => {
    if (editedUserText.trim() && editedUserText.trim() !== conversation[msgIdx].content) {
      // Create conversation up to (but not including) the edited message, then add edited version
      const truncatedConversation = conversation.slice(0, msgIdx).concat([{
        ...conversation[msgIdx],
        content: editedUserText.trim()
      }]);
      
      // Pass the edited message content and the truncated conversation
      // The handleSendMessage will use this conversation directly without adding a duplicate
      onSendMessage(editedUserText.trim(), false, truncatedConversation);
      
      setEditingUserMsg(null);
      setEditedUserText('');
    } else {
      setEditingUserMsg(null);
      setEditedUserText('');
    }
  };

  const handleCancelUserEdit = () => {
    setEditingUserMsg(null);
    setEditedUserText('');
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    
    if (text && text.length > 0) {
      // Show context menu or define button
      return text;
    }
    return '';
  };

  useEffect(() => {
    const handleMouseUp = () => {
      const text = handleTextSelection();
      if (text) {
        // For now, we'll trigger definition on selection
        // In a more complete implementation, you'd show a context menu first
        const shouldDefine = window.confirm(`Define "${text}"?`);
        if (shouldDefine) {
          setSelectedTextForDefinition(text);
        }
      }
    };

    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const hasContent = materials.some(m => m.extracted_content);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      let extractedContent = '';
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            content: { type: "string", description: "All text content from the image" }
          }
        }
      });
      
      if (result.status === 'success') {
        extractedContent = result.output?.content || '';
      }

      const materialNumber = materials.length + 1;
      
      if (onImageCapture) {
        await onImageCapture({
          name: file.name,
          type: 'image',
          url: file_url,
          extracted_content: extractedContent,
          isCapture: false,
          isInitialImage: false,
          number: materialNumber
        });
      }
    } catch (error) {
      console.error('Failed to upload file:', error);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleCaptureImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      let extractedContent = '';
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            content: { type: "string", description: "All text content from the image" }
          }
        }
      });
      
      if (result.status === 'success') {
        extractedContent = result.output?.content || '';
      }

      const materialNumber = materials.length + 1;

      if (onImageCapture) {
        await onImageCapture({
          name: file.name,
          type: 'image',
          url: file_url,
          extracted_content: extractedContent,
          isCapture: true,
          isInitialImage: false,
          number: materialNumber
        });
      }
    } catch (error) {
      console.error('Failed to capture image:', error);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSendCapturedImage = async () => {
    if (!capturedImage) return;
    
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: capturedImage });
      
      let extractedContent = '';
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            content: { type: "string", description: "All text content from the image" }
          }
        }
      });
      
      if (result.status === 'success') {
        extractedContent = result.output?.content || '';
      }

      if (onImageCapture) {
        await onImageCapture({
          name: capturedImage.name,
          type: 'image',
          url: file_url,
          extracted_content: extractedContent,
          isCapture: true,
          isInitialImage: materials.length === 0
        }, imageQuestion.trim() || null);
      }
    } catch (error) {
      console.error('Failed to upload image:', error);
    } finally {
      setUploading(false);
      setCapturedImage(null);
      setImageQuestion('');
      setCapturingImage(false);
    }
  };



  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
        {conversation.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-100 to-amber-50 flex items-center justify-center mb-6">
              {isLoading ? (
                <Loader2 className="w-10 h-10 text-stone-400 animate-spin" />
              ) : (
                <span className="text-4xl">🦉</span>
              )}
            </div>
            <h3 className="text-xl font-semibold text-stone-800 mb-2">
              {isLoading ? "Preparing your session..." : styleText.readyToLearn}
            </h3>
            <p className="text-stone-500 max-w-sm mb-6">
              {isLoading 
                ? "I'm reading through your materials..."
                : styleText.uploadMaterials
              }
            </p>
          </div>
        ) : (
          <>


            <AnimatePresence>
              {conversation.map((msg, idx) => (
                <div key={idx}>
                  {/* Show inline material if this message added one */}
                  {msg.addedMaterial && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mb-4 flex justify-center"
                    >
                      <div className="bg-stone-50 rounded-xl p-3 border border-stone-200 max-w-md">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center px-2.5 py-1 rounded-lg" style={{ backgroundColor: 'var(--theme-primary-light, rgba(229, 228, 226, 0.3))' }}>
                            <span className="font-bold text-sm" style={{ color: 'var(--theme-primary)' }}>#{msg.addedMaterial.number}</span>
                          </div>
                          <div className="w-10 h-10 rounded-lg bg-stone-200 flex items-center justify-center text-lg">
                            {msg.addedMaterial.type === 'image' ? '🖼️' : msg.addedMaterial.type === 'pdf' ? '📄' : '📝'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-stone-800 truncate">{msg.addedMaterial.name}</p>
                            <p className="text-xs text-stone-500">
                              {msg.addedMaterial.type === 'image' ? 'Image' : msg.addedMaterial.type === 'pdf' ? 'PDF' : 'Text note'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'user' ? (
                      <div className="max-w-[85%]">
                        {editingUserMsg === idx ? (
                          <div className="space-y-2">
                            <textarea
                              value={editedUserText}
                              onChange={(e) => setEditedUserText(e.target.value)}
                              className="w-full min-h-[80px] px-4 py-3 text-base leading-[1.7] border border-stone-300 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-stone-400"
                              autoFocus
                            />
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => handleSaveUserEdit(idx)}
                                className="text-sm px-3 py-1.5 bg-stone-800 text-white rounded-lg hover:bg-stone-700"
                              >
                                Send
                              </button>
                              <button
                                onClick={handleCancelUserEdit}
                                className="text-sm px-3 py-1.5 border border-stone-300 rounded-lg hover:bg-stone-100"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="rounded-2xl px-4 py-3 bg-stone-800 text-white">
                              <p className="text-base leading-[1.7]">{msg.content}</p>
                            </div>
                            <div className="flex items-center gap-2 mt-2 justify-end">
                              <button
                                onClick={() => handleEditUserMessage(idx)}
                                className="text-xs text-stone-400 hover:text-stone-600 flex items-center gap-1"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                                Edit
                              </button>
                              <button
                                onClick={() => handleCopy(msg.content, `user-${idx}`)}
                                className="text-xs text-stone-400 hover:text-stone-600 flex items-center gap-1"
                              >
                                <Copy className="w-3 h-3" />
                                {copiedIndex === `user-${idx}` ? 'Copied!' : 'Copy'}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="max-w-[85%]">
                        <StreamingMessage 
                          content={msg.content} 
                          shouldAnimate={idx === streamingMessageIndex}
                          onAnimationComplete={() => {
                            if (idx === streamingMessageIndex) {
                              setStreamingMessageIndex(null);
                            }
                          }}
                          webEnabled={webEnabled}
                        />
                      </div>
                    )}
                  </motion.div>
                  
                  {/* Show feedback buttons after all AI responses */}
                  {msg.role === 'assistant' && (
                    <div className="mt-3 ml-0 space-y-2">
                      {/* Feedback buttons - show for all messages */}
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex gap-1"
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(msg.content, idx)}
                          className="rounded-full text-xs px-3 text-stone-600 hover:bg-stone-100"
                        >
                          <Copy className="w-3 h-3" />
                          {copiedIndex === idx && <span className="ml-1">Copied!</span>}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-full text-xs px-3 text-stone-600 hover:bg-stone-100"
                        >
                          <ThumbsUp className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-full text-xs px-3 text-stone-600 hover:bg-stone-100"
                        >
                          <ThumbsDown className="w-3 h-3" />
                        </Button>
                      </motion.div>
                      
                      {/* Suggested questions - show on latest response (always for initial greeting with questions, after user has asked for others) */}
                      {idx === conversation.length - 1 && (userHasAsked || (idx === 0 && msg.suggestedQuestions && msg.suggestedQuestions.length > 0)) && (
                      <>
                      {!isLoading && userHasAsked && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 }}
                          className="flex gap-3 flex-wrap"
                        >
                          <button
                            onClick={() => onSendMessage(`Can you give me an example to illustrate what you just explained? Create an original example based on your explanation, not from the materials.`)}
                            className="text-sm text-stone-600 hover:text-stone-800 underline decoration-dotted underline-offset-2 transition-colors"
                          >
                            Give an example
                          </button>
                          <button
                            onClick={() => onSendMessage(`Can you create an analogy to help me understand what you just explained? Make it an original analogy based on your explanation.`)}
                            className="text-sm text-stone-600 hover:text-stone-800 underline decoration-dotted underline-offset-2 transition-colors"
                          >
                            Give an analogy
                          </button>
                        </motion.div>
                      )}

                      {contextQuestions.length > 0 && !isLoading && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.15 }}
                          className="space-y-2"
                        >
                          {contextQuestions.map((question, qIdx) => (
                            <div key={qIdx} className="flex items-start gap-2">
                              <span className="text-base text-black leading-none mt-0.5 flex-shrink-0">•</span>
                              <button
                                onClick={() => onSendMessage(question)}
                                className="flex-1 text-sm text-stone-600 hover:text-stone-800 text-left transition-colors"
                              >
                                {question}
                              </button>
                            </div>
                          ))}
                          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-stone-200">
                            <span className="text-xs text-stone-400">or type your own question below</span>
                          </div>
                        </motion.div>
                      )}
                      </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </AnimatePresence>
            
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--theme-primary)' }} />
              </motion.div>
            )}
            
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area - Fixed to bottom */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-stone-300/50 bg-white z-10">
        <div className="p-3 pt-2">
          <div className="flex gap-2 items-center">
          {sessionStarted && materials && materials.length > 0 && (
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDocuments(!showDocuments)}
                className="h-auto px-1.5 py-2 text-stone-600 hover:bg-stone-100 rounded-xl rounded-r-none"
              >
                <FileText className="w-4 h-4" />
              </Button>
              <DropdownMenu open={showImageOptions} onOpenChange={setShowImageOptions}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto px-1.5 py-2 text-stone-600 hover:bg-stone-100 rounded-none"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" side="top" className="w-48">
                  <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload material
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => captureInputRef.current?.click()}>
                    <Camera className="w-4 h-4 mr-2" />
                    Capture image of material
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <input
                ref={captureInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleCaptureImage}
                className="hidden"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={onWebToggle}
                className={`h-auto px-1.5 py-2 rounded-xl rounded-l-none transition-colors ${
                  webEnabled 
                    ? 'hover:bg-stone-100' 
                    : 'text-stone-400 hover:bg-stone-100'
                }`}
                style={webEnabled ? { color: 'var(--theme-primary)' } : {}}
              >
                <Globe className="w-4 h-4" />
              </Button>
            </div>
          )}
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={sessionStarted ? "Ask me anything about it..." : "Waiting for session to start..."}
            disabled={!sessionStarted || isLoading}
            rows={1}
            className="flex-1 min-w-0 px-4 py-3 text-sm border border-stone-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#E5E4E2]/20 focus:border-[#E5E4E2] disabled:bg-stone-50 disabled:cursor-not-allowed"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || !sessionStarted || isLoading}
            className="h-auto px-3 py-2 bg-[#E5E4E2] hover:bg-[#E5E4E2]/90 text-stone-800 rounded-xl font-semibold shrink-0"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            </Button>
            </div>
            </div>
            </div>

      {/* Document Viewer Modal */}
      {showDocuments && materials && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowDocuments(false)}>
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-stone-200 flex items-center justify-between">
              <h3 className="font-semibold text-stone-800">Study Materials</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowDocuments(false)}>✕</Button>
            </div>
            <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
              <DocumentViewer materials={materials} />
            </div>
          </div>
        </div>
      )}

      {/* Definition Panel */}
      <DefinitionPanel
        selectedText={selectedTextForDefinition}
        onClose={() => setSelectedTextForDefinition('')}
        user={user}
      />
    </div>
  );
}