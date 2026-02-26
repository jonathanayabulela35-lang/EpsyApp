import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { User, LogOut, Sliders, ChevronRight, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';

export default function Settings() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const handleLogout = () => {
    base44.auth.logout();
  };

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
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <h1 className="text-3xl font-bold text-black mb-8">Settings</h1>

          {/* Profile Card */}
          <Card className="bg-white border-[#2E5C6E]/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-[#0CC0DF]/10 flex items-center justify-center">
                  <User className="w-7 h-7 text-[#0CC0DF]" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#1E1E1E]">{user?.full_name || 'User'}</h3>
                  <p className="text-sm text-[#2E5C6E]">{user?.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personalisation Link */}
          <Link to={createPageUrl('Personalisation')}>
            <Card className="bg-white border-[#2E5C6E]/20 hover:border-[#0CC0DF]/40 transition-all cursor-pointer mt-6">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#0CC0DF]/10 flex items-center justify-center">
                      <Sliders className="w-6 h-6 text-[#0CC0DF]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#1E1E1E]">Personalisation</h3>
                      <p className="text-sm text-[#2E5C6E]">Display name, progress display</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[#2E5C6E]" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Account Access Link */}
          <Link to={createPageUrl('AccountAccess')}>
            <Card className="bg-white border-[#2E5C6E]/20 hover:border-[#0CC0DF]/40 transition-all cursor-pointer mt-6">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#0CC0DF]/10 flex items-center justify-center">
                      <Shield className="w-6 h-6 text-[#0CC0DF]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#1E1E1E]">Account Access</h3>
                      <p className="text-sm text-[#2E5C6E]">School licensing and status</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[#2E5C6E]" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Logout */}
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full rounded-xl border-[#2E5C6E]/30 text-[#2E5C6E] hover:bg-[#2E5C6E]/10 mt-8"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Log Out
          </Button>
        </motion.div>
      </div>
    </div>
  );
}