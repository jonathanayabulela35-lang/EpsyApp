import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ArrowLeft, Bookmark, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { Switch } from "@/components/ui/switch";

export default function Personalisation() {
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState('');

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

  const { data: wordBookmarks = [] } = useQuery({
    queryKey: ['word-bookmarks'],
    queryFn: () => base44.entities.WordBookmark.list(),
  });

  const updateUserMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
  });

  const clearBookmarksMutation = useMutation({
    mutationFn: async () => {
      for (const bookmark of wordBookmarks) {
        await base44.entities.WordBookmark.delete(bookmark.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['word-bookmarks'] });
    },
  });

  const handleProgressDisplayChange = (value) => {
    updateUserMutation.mutate({ progress_display: value });
  };

  const handleWordBookmarkToggle = (enabled) => {
    updateUserMutation.mutate({ word_bookmark_enabled: enabled });
  };

  const handleSaveDisplayName = () => {
    updateUserMutation.mutate({ display_name: displayName.trim() });
  };

  React.useEffect(() => {
    if (user?.display_name) {
      setDisplayName(user.display_name);
    }
  }, [user]);

  const progressOptions = [
    { value: 'weekly', label: 'Show weekly progress summary' },
    { value: 'total', label: 'Show total small steps completed' },
    { value: 'both', label: 'Show both' },
    { value: 'hidden', label: 'Hide progress summary' },
  ];

  return (
    <div className="min-h-screen bg-[#F1F4F6] px-4 md:px-8 py-8 pb-24">
      <div className="max-w-3xl mx-auto">
        <Link to={createPageUrl('Settings')} className="inline-flex items-center text-black mb-6 hover:opacity-80">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Settings
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div>
            <h1 className="text-3xl font-bold text-black mb-2">Personalisation</h1>
            <p className="text-[#2E5C6E]">Customize your Wisa experience</p>
          </div>

          {/* Display Name */}
          <Card className="bg-white border-[#2E5C6E]/20">
            <CardHeader>
              <CardTitle className="text-[#1E1E1E] text-lg">Display Name</CardTitle>
              <p className="text-sm text-[#2E5C6E]">
                This name will appear on your home page greeting.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Kimberly"
                className="border-[#2E5C6E]/30 focus:border-[#0CC0DF]"
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleSaveDisplayName}
                  className="bg-[#0CC0DF] hover:bg-[#0AB0CF] text-white"
                >
                  Save Name
                </Button>
                <Button
                  onClick={() => {
                    setDisplayName('');
                    updateUserMutation.mutate({ display_name: '' });
                  }}
                  variant="outline"
                  className="border-[#2E5C6E]/30"
                >
                  Reset to Default
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Micro-Progress Display Settings */}
          <Card className="bg-white border-[#2E5C6E]/20">
            <CardHeader>
              <CardTitle className="text-[#1E1E1E] text-lg">Progress Display</CardTitle>
              <p className="text-sm text-[#2E5C6E]">
                Choose how you want your progress to appear.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {progressOptions.map((option) => (
                <div
                  key={option.value}
                  onClick={() => handleProgressDisplayChange(option.value)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    (user?.progress_display || 'both') === option.value
                      ? 'border-[#0CC0DF] bg-[#0CC0DF]/5'
                      : 'border-[#2E5C6E]/20 hover:border-[#2E5C6E]/40'
                  }`}
                >
                  <p className="font-medium text-[#1E1E1E]">{option.label}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Vocabulary Bookmark Settings */}
          <Card className="bg-white border-[#2E5C6E]/20">
            <CardHeader>
              <CardTitle className="text-[#1E1E1E] text-lg">Saved Words</CardTitle>
              <p className="text-sm text-[#2E5C6E]">
                Save words you don't understand from academic questions.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-[#FAFBF9]">
                <span className="text-[#1E1E1E]">Enable word bookmarking</span>
                <Switch
                  checked={user?.word_bookmark_enabled !== false}
                  onCheckedChange={handleWordBookmarkToggle}
                />
              </div>
              {wordBookmarks.length > 0 && (
                <div className="flex items-center justify-between p-4 rounded-xl bg-[#FAFBF9]">
                  <div>
                    <p className="text-[#1E1E1E] font-medium">
                      <Bookmark className="w-4 h-4 inline mr-2" />
                      {wordBookmarks.length} saved word{wordBookmarks.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <Button
                    onClick={() => clearBookmarksMutation.mutate()}
                    variant="outline"
                    size="sm"
                    className="border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear All
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}