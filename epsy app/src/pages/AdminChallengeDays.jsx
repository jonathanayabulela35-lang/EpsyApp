import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Plus, Edit, Save, X, ArrowLeft } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function AdminChallengeDays() {
  const urlParams = new URLSearchParams(window.location.search);
  const challengeId = urlParams.get('challenge');

  const [editingDay, setEditingDay] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: challenge } = useQuery({
    queryKey: ['challenge', challengeId],
    queryFn: () => base44.entities.Challenge.filter({ id: challengeId }).then(r => r[0]),
    enabled: !!challengeId,
  });

  const { data: days = [] } = useQuery({
    queryKey: ['challenge-days', challengeId],
    queryFn: () => base44.entities.ChallengeDay.filter({ challenge_id: challengeId }, 'day_number'),
    enabled: !!challengeId,
  });

  const saveMutation = useMutation({
    mutationFn: (data) => 
      data.id 
        ? base44.entities.ChallengeDay.update(data.id, data)
        : base44.entities.ChallengeDay.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challenge-days', challengeId] });
      setDialogOpen(false);
      setEditingDay(null);
    },
  });

  const handleNew = () => {
    setEditingDay({
      challenge_id: challengeId,
      day_number: days.length + 1,
      goal: '',
      daily_task: '',
      example: '',
      deeper_explanation: '',
      thought_offering: '',
    });
    setDialogOpen(true);
  };

  const handleEdit = (day) => {
    setEditingDay({ ...day });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!editingDay.goal || !editingDay.daily_task) return;
    saveMutation.mutate(editingDay);
  };

  if (!challengeId) {
    return <div className="p-8">No challenge selected</div>;
  }

  return (
    <div className="min-h-screen bg-[#F2F4F1] p-8 pt-24">
      <div className="max-w-4xl mx-auto">
        <Link to={createPageUrl('AdminChallenges')} className="inline-flex items-center text-[#0CC0DF] mb-6 hover:opacity-80">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Challenges
        </Link>

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#1E1E1E]">Daily Execution</h1>
            {challenge && <p className="text-[#5F8A72] mt-1">{challenge.title}</p>}
          </div>
          <Button onClick={handleNew} className="bg-[#0CC0DF] hover:bg-[#0AB0CF] text-white">
            <Plus className="w-5 h-5 mr-2" />
            Add Day
          </Button>
        </div>

        <div className="space-y-4">
          {days.map((day) => (
            <Card key={day.id} className="bg-white border-[#5F8A72]/20">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-[#1E1E1E]">Day {day.day_number}: {day.goal}</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => handleEdit(day)}>
                  <Edit className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[#5F8A72]">{day.daily_task}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
            <DialogHeader>
              <DialogTitle className="text-[#1E1E1E]">
                {editingDay?.id ? `Edit Day ${editingDay.day_number}` : 'New Day'}
              </DialogTitle>
            </DialogHeader>

            {editingDay && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-[#1E1E1E] font-medium">Day Number</label>
                  <Input
                    type="number"
                    value={editingDay.day_number}
                    onChange={(e) => setEditingDay({ ...editingDay, day_number: parseInt(e.target.value) })}
                  />
                </div>

                <div>
                  <label className="text-sm text-[#1E1E1E] font-medium">Goal (simple explanation)</label>
                  <Textarea
                    value={editingDay.goal}
                    onChange={(e) => setEditingDay({ ...editingDay, goal: e.target.value })}
                    rows={3}
                    placeholder="What this day is about"
                  />
                </div>

                <div>
                  <label className="text-sm text-[#1E1E1E] font-medium">Daily Task</label>
                  <Textarea
                    value={editingDay.daily_task}
                    onChange={(e) => setEditingDay({ ...editingDay, daily_task: e.target.value })}
                    rows={3}
                    placeholder="Clear action for today"
                  />
                </div>

                <div>
                  <label className="text-sm text-[#1E1E1E] font-medium">Example</label>
                  <Textarea
                    value={editingDay.example}
                    onChange={(e) => setEditingDay({ ...editingDay, example: e.target.value })}
                    rows={3}
                    placeholder="Short practical example"
                  />
                </div>

                <div>
                  <label className="text-sm text-[#1E1E1E] font-medium">Deeper Explanation (optional)</label>
                  <Textarea
                    value={editingDay.deeper_explanation}
                    onChange={(e) => setEditingDay({ ...editingDay, deeper_explanation: e.target.value })}
                    rows={4}
                  />
                </div>

                <div>
                  <label className="text-sm text-[#1E1E1E] font-medium">Thought Offering</label>
                  <Textarea
                    value={editingDay.thought_offering}
                    onChange={(e) => setEditingDay({ ...editingDay, thought_offering: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={handleSave} className="bg-[#0CC0DF] hover:bg-[#0AB0CF] text-white">
                    <Save className="w-4 h-4 mr-2" />
                    Save Day
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