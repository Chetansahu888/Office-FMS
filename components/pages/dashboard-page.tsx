'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Loader2, RefreshCw, TrendingUp, TrendingDown, FileText, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzLkH_vSbpObvC85M-t5TBukKIRqQxi0gH_ZjIc_O7xrjjBvz8QDuz4dEjkovODvoI93w/exec';

// JSONP helper
function fetchJsonp(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const callbackName = `jsonp_callback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const script = document.createElement('script');
    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('Request timeout'));
    }, 30000);

    function cleanup() {
      if (script.parentNode) script.parentNode.removeChild(script);
      delete (window as any)[callbackName];
      clearTimeout(timeoutId);
    }

    (window as any)[callbackName] = (data: any) => {
      cleanup();
      resolve(data);
    };

    const separator = url.includes('?') ? '&' : '?';
    script.src = `${url}${separator}callback=${callbackName}`;
    script.onerror = () => {
      cleanup();
      reject(new Error('Script loading failed'));
    };

    document.head.appendChild(script);
  });
}

interface DashboardStats {
  totalIndents: number;
  approved: number;
  rejected: number;
  pendingApproval: number;
  pendingLifting: number;
  pendingStoreIn: number;
  pendingTallyEntry: number;
  completed: number;
}

interface MonthlyData {
  month: string;
  indents: number;
  approved: number;
  rejected: number;
  completed: number;
}

interface StatCard {
  label: string;
  value: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
  trend: string;
  trendUp: boolean;
}

interface ChartData {
  name: string;
  value: number;
  color: string;
  [key: string]: any; // Add index signature
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalIndents: 0,
    approved: 0,
    rejected: 0,
    pendingApproval: 0,
    pendingLifting: 0,
    pendingStoreIn: 0,
    pendingTallyEntry: 0,
    completed: 0
  });

  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all data from FMS sheet
      const historyData = await fetchJsonp(`${SCRIPT_URL}?action=getFMSHistory`);
      
      if (!historyData.success) {
        throw new Error(historyData.error || 'Failed to fetch data');
      }

      const indents = historyData.indents || [];
      
      // Calculate statistics
      const totalIndents = indents.length;
      
      const approved = indents.filter((indent: any) => 
        indent.What?.toLowerCase() === 'approved' || 
        indent.Status?.toLowerCase() === 'approved'
      ).length;
      
      const rejected = indents.filter((indent: any) => 
        indent.What?.toLowerCase() === 'rejected' || 
        indent.Status?.toLowerCase() === 'rejected'
      ).length;
      
      // Pending counts
      const pendingApproval = indents.filter((indent: any) => {
        const hasPlanned = indent.Planned && indent.Planned.toString().trim() !== '';
        const hasNoActual = !indent.Actual || indent.Actual.toString().trim() === '';
        return hasPlanned && hasNoActual;
      }).length;
      
      const pendingLifting = indents.filter((indent: any) => {
        const hasPlanned1 = indent.Planned1 && indent.Planned1.toString().trim() !== '';
        const hasNoActual1 = !indent.Actual1 || indent.Actual1.toString().trim() === '';
        return hasPlanned1 && hasNoActual1;
      }).length;
      
      const pendingStoreIn = indents.filter((indent: any) => {
        const hasPlanned2 = indent.Planned2 && indent.Planned2.toString().trim() !== '';
        const hasNoActual2 = !indent.Actual2 || indent.Actual2.toString().trim() === '';
        return hasPlanned2 && hasNoActual2;
      }).length;
      
      const pendingTallyEntry = indents.filter((indent: any) => {
        const hasPlanned3 = indent.Planned3 && indent.Planned3.toString().trim() !== '';
        const hasNoActual3 = !indent.Actual3 || indent.Actual3.toString().trim() === '';
        return hasPlanned3 && hasNoActual3;
      }).length;
      
      const completed = indents.filter((indent: any) => 
        indent.Actual3 && indent.Actual3.toString().trim() !== ''
      ).length;

      setStats({
        totalIndents,
        approved,
        rejected,
        pendingApproval,
        pendingLifting,
        pendingStoreIn,
        pendingTallyEntry,
        completed
      });

      // Calculate monthly data
      const monthlyMap = new Map<string, { indents: number; approved: number; rejected: number; completed: number }>();
      
      indents.forEach((indent: any) => {
        if (indent.Timestamp) {
          try {
            // Parse timestamp (format: dd/MM/yyyy HH:mm:ss)
            const dateParts = indent.Timestamp.split(' ')[0].split('/');
            if (dateParts.length === 3) {
              const month = dateParts[1]; // MM
              const year = dateParts[2]; // yyyy
              const monthYear = `${year}-${month}`;
              
              if (!monthlyMap.has(monthYear)) {
                monthlyMap.set(monthYear, { indents: 0, approved: 0, rejected: 0, completed: 0 });
              }
              
              const data = monthlyMap.get(monthYear)!;
              data.indents++;
              
              if (indent.What?.toLowerCase() === 'approved' || indent.Status?.toLowerCase() === 'approved') {
                data.approved++;
              }
              
              if (indent.What?.toLowerCase() === 'rejected' || indent.Status?.toLowerCase() === 'rejected') {
                data.rejected++;
              }
              
              if (indent.Actual3 && indent.Actual3.toString().trim() !== '') {
                data.completed++;
              }
            }
          } catch (e) {
            console.error('Error parsing timestamp:', e);
          }
        }
      });

      // Convert to array and sort by date
      const monthlyArray = Array.from(monthlyMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-6) // Last 6 months
        .map(([key, value]) => {
          const [year, month] = key.split('-');
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          return {
            month: monthNames[parseInt(month) - 1] + ' ' + year.slice(2),
            ...value
          };
        });

      setMonthlyData(monthlyArray);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={fetchDashboardData} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statCards: StatCard[] = [
    { 
      label: 'Total Indents', 
      value: stats.totalIndents.toString(), 
      color: 'bg-blue-500',
      icon: FileText,
      trend: '+12%',
      trendUp: true
    },
    { 
      label: 'Approved', 
      value: stats.approved.toString(), 
      color: 'bg-green-500',
      icon: CheckCircle,
      trend: '+8%',
      trendUp: true
    },
    { 
      label: 'Pending Approval', 
      value: stats.pendingApproval.toString(), 
      color: 'bg-yellow-500',
      icon: Clock,
      trend: '-3%',
      trendUp: false
    },
    { 
      label: 'Completed', 
      value: stats.completed.toString(), 
      color: 'bg-purple-500',
      icon: CheckCircle,
      trend: '+15%',
      trendUp: true
    },
  ];

  const workflowData: ChartData[] = [
    { name: 'Pending Approval', value: stats.pendingApproval, color: '#f59e0b' },
    { name: 'Pending Lifting', value: stats.pendingLifting, color: '#3b82f6' },
    { name: 'Pending Store In', value: stats.pendingStoreIn, color: '#8b5cf6' },
    { name: 'Pending Tally Entry', value: stats.pendingTallyEntry, color: '#ec4899' },
    { name: 'Completed', value: stats.completed, color: '#10b981' },
  ].filter(item => item.value > 0);

  const statusData: ChartData[] = [
    { name: 'Approved', value: stats.approved, color: '#10b981' },
    { name: 'Rejected', value: stats.rejected, color: '#ef4444' },
    { name: 'Pending', value: stats.totalIndents - stats.approved - stats.rejected, color: '#f59e0b' },
  ].filter(item => item.value > 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome to Office FMS System</p>
        </div>
        <Button onClick={fetchDashboardData} variant="outline" size="sm" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                    <div className="flex items-center gap-1 text-xs">
                      {stat.trendUp ? (
                        <TrendingUp className="w-3 h-3 text-green-500" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-red-500" />
                      )}
                      <span className={stat.trendUp ? 'text-green-500' : 'text-red-500'}>
                        {stat.trend}
                      </span>
                      <span className="text-muted-foreground">vs last month</span>
                    </div>
                  </div>
                  <div className={`${stat.color} p-3 rounded-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Lifting</p>
                <p className="text-2xl font-bold">{stats.pendingLifting}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Store In</p>
                <p className="text-2xl font-bold">{stats.pendingStoreIn}</p>
              </div>
              <Clock className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Tally Entry</p>
                <p className="text-2xl font-bold">{stats.pendingTallyEntry}</p>
              </div>
              <Clock className="w-8 h-8 text-pink-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" stroke="var(--foreground)" />
                  <YAxis stroke="var(--foreground)" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--background)', 
                      border: '1px solid var(--border)',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="indents" fill="#3b82f6" name="Total Indents" />
                  <Bar dataKey="approved" fill="#10b981" name="Approved" />
                  <Bar dataKey="rejected" fill="#ef4444" name="Rejected" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Completion Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Completion Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" stroke="var(--foreground)" />
                  <YAxis stroke="var(--foreground)" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--background)', 
                      border: '1px solid var(--border)',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="completed" stroke="#8b5cf6" strokeWidth={2} name="Completed" />
                  <Line type="monotone" dataKey="indents" stroke="#3b82f6" strokeWidth={2} name="Total" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Workflow Status */}
        <Card>
          <CardHeader>
            <CardTitle>Workflow Status</CardTitle>
          </CardHeader>
          <CardContent>
            {workflowData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={workflowData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {workflowData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Approval Status */}
        <Card>
          <CardHeader>
            <CardTitle>Approval Status</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Summary */}
      <Card>
        <CardHeader>
          <CardTitle>System Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border border-border rounded-lg">
              <p className="text-2xl font-bold text-blue-500">{stats.totalIndents}</p>
              <p className="text-sm text-muted-foreground">Total Indents</p>
            </div>
            <div className="text-center p-4 border border-border rounded-lg">
              <p className="text-2xl font-bold text-green-500">{stats.approved}</p>
              <p className="text-sm text-muted-foreground">Approved</p>
            </div>
            <div className="text-center p-4 border border-border rounded-lg">
              <p className="text-2xl font-bold text-red-500">{stats.rejected}</p>
              <p className="text-sm text-muted-foreground">Rejected</p>
            </div>
            <div className="text-center p-4 border border-border rounded-lg">
              <p className="text-2xl font-bold text-purple-500">{stats.completed}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
