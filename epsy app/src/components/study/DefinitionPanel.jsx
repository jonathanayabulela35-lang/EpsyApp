import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import ReactMarkdown from 'react-markdown';

export default function DefinitionPanel({ selectedText, onClose, user }) {
  const [definition, setDefinition] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedText) {
      fetchDefinition();
    }
  }, [selectedText]);

  const getStylePrompt = () => {
    const style = user?.ai_style || 'calm';
    const level = user?.communication_level || 'simple';
    
    const styleGuides = {
      professional: {
        simple: 'professional tone with everyday language and shorter sentences',
        direct: 'professional tone with precise academic language and explicit structure'
      },
      casual: {
        simple: 'conversational with everyday words and easy-to-follow sentences',
        direct: 'conversational with clear, explicit, structured explanations'
      },
      friendly: {
        simple: 'warm and encouraging with familiar, simple language',
        direct: 'warm and encouraging with precise, well-structured guidance'
      },
      supportive: {
        simple: 'patient and nurturing with simple, reassuring language',
        direct: 'patient and nurturing with explicit, instructional phrasing'
      },
      calm: {
        simple: 'steady and thoughtful with uncomplicated, easy language',
        direct: 'steady and thoughtful with precise, explicit academic structure'
      }
    };
    
    return styleGuides[style]?.[level] || styleGuides.calm.simple;
  };

  const fetchDefinition = async () => {
    setLoading(true);
    try {
      const words = selectedText.trim().split(/\s+/);
      const isPhrase = words.length > 1;
      
      const styleDescription = getStylePrompt();
      
      const prompt = isPhrase
        ? `Provide a short explanation of the following phrase or concept: "${selectedText}"

Follow with a contextual reference or illustrative example.

Use a ${styleDescription} tone throughout. Keep the response concise (2-3 paragraphs maximum).`
        : `Define the following word: "${selectedText}"

Provide:
1. A clear, concise definition
2. A simple example sentence showing how the word is used

Use a ${styleDescription} tone throughout. Keep the response brief and focused.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        add_context_from_internet: false,
      });

      setDefinition(response);
    } catch (error) {
      console.error('Failed to fetch definition:', error);
      setDefinition('Failed to load definition. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {selectedText && (
        <>
          {/* Dimmed Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-40"
            onClick={onClose}
          />
          
          {/* Slide-in Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed right-0 top-0 bottom-0 w-full sm:w-96 bg-white shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-stone-200 flex items-center justify-between">
              <h3 className="font-semibold text-stone-800">Definition</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="rounded-full"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="mb-4 p-3 bg-stone-50 rounded-lg border border-stone-200">
                <p className="text-sm font-medium text-stone-600">Selected:</p>
                <p className="text-base text-stone-800 mt-1">{selectedText}</p>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
                </div>
              ) : (
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="text-stone-700 leading-relaxed mb-3">{children}</p>,
                      strong: ({ children }) => <strong className="font-semibold text-stone-800">{children}</strong>,
                      em: ({ children }) => <em className="italic text-stone-600">{children}</em>,
                      ol: ({ children }) => <ol className="list-decimal ml-4 mb-3 space-y-1">{children}</ol>,
                      ul: ({ children }) => <ul className="list-disc ml-4 mb-3 space-y-1">{children}</ul>,
                      li: ({ children }) => <li className="text-stone-700">{children}</li>,
                    }}
                  >
                    {definition}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}