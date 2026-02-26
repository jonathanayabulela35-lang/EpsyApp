import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Image, Type, MessageSquare, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function SessionCard({ session }) {
  const materialCounts = {
    pdf: session.materials?.filter(m => m.type === 'pdf').length || 0,
    image: session.materials?.filter(m => m.type === 'image').length || 0,
    text: session.materials?.filter(m => m.type === 'text').length || 0,
  };

  const messageCount = session.conversation?.length || 0;

  return (
    <Link to={createPageUrl(`Study?id=${session.id}`)}>
      <Card className="p-5 hover:shadow-lg transition-all duration-300 border-stone-200 hover:border-[#191970]/30 cursor-pointer group">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-stone-800 truncate group-hover:text-[#191970] transition-colors">
              {session.title || 'Untitled Session'}
            </h3>
            {session.subject && (
              <Badge variant="secondary" className="mt-1 bg-stone-100 text-stone-600 text-xs">
                {session.subject}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-stone-400">
            <Clock className="w-3 h-3" />
            {format(new Date(session.updated_date || session.created_date), 'MMM d')}
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-stone-500">
          {materialCounts.pdf > 0 && (
            <div className="flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-red-400" />
              <span>{materialCounts.pdf}</span>
            </div>
          )}
          {materialCounts.image > 0 && (
            <div className="flex items-center gap-1">
              <Image className="w-3.5 h-3.5 text-blue-400" />
              <span>{materialCounts.image}</span>
            </div>
          )}
          {materialCounts.text > 0 && (
            <div className="flex items-center gap-1">
              <Type className="w-3.5 h-3.5 text-green-400" />
              <span>{materialCounts.text}</span>
            </div>
          )}
          {messageCount > 0 && (
            <div className="flex items-center gap-1 ml-auto">
              <MessageSquare className="w-3.5 h-3.5 text-[#191970]" />
              <span>{messageCount} messages</span>
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}