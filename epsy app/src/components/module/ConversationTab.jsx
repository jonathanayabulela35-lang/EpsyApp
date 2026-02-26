import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Plus, MessageSquare, Clock, MoreVertical, Trash2, Edit2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { Card } from "@/components/ui/card";
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function ConversationTab({ moduleName }) {
  const queryClient = useQueryClient();
  const [renamingSession, setRenamingSession] = useState(null);
  const [newTitle, setNewTitle] = useState('');

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ['sessions', moduleName],
    queryFn: () => base44.entities.StudySession.filter({ subject: moduleName, status: 'active' }, '-updated_date'),
    staleTime: 30000,
    placeholderData: (previousData) => previousData,
  });

  const createSessionMutation = useMutation({
    mutationFn: (data) => base44.entities.StudySession.create(data),
    onSuccess: (newSession) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      window.location.href = createPageUrl(`Study?id=${newSession.id}`);
    },
  });

  const deleteSessionMutation = useMutation({
    mutationFn: (id) => base44.entities.StudySession.update(id, { status: 'archived' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', moduleName] });
    },
  });

  const renameSessionMutation = useMutation({
    mutationFn: ({ id, title }) => base44.entities.StudySession.update(id, { title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', moduleName] });
      setRenamingSession(null);
      setNewTitle('');
    },
  });

  const handleNewConversation = () => {
    createSessionMutation.mutate({
      title: `${moduleName} - ${format(new Date(), 'MMM d, h:mm a')}`,
      subject: moduleName,
      materials: [],
      conversation: [],
      status: 'active',
    });
  };

  const handleRename = (session) => {
    setRenamingSession(session);
    setNewTitle(session.title);
  };

  const handleRenameSubmit = () => {
    if (newTitle.trim()) {
      renameSessionMutation.mutate({ id: renamingSession.id, title: newTitle });
    }
  };

  return (
    <div className="h-full overflow-y-auto p-4">
      <Button
        onClick={handleNewConversation}
        disabled={createSessionMutation.isPending}
        className="w-full rounded-2xl py-6 text-base mb-6 font-semibold"
        style={{ 
          backgroundColor: 'var(--theme-primary)', 
          color: 'var(--theme-text, #1C1917)'
        }}
      >
        <Plus className="w-5 h-5 mr-2" />
        New Conversation
      </Button>

      <div className="space-y-3">
        {sessions.length > 0 && (
          <h3 className="text-xs font-medium text-stone-500 uppercase tracking-wide">
            Conversations
          </h3>
        )}

        {sessionsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-white/50 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : sessions.length > 0 ? (
          <div className="space-y-3">
            {sessions.map((session, idx) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="p-4 bg-white hover:shadow-md transition-all border-0 rounded-2xl group shadow-sm">
                  <div className="flex items-center gap-3">
                    <Link to={createPageUrl(`Study?id=${session.id}`)} className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--theme-primary, #E5E4E2)' }}>
                        <MessageSquare className="w-5 h-5" style={{ color: 'var(--theme-text, #1C1917)' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-stone-800 truncate text-sm">
                          {session.title}
                        </h4>
                        <div className="flex items-center gap-1 text-xs text-stone-400 mt-0.5">
                          <Clock className="w-3 h-3" />
                          <span>{format(new Date(session.updated_date || session.created_date), 'MMM d, h:mm a')}</span>
                        </div>
                      </div>
                    </Link>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="rounded-xl h-8 w-8">
                          <MoreVertical className="w-4 h-4 text-stone-500" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleRename(session)}>
                          <Edit2 className="w-4 h-4 mr-2" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => deleteSessionMutation.mutate(session.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card className="p-8 bg-white/70 border-0 rounded-2xl text-center">
            <MessageSquare className="w-10 h-10 text-stone-300 mx-auto mb-3" />
            <p className="text-stone-500 text-sm">No conversations yet</p>
          </Card>
        )}
      </div>

      {/* Rename Dialog */}
      <Dialog open={!!renamingSession} onOpenChange={() => setRenamingSession(null)}>
        <DialogContent className="bg-white max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle>Rename Conversation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Conversation title..."
              className="rounded-xl"
              onKeyDown={(e) => e.key === 'Enter' && handleRenameSubmit()}
            />
            <Button 
              onClick={handleRenameSubmit} 
              className="w-full rounded-xl font-semibold" 
              style={{ backgroundColor: 'var(--theme-primary)', color: 'var(--theme-text)' }}
            >
              Rename
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}