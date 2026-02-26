import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Home, Brain, BookOpen, HelpCircle, Settings } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

export default function Layout({ children, currentPageName }) {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isAdminPage = currentPageName?.startsWith('Admin');
  const isSchoolDashboard = currentPageName?.startsWith('School');
  
  const userRole = user?.role || 'student';
  const isStudent = userRole === 'student' || userRole === 'user';
  const isSchoolAdmin = userRole === 'school_admin';
  const isEpsyAdmin = userRole === 'epsy_admin';
  
  const showStudentNav = isStudent || isEpsyAdmin;
  const showSchoolNav = isSchoolAdmin || isEpsyAdmin;

  const studentNav = [
    { name: 'Home', icon: Home, page: 'Home' },
    { name: 'Insights', icon: Brain, page: 'InsightLibrary' },
    { name: 'Decoder', icon: BookOpen, page: 'QuestionDecoder' },
    { name: 'Builder', icon: HelpCircle, page: 'QuestionBuilder' },
    { name: 'Settings', icon: Settings, page: 'Settings' },
  ];

  const adminNav = [
    { name: 'Challenges', page: 'AdminChallenges' },
    { name: 'Decoder', page: 'AdminDecoder' },
    { name: 'Builder', page: 'AdminBuilder' },
  ];

  const schoolNav = [
    { name: 'Dashboard', page: 'SchoolDashboard' },
    { name: 'Student Access', page: 'SchoolStudentAccess' },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F1F4F6' }}>
      <main>{children}</main>

      {/* Student Bottom Nav */}
      {!isAdminPage && !isSchoolDashboard && showStudentNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white/90 backdrop-blur-lg" style={{ borderColor: '#2E5C6E' }}>
          <div className="flex items-center justify-around px-4 py-3 max-w-2xl mx-auto">
            {studentNav.map((item) => (
              <Link
                key={item.name}
                to={createPageUrl(item.page)}
                className="flex flex-col items-center px-3 py-2 rounded-xl transition-all group"
                style={{
                  color: currentPageName === item.page ? '#0CC0DF' : '#78716C'
                }}
              >
                <item.icon 
                  className="w-6 h-6 transition-transform group-active:scale-90 mb-1" 
                  strokeWidth={currentPageName === item.page ? 2.5 : 2}
                />
                <span className="text-xs">{item.name}</span>
              </Link>
            ))}
          </div>
        </nav>
      )}

      {/* Admin Top Nav */}
      {isAdminPage && (
        <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-white" style={{ borderColor: '#2E5C6E' }}>
          <div className="flex items-center gap-6 px-8 py-4">
            <span className="font-bold text-[#0CC0DF] text-lg">Epsy Admin</span>
            {adminNav.map((item) => (
              <Link
                key={item.name}
                to={createPageUrl(item.page)}
                className="text-sm font-medium transition-colors"
                style={{
                  color: currentPageName === item.page ? '#0CC0DF' : '#2E5C6E'
                }}
              >
                {item.name}
              </Link>
            ))}
          </div>
        </nav>
      )}

      {/* School Dashboard Top Nav */}
      {isSchoolDashboard && showSchoolNav && (
        <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-white" style={{ borderColor: '#2E5C6E' }}>
          <div className="flex items-center gap-6 px-8 py-4">
            <span className="font-bold text-[#0CC0DF] text-lg">School Portal</span>
            {schoolNav.map((item) => (
              <Link
                key={item.name}
                to={createPageUrl(item.page)}
                className="text-sm font-medium transition-colors"
                style={{
                  color: currentPageName === item.page ? '#0CC0DF' : '#2E5C6E'
                }}
              >
                {item.name}
              </Link>
            ))}
            {isEpsyAdmin && (
              <Link
                to={createPageUrl('Home')}
                className="ml-auto text-sm font-medium text-[#2E5C6E] hover:text-[#0CC0DF]"
              >
                → Student View
              </Link>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}