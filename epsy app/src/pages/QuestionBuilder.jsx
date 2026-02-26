import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ChevronDown, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function QuestionBuilder() {
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [expandedTemplate, setExpandedTemplate] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: allTemplates = [] } = useQuery({
    queryKey: ['question-templates'],
    queryFn: () => base44.entities.QuestionTemplate.filter({ published: true }, 'order'),
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  // Block school_admin from student pages
  if (user?.role === 'school_admin') {
    return (
      <div className="min-h-screen bg-[#F1F4F6] p-8 flex items-center justify-center">
        <p className="text-[#2E5C6E]">Access denied</p>
      </div>
    );
  }

  const userSubjects = user?.subjects || [];
  const subjects = [...new Set(allTemplates.map(t => t.subject))].filter(s => userSubjects.includes(s));
  const templates = selectedSubject ? allTemplates.filter(t => t.subject === selectedSubject) : [];

  return (
    <div className="min-h-screen bg-[#F1F4F6] px-4 md:px-8 py-8 pb-24">
      <div className="max-w-4xl mx-auto">
        <Link to={createPageUrl('Home')} className="inline-flex items-center text-black mb-6 hover:opacity-80">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-[#1E1E1E] mb-2">
            Question Builder
          </h1>
          <p className="text-[#2E5C6E]">
            Learn to ask better academic questions
          </p>
        </motion.div>

        {/* Subject Selection */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {subjects.length === 0 ? (
            <Card className="bg-white border-[#2E5C6E]/20 col-span-2">
              <CardContent className="p-12 text-center">
                <p className="text-[#2E5C6E]">
                  No templates available for your subjects yet. Check back soon!
                </p>
              </CardContent>
            </Card>
          ) : (
            subjects.map((subject) => (
              <Card
                key={subject}
                className={`cursor-pointer transition-all ${
                  selectedSubject === subject
                    ? 'border-[#0CC0DF] bg-[#0CC0DF]/5'
                    : 'border-[#2E5C6E]/20 hover:border-[#0CC0DF]/40'
                } bg-white`}
                onClick={() => setSelectedSubject(subject)}
              >
                <CardHeader>
                  <CardTitle className="text-[#1E1E1E]">{subject}</CardTitle>
                </CardHeader>
              </Card>
            ))
          )}
        </div>

        {/* Templates */}
        {selectedSubject && templates.length > 0 && (
          <div className="space-y-6">
            {templates.map((template, idx) => (
              <Card key={template.id} className="bg-white border-[#2E5C6E]/20">
                <CardHeader
                  className="cursor-pointer hover:bg-[#FAFBF9] transition-colors"
                  onClick={() => setExpandedTemplate(expandedTemplate === idx ? null : idx)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-[#1E1E1E] text-base mb-1">{template.category}</CardTitle>
                      <p className="text-sm text-[#2E5C6E] font-mono">{template.template_text}</p>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-[#2E5C6E] transition-transform ${expandedTemplate === idx ? 'rotate-180' : ''}`} />
                  </div>
                </CardHeader>
                <AnimatePresence>
                  {expandedTemplate === idx && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                    >
                      <CardContent className="pt-0 space-y-4">
                        {template.guidance && (
                          <div>
                            <p className="text-sm font-medium text-[#1E1E1E] mb-2">How to Use</p>
                            <p className="text-[#2E5C6E]">{template.guidance}</p>
                          </div>
                        )}
                        {template.weak_example && template.strong_example && (
                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                              <p className="text-sm font-medium text-red-900 mb-2">Weak Question</p>
                              <p className="text-sm text-red-700">{template.weak_example}</p>
                            </div>
                            <div className="bg-[#0CC0DF]/10 p-3 rounded-lg border border-[#0CC0DF]/30">
                              <p className="text-sm font-medium text-[#0CC0DF] mb-2">Strong Question</p>
                              <p className="text-sm text-[#2E5C6E]">{template.strong_example}</p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}