import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Plus, Edit, Save, X, Eye, EyeOff } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function AdminBuilder() {
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: templates = [] } = useQuery({
    queryKey: ['question-templates'],
    queryFn: () => base44.entities.QuestionTemplate.list('order'),
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const saveMutation = useMutation({
    mutationFn: (data) => 
      data.id 
        ? base44.entities.QuestionTemplate.update(data.id, data)
        : base44.entities.QuestionTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['question-templates'] });
      setDialogOpen(false);
      setEditingTemplate(null);
    },
  });

  const togglePublishMutation = useMutation({
    mutationFn: ({ id, published }) => 
      base44.entities.QuestionTemplate.update(id, { published }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['question-templates'] });
    },
  });

  const handleNew = () => {
    setEditingTemplate({
      subject: '',
      category: 'confusion-identifier',
      template_text: '',
      guidance: '',
      weak_example: '',
      strong_example: '',
      published: false,
      order: templates.length,
    });
    setDialogOpen(true);
  };

  const handleEdit = (template) => {
    setEditingTemplate({ ...template });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!editingTemplate.subject || !editingTemplate.template_text) return;
    saveMutation.mutate(editingTemplate);
  };

  return (
    <div className="min-h-screen bg-[#F2F4F1] p-8 pt-24">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-[#1E1E1E]">Question Builder Templates</h1>
          <Button onClick={handleNew} className="bg-[#0CC0DF] hover:bg-[#0AB0CF] text-white">
            <Plus className="w-5 h-5 mr-2" />
            New Template
          </Button>
        </div>

        <div className="grid gap-4">
          {templates.map((template) => (
            <Card key={template.id} className="bg-white border-[#5F8A72]/20">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <CardTitle className="text-[#1E1E1E]">{template.subject}</CardTitle>
                    <p className="text-sm text-[#5F8A72]">{template.category}</p>
                  </div>
                  {template.published && (
                    <span className="text-xs bg-[#2E5C6E] text-white px-2 py-1 rounded">Published</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => togglePublishMutation.mutate({ 
                      id: template.id, 
                      published: !template.published 
                    })}
                  >
                    {template.published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(template)}>
                    <Edit className="w-4 h-4" />
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
                {editingTemplate?.id ? 'Edit Template' : 'New Template'}
              </DialogTitle>
            </DialogHeader>

            {editingTemplate && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-[#1E1E1E] font-medium">Subject</label>
                    <Input
                      value={editingTemplate.subject}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                      placeholder="Mathematics"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-[#1E1E1E] font-medium">Category</label>
                    <Input
                      value={editingTemplate.category}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, category: e.target.value })}
                      placeholder="confusion-identifier"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm text-[#1E1E1E] font-medium">Template Text</label>
                  <Textarea
                    value={editingTemplate.template_text}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, template_text: e.target.value })}
                    rows={3}
                    placeholder="I don't understand [concept] when [situation]"
                  />
                </div>

                <div>
                  <label className="text-sm text-[#1E1E1E] font-medium">Guidance</label>
                  <Textarea
                    value={editingTemplate.guidance}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, guidance: e.target.value })}
                    rows={3}
                    placeholder="How to use this template"
                  />
                </div>

                <div>
                  <label className="text-sm text-[#1E1E1E] font-medium">Weak Example</label>
                  <Textarea
                    value={editingTemplate.weak_example}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, weak_example: e.target.value })}
                    rows={2}
                  />
                </div>

                <div>
                  <label className="text-sm text-[#1E1E1E] font-medium">Strong Example</label>
                  <Textarea
                    value={editingTemplate.strong_example}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, strong_example: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={handleSave} className="bg-[#0CC0DF] hover:bg-[#0AB0CF] text-white">
                    <Save className="w-4 h-4 mr-2" />
                    Save Template
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