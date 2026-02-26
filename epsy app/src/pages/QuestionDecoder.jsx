import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ChevronDown, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function QuestionDecoder() {
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [expandedWord, setExpandedWord] = useState(null);

  const { data: subjects = [] } = useQuery({
    queryKey: ['decoder-subjects'],
    queryFn: () => base44.entities.DecoderContent.filter({ published: true }),
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
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
  const filteredSubjects = subjects.filter(s => userSubjects.includes(s.subject));

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
            Question Decoder
          </h1>
          <p className="text-[#2E5C6E]">
            Master academic question interpretation for your subjects
          </p>
        </motion.div>

        {/* Subject Selection */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {filteredSubjects.length === 0 ? (
            <Card className="bg-white border-[#2E5C6E]/20 col-span-2">
              <CardContent className="p-12 text-center">
                <p className="text-[#2E5C6E]">
                  No decoder content available for your subjects yet. Check back soon!
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredSubjects.map((subject) => (
              <Card
                key={subject.id}
                className={`cursor-pointer transition-all ${
                  selectedSubject?.id === subject.id
                    ? 'border-[#0CC0DF] bg-[#0CC0DF]/5'
                    : 'border-[#2E5C6E]/20 hover:border-[#0CC0DF]/40'
                } bg-white`}
                onClick={() => setSelectedSubject(subject)}
              >
                <CardHeader>
                  <CardTitle className="text-[#1E1E1E]">{subject.subject}</CardTitle>
                </CardHeader>
              </Card>
            ))
          )}
        </div>

        {/* Subject Content */}
        {selectedSubject && (
          <div className="space-y-6">
            {/* Instruction Words */}
            {selectedSubject.instruction_words?.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-[#1E1E1E] mb-4">Instruction Words</h2>
                <div className="space-y-3">
                  {selectedSubject.instruction_words.map((word, idx) => (
                    <Card key={idx} className="bg-white border-[#2E5C6E]/20">
                      <CardHeader
                        className="cursor-pointer hover:bg-[#FAFBF9] transition-colors"
                        onClick={() => setExpandedWord(expandedWord === idx ? null : idx)}
                      >
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-[#1E1E1E] text-base">{word.word}</CardTitle>
                          <ChevronDown className={`w-5 h-5 text-[#2E5C6E] transition-transform ${expandedWord === idx ? 'rotate-180' : ''}`} />
                        </div>
                      </CardHeader>
                      <AnimatePresence>
                        {expandedWord === idx && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                          >
                            <CardContent className="pt-0 space-y-3">
                              {word.meaning && (
                                <div>
                                  <p className="text-sm font-medium text-[#1E1E1E]">Meaning</p>
                                  <p className="text-[#2E5C6E]">{word.meaning}</p>
                                </div>
                              )}
                              {word.what_required && (
                                <div>
                                  <p className="text-sm font-medium text-[#1E1E1E]">What's Required</p>
                                  <p className="text-[#2E5C6E]">{word.what_required}</p>
                                </div>
                              )}
                              {word.example && (
                                <div className="bg-[#FAFBF9] p-3 rounded-lg">
                                  <p className="text-sm font-medium text-[#1E1E1E] mb-1">Example</p>
                                  <p className="text-[#2E5C6E] text-sm">{word.example}</p>
                                </div>
                              )}
                            </CardContent>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* How Questions Are Framed */}
            {selectedSubject.question_structure && (
              <Card className="bg-white border-[#2E5C6E]/20">
                <CardHeader>
                  <CardTitle className="text-[#1E1E1E]">How Questions Are Framed</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-[#2E5C6E] leading-relaxed whitespace-pre-wrap">
                    {selectedSubject.question_structure}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* How to Respond */}
            {selectedSubject.how_to_respond && (
              <Card className="bg-white border-[#2E5C6E]/20">
                <CardHeader>
                  <CardTitle className="text-[#1E1E1E]">How to Respond</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-[#2E5C6E] leading-relaxed whitespace-pre-wrap">
                    {selectedSubject.how_to_respond}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* How to Remember the Response */}
            {selectedSubject.how_to_remember && (
              <Card className="bg-white border-[#2E5C6E]/20">
                <CardHeader>
                  <CardTitle className="text-[#1E1E1E]">How to Remember the Response</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-[#2E5C6E] leading-relaxed whitespace-pre-wrap">
                    {selectedSubject.how_to_remember}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Common Traps */}
            {selectedSubject.common_traps?.length > 0 && (
              <Card className="bg-white border-[#2E5C6E]/20">
                <CardHeader>
                  <CardTitle className="text-[#1E1E1E]">Common Traps</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {selectedSubject.common_traps.map((trap, idx) => (
                      <li key={idx} className="text-[#2E5C6E] flex items-start">
                        <span className="text-[#C6A85E] mr-2">•</span>
                        {trap}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* What to Watch For */}
            {selectedSubject.watch_for?.length > 0 && (
              <Card className="bg-white border-[#2E5C6E]/20">
                <CardHeader>
                  <CardTitle className="text-[#1E1E1E]">Always Watch For</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {selectedSubject.watch_for.map((item, idx) => (
                      <li key={idx} className="text-[#2E5C6E] flex items-start">
                        <span className="text-[#C6A85E] mr-2">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}