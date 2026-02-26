import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Plus, Edit, Save, X, Eye, EyeOff, Trash } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function AdminDecoder() {
  const [editingContent, setEditingContent] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: decoderContent = [] } = useQuery({
    queryKey: ['decoder-content'],
    queryFn: () => base44.entities.DecoderContent.list(),
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const saveMutation = useMutation({
    mutationFn: (data) => 
      data.id 
        ? base44.entities.DecoderContent.update(data.id, data)
        : base44.entities.DecoderContent.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decoder-content'] });
      setDialogOpen(false);
      setEditingContent(null);
    },
  });

  const togglePublishMutation = useMutation({
    mutationFn: ({ id, published }) => 
      base44.entities.DecoderContent.update(id, { published }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decoder-content'] });
    },
  });

  const handleNew = () => {
    setEditingContent({
      subject: '',
      instruction_words: [],
      question_structure: '',
      how_to_respond: '',
      how_to_remember: '',
      common_traps: [],
      watch_for: [],
      past_paper_examples: [],
      published: false,
    });
    setDialogOpen(true);
  };

  const handleEdit = (content) => {
    setEditingContent({ ...content });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!editingContent.subject) return;
    saveMutation.mutate(editingContent);
  };

  const addInstructionWord = () => {
    setEditingContent({
      ...editingContent,
      instruction_words: [
        ...(editingContent.instruction_words || []),
        { word: '', meaning: '', what_required: '', example: '' }
      ]
    });
  };

  const updateInstructionWord = (index, field, value) => {
    const updated = [...editingContent.instruction_words];
    updated[index][field] = value;
    setEditingContent({ ...editingContent, instruction_words: updated });
  };

  const removeInstructionWord = (index) => {
    setEditingContent({
      ...editingContent,
      instruction_words: editingContent.instruction_words.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="min-h-screen bg-[#F2F4F1] p-8 pt-24">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-[#1E1E1E]">Question Decoder</h1>
          <Button onClick={handleNew} className="bg-[#0CC0DF] hover:bg-[#0AB0CF] text-white">
            <Plus className="w-5 h-5 mr-2" />
            New Subject
          </Button>
        </div>

        <div className="grid gap-4">
          {decoderContent.map((content) => (
            <Card key={content.id} className="bg-white border-[#5F8A72]/20">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-[#1E1E1E]">{content.subject}</CardTitle>
                  {content.published && (
                    <span className="text-xs bg-[#2E5C6E] text-white px-2 py-1 rounded">Published</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => togglePublishMutation.mutate({ 
                      id: content.id, 
                      published: !content.published 
                    })}
                  >
                    {content.published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(content)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
            <DialogHeader>
              <DialogTitle className="text-[#1E1E1E]">
                {editingContent?.id ? 'Edit Subject' : 'New Subject'}
              </DialogTitle>
            </DialogHeader>

            {editingContent && (
              <div className="space-y-6">
                <div>
                  <label className="text-sm text-[#1E1E1E] font-medium">Subject Name</label>
                  <Input
                    value={editingContent.subject}
                    onChange={(e) => setEditingContent({ ...editingContent, subject: e.target.value })}
                    placeholder="Mathematics"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-sm text-[#1E1E1E] font-medium">Instruction Words</label>
                    <Button size="sm" variant="outline" onClick={addInstructionWord}>
                      <Plus className="w-4 h-4 mr-1" />
                      Add Word
                    </Button>
                  </div>
                  {editingContent.instruction_words?.map((word, idx) => (
                    <div key={idx} className="border border-[#5F8A72]/20 rounded-lg p-4 mb-3 space-y-3">
                      <div className="flex justify-between">
                        <Input
                          placeholder="Word (e.g., Analyse)"
                          value={word.word}
                          onChange={(e) => updateInstructionWord(idx, 'word', e.target.value)}
                          className="flex-1 mr-2"
                        />
                        <Button size="sm" variant="ghost" onClick={() => removeInstructionWord(idx)}>
                          <Trash className="w-4 h-4" />
                        </Button>
                      </div>
                      <Input
                        placeholder="Meaning"
                        value={word.meaning}
                        onChange={(e) => updateInstructionWord(idx, 'meaning', e.target.value)}
                      />
                      <Textarea
                        placeholder="What's required in answers"
                        value={word.what_required}
                        onChange={(e) => updateInstructionWord(idx, 'what_required', e.target.value)}
                        rows={2}
                      />
                      <Textarea
                        placeholder="Example"
                        value={word.example}
                        onChange={(e) => updateInstructionWord(idx, 'example', e.target.value)}
                        rows={2}
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <label className="text-sm text-[#1E1E1E] font-medium">How Questions Are Framed</label>
                  <Textarea
                    value={editingContent.question_structure}
                    onChange={(e) => setEditingContent({ ...editingContent, question_structure: e.target.value })}
                    rows={4}
                    placeholder="How questions are framed in this subject"
                  />
                </div>

                <div>
                  <label className="text-sm text-[#1E1E1E] font-medium">How to Respond</label>
                  <Textarea
                    value={editingContent.how_to_respond || ''}
                    onChange={(e) => setEditingContent({ ...editingContent, how_to_respond: e.target.value })}
                    rows={6}
                    placeholder="Step-by-step response structure, common mistakes to avoid..."
                  />
                </div>

                <div>
                  <label className="text-sm text-[#1E1E1E] font-medium">How to Remember the Response</label>
                  <Textarea
                    value={editingContent.how_to_remember || ''}
                    onChange={(e) => setEditingContent({ ...editingContent, how_to_remember: e.target.value })}
                    rows={4}
                    placeholder="Memory cues, acronyms, frameworks for recall..."
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={handleSave} className="bg-[#0CC0DF] hover:bg-[#0AB0CF] text-white">
                    <Save className="w-4 h-4 mr-2" />
                    Save Subject
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