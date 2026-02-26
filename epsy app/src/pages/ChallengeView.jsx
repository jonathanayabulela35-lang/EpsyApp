import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ChevronDown, ChevronRight, Check, MoreVertical } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ChallengeView() {
  const urlParams = new URLSearchParams(window.location.search);
  const challengeId = urlParams.get('id');
  const [expandedSection, setExpandedSection] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [showCodeNameDialog, setShowCodeNameDialog] = useState(false);
  const [showEditCodeNameDialog, setShowEditCodeNameDialog] = useState(false);
  const [codeName, setCodeName] = useState('');
  const [editCodeName, setEditCodeName] = useState('');
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [notes, setNotes] = useState('');
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: challenge } = useQuery({
    queryKey: ['challenge', challengeId],
    queryFn: () => base44.entities.Challenge.filter({ id: challengeId }).then(r => r[0]),
    enabled: !!challengeId,
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

  const { data: days = [] } = useQuery({
    queryKey: ['challenge-days', challengeId],
    queryFn: () => base44.entities.ChallengeDay.filter({ challenge_id: challengeId }, 'day_number'),
    enabled: !!challengeId,
  });

  const { data: progress } = useQuery({
    queryKey: ['progress', challengeId],
    queryFn: () => base44.entities.StudentProgress.filter({ challenge_id: challengeId }).then(r => r[0]),
    enabled: !!challengeId,
  });

  const startMutation = useMutation({
    mutationFn: (data) => base44.entities.StudentProgress.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['progress', challengeId] });
      setShowCodeNameDialog(false);
    },
  });

  const updateProgressMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.StudentProgress.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['progress', challengeId] });
    },
  });

  const handleStart = () => {
    setShowCodeNameDialog(true);
  };

  const confirmStart = () => {
    if (!codeName.trim()) return;
    startMutation.mutate({
      challenge_id: challengeId,
      code_name: codeName,
      current_day: 1,
      completed_days: [],
      started_date: new Date().toISOString(),
      last_accessed: new Date().toISOString(),
    });
  };

  const handleDayComplete = (dayNumber) => {
    if (!progress) return;
    const completedDays = [...(progress.completed_days || []), dayNumber];
    updateProgressMutation.mutate({
      id: progress.id,
      data: {
        completed_days: completedDays,
        current_day: dayNumber + 1,
        last_accessed: new Date().toISOString(),
      },
    });
  };

  const handleSaveNotes = () => {
    if (!progress) return;
    updateProgressMutation.mutate({
      id: progress.id,
      data: { personal_notes: notes },
    });
    setShowNotesDialog(false);
  };

  const handleEditCodeName = () => {
    setEditCodeName(progress?.code_name || '');
    setShowEditCodeNameDialog(true);
  };

  const handleSaveCodeName = () => {
    if (!progress || !editCodeName.trim()) return;
    updateProgressMutation.mutate({
      id: progress.id,
      data: { code_name: editCodeName },
    });
    setShowEditCodeNameDialog(false);
  };

  const sections = [
    { key: 'why', label: 'Why This Happens', content: challenge?.why_this_happens },
    { key: 'reframe', label: 'How to Reframe It', content: challenge?.how_to_reframe },
    { key: 'ignore', label: 'If You Ignore It', content: challenge?.if_you_ignore },
    { key: 'act', label: 'If You Act On It', content: challenge?.if_you_act },
    { key: 'full', label: 'Full Breakdown', content: challenge?.full_breakdown },
  ];

  if (!challenge) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-[#F1F4F6] px-4 md:px-8 py-8 pb-24">
      <div className="max-w-4xl mx-auto">
        <div className="flex gap-4 mb-6">
          <Link to={createPageUrl('InsightLibrary')} className="inline-flex items-center text-black hover:opacity-80">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Library
          </Link>
          <Link to={createPageUrl('Home')} className="inline-flex items-center text-black hover:opacity-80">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Home
          </Link>
        </div>

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <span className="text-5xl">{challenge.icon}</span>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-black">{challenge.title}</h1>
            {progress && (
              <p className="text-[#2E5C6E] mt-1">Your code name: {progress.code_name}</p>
            )}
          </div>
          {progress && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleEditCodeName}>
                  Set Code Name
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Sections */}
        <div className="space-y-3 mb-8">
          {sections.map((section) => section.content && (
            <Card key={section.key} className="bg-white border-[#2E5C6E]/20">
              <CardHeader
                className="cursor-pointer hover:bg-[#FAFBF9] transition-colors"
                onClick={() => setExpandedSection(expandedSection === section.key ? null : section.key)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[#1E1E1E] text-base">{section.label}</CardTitle>
                  <ChevronDown className={`w-5 h-5 text-[#2E5C6E] transition-transform ${expandedSection === section.key ? 'rotate-180' : ''}`} />
                </div>
              </CardHeader>
              <AnimatePresence>
                {expandedSection === section.key && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                  >
                    <CardContent className="pt-0">
                      <p className="text-[#1E1E1E] leading-relaxed whitespace-pre-wrap">{section.content}</p>
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          ))}
        </div>

        {/* Daily Execution */}
        <Card className="bg-white border-[#2E5C6E]/20 mb-6">
          <CardHeader>
            <CardTitle className="text-[#1E1E1E]">Daily Execution</CardTitle>
          </CardHeader>
          <CardContent>
            {!progress ? (
              <div className="text-center py-8">
                <p className="text-[#2E5C6E] mb-4">Ready to start this journey?</p>
                <Button onClick={handleStart} className="bg-[#0CC0DF] hover:bg-[#0AB0CF] text-white">
                  Start Challenge
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {challenge.execution_overview?.map((step) => (
                  <div
                    key={step.day}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      progress.completed_days?.includes(step.day)
                        ? 'border-[#0CC0DF] bg-[#0CC0DF]/5'
                        : progress.current_day === step.day
                        ? 'border-[#C6A85E] bg-[#C6A85E]/5'
                        : 'border-[#2E5C6E]/20'
                    }`}
                    onClick={() => setSelectedDay(step.day)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {progress.completed_days?.includes(step.day) && (
                          <Check className="w-5 h-5 text-[#0CC0DF]" />
                        )}
                        <span className="font-medium text-[#1E1E1E]">Day {step.day}</span>
                        <span className="text-[#2E5C6E]">{step.label}</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-[#2E5C6E]" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Thought Offering */}
        {challenge.thought_offering && (
          <Card className="bg-[#FAFBF9] border-[#C6A85E]/30">
            <CardContent className="p-6">
              <p className="text-[#1E1E1E] italic leading-relaxed">{challenge.thought_offering}</p>
            </CardContent>
          </Card>
        )}

        {/* Code Name Dialog */}
        <Dialog open={showCodeNameDialog} onOpenChange={setShowCodeNameDialog}>
          <DialogContent className="bg-white">
            <DialogHeader>
              <DialogTitle className="text-black">Create Your Code Name</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-[#2E5C6E]">
                For your privacy, create a code name for this challenge. This is what you'll see in notifications.
              </p>
              <Input
                value={codeName}
                onChange={(e) => setCodeName(e.target.value)}
                placeholder="e.g., Project Shield, Level Up"
              />
              <Button onClick={confirmStart} className="w-full bg-[#0CC0DF] hover:bg-[#0AB0CF] text-white">
                Start Journey
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Code Name Dialog */}
        <Dialog open={showEditCodeNameDialog} onOpenChange={setShowEditCodeNameDialog}>
          <DialogContent className="bg-white">
            <DialogHeader>
              <DialogTitle className="text-black">Edit Code Name</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-[#2E5C6E]">
                Update the private code name for this challenge.
              </p>
              <Input
                value={editCodeName}
                onChange={(e) => setEditCodeName(e.target.value)}
                placeholder="e.g., Project Shield, Level Up"
              />
              <Button onClick={handleSaveCodeName} className="w-full bg-[#0CC0DF] hover:bg-[#0AB0CF] text-white">
                Save Code Name
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Day Detail Dialog */}
        <Dialog open={!!selectedDay} onOpenChange={() => setSelectedDay(null)}>
          <DialogContent className="bg-white max-w-2xl max-h-[90vh] overflow-y-auto">
            {selectedDay && days.find(d => d.day_number === selectedDay) && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-black">Day {selectedDay}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {(() => {
                    const day = days.find(d => d.day_number === selectedDay);
                    return (
                      <>
                        <div>
                          <h4 className="font-medium text-[#1E1E1E] mb-2">Goal</h4>
                          <p className="text-[#2E5C6E] leading-relaxed">{day.goal}</p>
                        </div>
                        <div>
                          <h4 className="font-medium text-[#1E1E1E] mb-2">Today's Task</h4>
                          <p className="text-[#1E1E1E] leading-relaxed">{day.daily_task}</p>
                        </div>
                        {day.example && (
                          <div>
                            <h4 className="font-medium text-[#1E1E1E] mb-2">Example</h4>
                            <p className="text-[#2E5C6E] leading-relaxed">{day.example}</p>
                          </div>
                        )}
                        {day.deeper_explanation && (
                          <details className="border border-[#2E5C6E]/20 rounded-lg p-4">
                            <summary className="font-medium text-[#1E1E1E] cursor-pointer">Deeper Explanation</summary>
                            <p className="text-[#2E5C6E] mt-3 leading-relaxed">{day.deeper_explanation}</p>
                          </details>
                        )}
                        {day.thought_offering && (
                          <div className="bg-[#FAFBF9] p-4 rounded-lg border border-[#C6A85E]/30">
                            <p className="text-[#1E1E1E] italic">{day.thought_offering}</p>
                          </div>
                        )}
                        {progress && !progress.completed_days?.includes(selectedDay) && (
                          <Button
                            onClick={() => {
                              handleDayComplete(selectedDay);
                              setSelectedDay(null);
                            }}
                            className="w-full bg-[#0CC0DF] hover:bg-[#0AB0CF] text-white"
                          >
                            Mark Complete
                          </Button>
                        )}
                      </>
                    );
                  })()}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}