import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';

export default function AccountAccess() {
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

  const isActive = user?.access_status === 'active';

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
          className="space-y-6"
        >
          <div>
            <h1 className="text-3xl font-bold text-black mb-2">Account Access</h1>
            <p className="text-[#2E5C6E]">Your access to EpsyApp is managed by your school.</p>
          </div>

          <Card className="bg-[#FAFBF9] border-[#2E5C6E]/20">
            <CardHeader>
              <CardTitle className="text-[#1E1E1E]">Access Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-[#2E5C6E] mb-1">School Name</p>
                  <p className="text-lg font-medium text-[#1E1E1E]">
                    {user?.school_name || 'Not Assigned'}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-[#2E5C6E] mb-1">Access Type</p>
                  <p className="text-lg font-medium text-[#1E1E1E]">School Licensed</p>
                </div>
              </div>

              <div className="pt-4 border-t border-[#2E5C6E]/10">
                <p className="text-sm text-[#2E5C6E] mb-2">Status</p>
                <div className="flex items-center gap-3">
                  {isActive ? (
                    <>
                      <div className="w-10 h-10 rounded-full bg-[#0CC0DF]/10 flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-[#0CC0DF]" />
                      </div>
                      <div>
                        <p className="text-lg font-medium text-[#0CC0DF]">Active</p>
                        <p className="text-sm text-[#2E5C6E]">Your access is currently active</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                        <AlertCircle className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="text-lg font-medium text-gray-700">Inactive</p>
                        <p className="text-sm text-[#2E5C6E]">
                          Please contact your school administrator to restore access.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}