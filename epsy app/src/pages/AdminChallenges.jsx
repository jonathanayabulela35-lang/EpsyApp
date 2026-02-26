import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Plus, Edit, Save, X, Eye, EyeOff, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function AdminChallenges() {
  const [editingChallenge, setEditingChallenge] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: challenges = [] } = useQuery({
    queryKey: ['challenges'],
    queryFn: () => base44.entities.Challenge.list('-order'),
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const saveMutation = useMutation({
    mutationFn: (data) => 
      data.id 
        ? base44.entities.Challenge.update(data.id, data)
        : base44.entities.Challenge.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
      setDialogOpen(false);
      setEditingChallenge(null);
    },
  });

  const togglePublishMutation = useMutation({
    mutationFn: ({ id, published }) => 
      base44.entities.Challenge.update(id, { published }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
    },
  });

  const handleNew = () => {
    setEditingChallenge({
      title: '',
      slug: '',
      icon: '💭',
      why_this_happens: '',
      how_to_reframe: '',
      if_you_ignore: '',
      if_you_act: '',
      full_breakdown: '',
      thought_offering: '',
      execution_overview: [
        { day: 1, label: 'Awareness' },
        { day: 2, label: 'Reframing' },
        { day: 3, label: 'Small Action' },
        { day: 4, label: 'Consistency' },
        { day: 5, label: 'Reinforcement' },
      ],
      published: false,
      order: challenges.length,
    });
    setDialogOpen(true);
  };

  const handleEdit = (challenge) => {
    setEditingChallenge({ ...challenge });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!editingChallenge.title || !editingChallenge.slug) return;
    saveMutation.mutate(editingChallenge);
  };

  return (
    <div className="min-h-screen bg-[#F2F4F1] p-8 pt-24">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-[#1E1E1E]">Psychological Insight Library</h1>
          <Button onClick={handleNew} className="bg-[#0CC0DF] hover:bg-[#0AB0CF] text-white">
            <Plus className="w-5 h-5 mr-2" />
            New Challenge
          </Button>
        </div>

        <div className="grid gap-4">
          {challenges.map((challenge) => (
            <Card key={challenge.id} className="bg-white border-[#5F8A72]/20">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{challenge.icon}</span>
                  <CardTitle className="text-[#1E1E1E]">{challenge.title}</CardTitle>
                  {challenge.published && (
                    <span className="text-xs bg-[#2E5C6E] text-white px-2 py-1 rounded">Published</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => togglePublishMutation.mutate({ 
                      id: challenge.id, 
                      published: !challenge.published 
                    })}
                  >
                    {challenge.published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(challenge)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => navigate(createPageUrl(`AdminChallengeDays?challenge=${challenge.id}`))}
                  >
                    <Calendar className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white">
            <DialogHeader>
              <DialogTitle className="text-[#1E1E1E]">
                {editingChallenge?.id ? 'Edit Challenge' : 'New Challenge'}
              </DialogTitle>
            </DialogHeader>

            {editingChallenge && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-[#1E1E1E] font-medium">Title</label>
                    <Input
                      value={editingChallenge.title}
                      onChange={(e) => setEditingChallenge({ ...editingChallenge, title: e.target.value })}
                      placeholder="Exam Anxiety"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-[#1E1E1E] font-medium">Slug</label>
                    <Input
                      value={editingChallenge.slug}
                      onChange={(e) => setEditingChallenge({ ...editingChallenge, slug: e.target.value })}
                      placeholder="exam-anxiety"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm text-[#1E1E1E] font-medium">Icon (emoji)</label>
                  <Input
                    value={editingChallenge.icon}
                    onChange={(e) => setEditingChallenge({ ...editingChallenge, icon: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-sm text-[#1E1E1E] font-medium">Why This Happens</label>
                  <Textarea
                    value={editingChallenge.why_this_happens}
                    onChange={(e) => setEditingChallenge({ ...editingChallenge, why_this_happens: e.target.value })}
                    rows={4}
                  />
                </div>

                <div>
                  <label className="text-sm text-[#1E1E1E] font-medium">How to Reframe It</label>
                  <Textarea
                    value={editingChallenge.how_to_reframe}
                    onChange={(e) => setEditingChallenge({ ...editingChallenge, how_to_reframe: e.target.value })}
                    rows={4}
                  />
                </div>

                <div>
                  <label className="text-sm text-[#1E1E1E] font-medium">If You Ignore It</label>
                  <Textarea
                    value={editingChallenge.if_you_ignore}
                    onChange={(e) => setEditingChallenge({ ...editingChallenge, if_you_ignore: e.target.value })}
                    rows={3}
                  />
                </div>

                <div>
                  <label className="text-sm text-[#1E1E1E] font-medium">If You Act On It</label>
                  <Textarea
                    value={editingChallenge.if_you_act}
                    onChange={(e) => setEditingChallenge({ ...editingChallenge, if_you_act: e.target.value })}
                    rows={3}
                  />
                </div>

                <div>
                  <label className="text-sm text-[#1E1E1E] font-medium">Full Breakdown (optional)</label>
                  <Textarea
                    value={editingChallenge.full_breakdown}
                    onChange={(e) => setEditingChallenge({ ...editingChallenge, full_breakdown: e.target.value })}
                    rows={5}
                  />
                </div>

                <div>
                  <label className="text-sm text-[#1E1E1E] font-medium">Thought Offering</label>
                  <Textarea
                    value={editingChallenge.thought_offering}
                    onChange={(e) => setEditingChallenge({ ...editingChallenge, thought_offering: e.target.value })}
                    rows={2}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm text-[#1E1E1E] font-medium">Daily Execution Overview</label>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const newOverview = [...(editingChallenge.execution_overview || [])];
                        newOverview.push({ day: newOverview.length + 1, label: '' });
                        setEditingChallenge({ ...editingChallenge, execution_overview: newOverview });
                      }}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Day
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {editingChallenge.execution_overview?.map((step, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <Input
                          value={`Day ${step.day}`}
                          disabled
                          className="w-24"
                        />
                        <Input
                          placeholder="Label (e.g., Awareness)"
                          value={step.label}
                          onChange={(e) => {
                            const updated = [...editingChallenge.execution_overview];
                            updated[idx].label = e.target.value;
                            setEditingChallenge({ ...editingChallenge, execution_overview: updated });
                          }}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            const updated = editingChallenge.execution_overview.filter((_, i) => i !== idx);
                            setEditingChallenge({ ...editingChallenge, execution_overview: updated });
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  {editingChallenge.id && (
                    <p className="text-xs text-[#2E5C6E] mt-2">
                      After saving, use the calendar icon to manage detailed daily content
                    </p>
                  )}
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={handleSave} className="bg-[#0CC0DF] hover:bg-[#0AB0CF] text-white">
                    <Save className="w-4 h-4 mr-2" />
                    Save Challenge
                  </Button>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}