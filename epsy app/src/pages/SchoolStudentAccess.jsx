import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Download, RotateCcw, Ban, Search } from 'lucide-react';
import { toast } from "sonner";

export default function SchoolStudentAccess() {
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [generateCount, setGenerateCount] = useState('');
  const [generateGrade, setGenerateGrade] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [generatedCredentials, setGeneratedCredentials] = useState(null);
  
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: school } = useQuery({
    queryKey: ['current-school'],
    queryFn: async () => {
      const schools = await base44.entities.School.filter({ name: user?.school_name });
      return schools[0];
    },
    enabled: !!user?.school_name,
  });

  const { data: credentials = [] } = useQuery({
    queryKey: ['student-credentials', school?.id],
    queryFn: () => base44.entities.StudentCredential.filter({ school_id: school.id }, '-created_date'),
    enabled: !!school?.id,
  });

  const generateMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('generateStudentCredentials', data);
      return response.data;
    },
    onSuccess: (data) => {
      setGeneratedCredentials(data.credentials);
      queryClient.invalidateQueries({ queryKey: ['student-credentials'] });
      queryClient.invalidateQueries({ queryKey: ['current-school'] });
      toast.success(`Generated ${data.credentials.length} student accounts`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to generate credentials');
    },
  });

  const handleGenerate = () => {
    const count = parseInt(generateCount);
    if (!count || count < 1 || count > 100) {
      toast.error('Please enter a valid number (1-100)');
      return;
    }
    generateMutation.mutate({
      school_id: school.id,
      count: count,
      grade: generateGrade || null,
    });
  };

  const downloadCSV = (creds) => {
    const csvContent = [
      ['Username', 'PIN', 'Grade', 'Status', 'Created Date'],
      ...creds.map(c => [
        c.username,
        c.pin || 'N/A',
        c.grade || '',
        c.status,
        new Date(c.created_date).toLocaleDateString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `student-credentials-${Date.now()}.csv`;
    a.click();
  };

  const filteredCredentials = credentials.filter(c => {
    const matchesSearch = c.username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusColors = {
    unused: 'bg-gray-100 text-gray-700',
    active: 'bg-[#0CC0DF]/10 text-[#0CC0DF]',
    disabled: 'bg-red-100 text-red-700'
  };

  const hasAccess = user?.role === 'school_admin' || user?.role === 'epsy_admin';
  
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-[#F1F4F6] p-8 pt-24">
        <p className="text-[#2E5C6E]">Access denied</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F1F4F6] p-8 pt-24">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1E1E1E] mb-2">Student Access Management</h1>
          <p className="text-[#2E5C6E]">{school?.name || 'Loading...'}</p>
        </div>

        {/* Summary */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white border-[#2E5C6E]/20">
            <CardContent className="p-6">
              <p className="text-sm text-[#2E5C6E] mb-1">Seat Limit</p>
              <p className="text-2xl font-bold text-[#1E1E1E]">{school?.seat_limit || 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-[#2E5C6E]/20">
            <CardContent className="p-6">
              <p className="text-sm text-[#2E5C6E] mb-1">Generated</p>
              <p className="text-2xl font-bold text-[#1E1E1E]">{school?.seats_generated || 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-[#2E5C6E]/20">
            <CardContent className="p-6">
              <p className="text-sm text-[#2E5C6E] mb-1">Available</p>
              <p className="text-2xl font-bold text-[#0CC0DF]">
                {(school?.seat_limit || 0) - (school?.seats_generated || 0)}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-white border-[#2E5C6E]/20">
            <CardContent className="p-6">
              <p className="text-sm text-[#2E5C6E] mb-1">Active Logins</p>
              <p className="text-2xl font-bold text-[#1E1E1E]">
                {credentials.filter(c => c.status === 'active').length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex gap-4 mb-6">
          <Button 
            onClick={() => setGenerateDialogOpen(true)}
            className="bg-[#0CC0DF] hover:bg-[#0AB0CF] text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Generate Student Logins
          </Button>
          <Button 
            onClick={() => downloadCSV(credentials)}
            variant="outline"
            disabled={credentials.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Export All
          </Button>
        </div>

        {/* Filters */}
        <Card className="bg-white border-[#2E5C6E]/20 mb-6">
          <CardContent className="p-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2E5C6E]" />
                  <Input
                    placeholder="Search by username..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border rounded-md"
              >
                <option value="all">All Status</option>
                <option value="unused">Unused</option>
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Credentials Table */}
        <Card className="bg-white border-[#2E5C6E]/20">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Login</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCredentials.map((cred) => (
                  <TableRow key={cred.id}>
                    <TableCell className="font-mono">{cred.username}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[cred.status]}>
                        {cred.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{cred.grade || '-'}</TableCell>
                    <TableCell>{new Date(cred.created_date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {cred.last_login_at ? new Date(cred.last_login_at).toLocaleDateString() : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Generate Dialog */}
        <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
          <DialogContent className="bg-white">
            <DialogHeader>
              <DialogTitle className="text-[#1E1E1E]">Generate Student Logins</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-[#1E1E1E]">Number of Accounts</label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={generateCount}
                  onChange={(e) => setGenerateCount(e.target.value)}
                  placeholder="Enter number (1-100)"
                />
                <p className="text-xs text-[#2E5C6E] mt-1">
                  Available seats: {(school?.seat_limit || 0) - (school?.seats_generated || 0)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-[#1E1E1E]">Grade (Optional)</label>
                <Input
                  value={generateGrade}
                  onChange={(e) => setGenerateGrade(e.target.value)}
                  placeholder="e.g. Grade 10"
                />
              </div>
              <Button
                onClick={handleGenerate}
                disabled={generateMutation.isPending}
                className="w-full bg-[#0CC0DF] hover:bg-[#0AB0CF] text-white"
              >
                {generateMutation.isPending ? 'Generating...' : 'Generate'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Generated Credentials Dialog */}
        <Dialog open={!!generatedCredentials} onOpenChange={() => setGeneratedCredentials(null)}>
          <DialogContent className="max-w-4xl bg-white max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-[#1E1E1E]">Generated Credentials</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-[#2E5C6E]">
                Save these credentials securely. PINs will not be shown again.
              </p>
              <Button
                onClick={() => downloadCSV(generatedCredentials)}
                variant="outline"
                className="mb-4"
              >
                <Download className="w-4 h-4 mr-2" />
                Download CSV
              </Button>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>PIN</TableHead>
                    <TableHead>Grade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {generatedCredentials?.map((cred) => (
                    <TableRow key={cred.id}>
                      <TableCell className="font-mono">{cred.username}</TableCell>
                      <TableCell className="font-mono font-bold text-[#0CC0DF]">{cred.pin}</TableCell>
                      <TableCell>{cred.grade || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}