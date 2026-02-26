import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';

export default function InsightLibrary() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: challenges = [] } = useQuery({
    queryKey: ['published-challenges'],
    queryFn: () => base44.entities.Challenge.filter({ published: true }, 'order'),
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
            Psychological Insight Library
          </h1>
          <p className="text-[#2E5C6E]">
            Navigate real-life student challenges with structured guidance
          </p>
        </motion.div>

        {challenges.length === 0 ? (
          <Card className="bg-white border-[#2E5C6E]/20">
            <CardContent className="p-12 text-center">
              <p className="text-[#2E5C6E]">No challenges available yet. Check back soon!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {challenges.map((challenge, idx) => (
              <motion.div
                key={challenge.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Link to={createPageUrl(`ChallengeView?id=${challenge.id}`)}>
                  <Card className="bg-white border-[#2E5C6E]/20 hover:border-[#0CC0DF]/40 transition-all h-full cursor-pointer group">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <span className="text-3xl">{challenge.icon}</span>
                          <CardTitle className="text-[#1E1E1E] group-hover:text-[#0CC0DF] transition-colors">
                            {challenge.title}
                          </CardTitle>
                        </div>
                        <ChevronRight className="w-5 h-5 text-[#2E5C6E] group-hover:text-[#0CC0DF] transition-colors flex-shrink-0" />
                      </div>
                    </CardHeader>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}