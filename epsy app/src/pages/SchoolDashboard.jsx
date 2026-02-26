import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, CheckCircle, AlertCircle, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function SchoolDashboard() {
  const navigate = useNavigate();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
    enabled: user?.role === 'school_admin',
  });

  const { data: schoolPlan } = useQuery({
    queryKey: ['school-plan'],
    queryFn: () => base44.entities.SchoolPlan.filter({ school_name: user?.school_name }).then(r => r[0]),
    enabled: user?.role === 'school_admin' && !!user?.school_name,
  });

  // Loading state
  if (!user) {
    return <div className="min-h-screen bg-[#F1F4F6] p-8">Loading...</div>;
  }

  // Access denied for students (but allow school_admin and epsy_admin)
  const hasAccess = user.role === 'school_admin' || user.role === 'epsy_admin';
  
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-[#F1F4F6] p-8 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-[#1E1E1E]">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[#2E5C6E] mb-4">
              This area is for school administrators only.
            </p>
            <Button onClick={() => navigate(createPageUrl('Home'))} className="bg-[#0CC0DF] hover:bg-[#0AB0CF]">
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const students = allUsers.filter(u => u.role === 'student' || u.role === 'user');
  const activeStudents = students.filter(s => s.access_status === 'active');

  return (
    <div className="min-h-screen bg-[#F1F4F6] px-4 md:px-8 py-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div>
            <h1 className="text-3xl font-bold text-[#2E5C6E] mb-2">School Dashboard</h1>
            <p className="text-[#2E5C6E]">{user.school_name || 'School Administration'}</p>
          </div>

          {/* Summary Cards */}
          <div className="grid md:grid-cols-4 gap-6">
            <Card className="bg-[#FAFBF9] border-[#2E5C6E]/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#0CC0DF]/10 flex items-center justify-center">
                    <Users className="w-6 h-6 text-[#0CC0DF]" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#1E1E1E]">{activeStudents.length}</p>
                    <p className="text-sm text-[#2E5C6E]">Active Students</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#FAFBF9] border-[#2E5C6E]/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#0CC0DF]/10 flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-[#0CC0DF]" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#1E1E1E]">{students.length}</p>
                    <p className="text-sm text-[#2E5C6E]">Total Registered</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#FAFBF9] border-[#2E5C6E]/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#0CC0DF]/10 flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-[#0CC0DF]" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-[#1E1E1E]">{schoolPlan?.status || 'Active'}</p>
                    <p className="text-sm text-[#2E5C6E]">Access Status</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#FAFBF9] border-[#2E5C6E]/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#0CC0DF]/10 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-[#0CC0DF]" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-[#1E1E1E]">{schoolPlan?.plan_type || 'Monthly'}</p>
                    <p className="text-sm text-[#2E5C6E]">Plan Type</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Navigation */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="bg-white border-[#2E5C6E]/20">
              <CardHeader>
                <CardTitle className="text-[#1E1E1E] text-lg">Student Access Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[#2E5C6E]">Coming soon</p>
              </CardContent>
            </Card>

            <Card className="bg-white border-[#2E5C6E]/20">
              <CardHeader>
                <CardTitle className="text-[#1E1E1E] text-lg">Usage Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[#2E5C6E]">Coming soon</p>
              </CardContent>
            </Card>

            <Card className="bg-white border-[#2E5C6E]/20">
              <CardHeader>
                <CardTitle className="text-[#1E1E1E] text-lg">Plan & Billing</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[#2E5C6E]">Coming soon</p>
              </CardContent>
            </Card>
          </div>

          {/* Privacy Notice */}
          <Alert className="bg-[#FAFBF9] border-[#2E5C6E]/20">
            <AlertCircle className="h-5 w-5 text-[#2E5C6E]" />
            <AlertDescription className="text-[#2E5C6E]">
              Student privacy is protected. Individual psychological insights, challenges, and personal growth data are not accessible through this dashboard.
            </AlertDescription>
          </Alert>
        </motion.div>
      </div>
    </div>
  );
}