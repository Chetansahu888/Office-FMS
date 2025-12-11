'use client';

import { useState, useEffect } from 'react';
import LoginPage from '@/components/login-page';
import Dashboard from '@/components/dashboard';

interface User {
  username: string;
  name: string;
  allowedPages: string[]; // ✅ ADDED THIS
  role?: string;
  [key: string]: any;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check localStorage on mount (client-side only)
  useEffect(() => {
    const savedUser = localStorage.getItem('fms_user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        
        // ✅ VALIDATE that user has allowedPages
        if (parsedUser && Array.isArray(parsedUser.allowedPages)) {
          setUser(parsedUser);
        } else {
          console.warn('⚠️ Saved user data is invalid, clearing...');
          localStorage.removeItem('fms_user');
        }
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('fms_user');
      }
    }
    setIsLoading(false);
  }, []);

  const handleLogin = (userData: User) => {
    console.log('✅ User logged in:', userData);
    console.log('📄 Allowed pages:', userData.allowedPages);
    
    // ✅ VALIDATE before saving
    if (!userData.allowedPages || userData.allowedPages.length === 0) {
      console.error('❌ User has no allowed pages!');
      alert('No page access configured. Contact administrator.');
      return;
    }
    
    setUser(userData);
    localStorage.setItem('fms_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    console.log('👋 User logged out');
    setUser(null);
    localStorage.removeItem('fms_user');
  };

  // Show loading state to prevent hydration mismatch
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login if no user
  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // Show dashboard if user exists
  return <Dashboard user={user} onLogout={handleLogout} />;
}
