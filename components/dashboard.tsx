'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/sidebar';
import DashboardPage from '@/components/pages/dashboard-page';
import CreateIndent from '@/components/pages/create-indent';
import ApproveIndent from '@/components/pages/approve-indent';
import LiftingModule from '@/components/pages/lifting-module';
import StoreIn from '@/components/pages/store-in';
import TallyEntry from '@/components/pages/tally-entry';
import MakePayment from './pages/Make-payment'; // Note the lowercase 'm'
import License from './pages/License';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

interface User {
  username: string;
  name: string;
  allowedPages: string[];
  [key: string]: any;
}

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

export default function Dashboard({ user, onLogout }: DashboardProps) {
  // Set initial page to first allowed page
  const getInitialPage = () => {
    if (user.allowedPages && user.allowedPages.length > 0) {
      return user.allowedPages[0];
    }
    return 'dashboard';
  };

  const [currentPage, setCurrentPage] = useState(getInitialPage());

  // Check if user has access to current page
  const hasAccess = user.allowedPages && user.allowedPages.includes(currentPage);

  // If no access, redirect to first allowed page
  useEffect(() => {
    if (!hasAccess && user.allowedPages && user.allowedPages.length > 0) {
      setCurrentPage(user.allowedPages[0]);
    }
  }, [currentPage, hasAccess, user.allowedPages]);

  const renderPage = () => {
    // Show access denied if user doesn't have permission
    if (!hasAccess) {
      return (
        <div className="flex items-center justify-center h-full p-8">
          <Card className="max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto bg-destructive/10 p-4 rounded-full w-16 h-16 flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
              <CardTitle className="text-2xl text-destructive">Access Denied</CardTitle>
              <CardDescription className="text-base mt-2">
                You don't have permission to access this page. Contact administrator.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      );
    }

    // Render the appropriate page
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'create-indent':
        return <CreateIndent />;
      case 'approve-indent':
        return <ApproveIndent />;
      case 'lifting':
        return <LiftingModule />;
      case 'store-in':
        return <StoreIn />;
      case 'tally-entry':
        return <TallyEntry />;
      case 'make-payment':
        return <MakePayment />;
      case 'license':
        return <License />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar 
        currentPage={currentPage} 
        onPageChange={setCurrentPage}
        allowedPages={user.allowedPages}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-card border-b border-border p-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {currentPage.split('-').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
              ).join(' ')}
            </h1>
            <p className="text-sm text-muted-foreground">
              Logged in as: <span className="font-medium">{user.name}</span> (@{user.username})
            </p>
          </div>
          <Button variant="outline" onClick={onLogout} className="gap-2">
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          {renderPage()}
        </div>
      </div>
    </div>
  );
}