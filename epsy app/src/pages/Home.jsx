import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Brain, BookOpen, HelpCircle, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const navigate = useNavigate();

  const { data: progress = [] } = useQuery({
    queryKey: ['student-progress'],
    queryFn: () => base44.entities.StudentProgress.list('-last_accessed'),
  });

  const features = [
    {
      title: 'Psychological Insight Library',
      description: 'Navigate real-life student challenges with structured guidance',
      icon: Brain,
      color: '#0CC0DF',
      link: 'InsightLibrary',
    },
    {
      title: 'Question Decoder',
      description: 'Master academic question interpretation',
      icon: BookOpen,
      color: '#2E5C6E',
      link: 'QuestionDecoder',
    },
    {
      title: 'Question Builder',
      description: 'Learn to ask better academic questions',
      icon: HelpCircle,
      color: '#0CC0DF',
      link: 'QuestionBuilder',
    },
  ];

  const displayName = user?.display_name || user?.full_name?.split(' ')[0] || '';
  const greeting = displayName ? `Welcome back, ${displayName}.` : 'Welcome back.';

  // Redirect school admin to school dashboard (but not epsy_admin)
  React.useEffect(() => {
    if (user?.role === 'school_admin') {
      navigate(createPageUrl('SchoolDashboard'));
    }
  }, [user, navigate]);

  // Block school_admin from accessing student pages
  if (user?.role === 'school_admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#F1F4F6] px-4 md:px-8 py-8 pb-24">
      <div className="max-w-4xl mx-auto">
        {/* Welcome */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-black mb-3">
            {greeting}
          </h1>
          <p className="text-xl text-[#2E5C6E]">
            It's All About Mentality.
          </p>
        </motion.div>

        {/* Active Progress */}
        {progress.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-[#1E1E1E] mb-4">Continue Your Journey</h2>
            <div className="space-y-3">
              {progress.slice(0, 2).map((item) => (
                <Link key={item.id} to={createPageUrl(`ChallengeView?id=${item.challenge_id}`)}>
                  <Card className="bg-white border-[#2E5C6E]/20 hover:border-[#0CC0DF]/40 transition-all cursor-pointer">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-[#1E1E1E]">{item.code_name || 'Your Challenge'}</p>
                        <p className="text-sm text-[#2E5C6E]">Day {item.current_day}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-[#2E5C6E]" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Main Features */}
        <h2 className="text-lg font-semibold text-[#1E1E1E] mb-4">Explore</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {features.map((feature, idx) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Link to={createPageUrl(feature.link)}>
                <Card className="bg-white border-[#2E5C6E]/20 hover:border-[#0CC0DF]/40 transition-all h-full cursor-pointer group">
                  <CardHeader>
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                      style={{ backgroundColor: feature.color }}
                    >
                      <feature.icon className="w-6 h-6 text-white" />
                    </div>
                    <CardTitle className="text-[#1E1E1E] text-base mb-2 group-hover:text-[#0CC0DF] transition-colors">
                      {feature.title}
                    </CardTitle>
                    <p className="text-sm text-[#2E5C6E] leading-relaxed">
                      {feature.description}
                    </p>
                  </CardHeader>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}