'use client';

import { LayoutDashboard, FileText, CheckCircle, Truck, Package, BookOpen, Shield, LogOut,CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  allowedPages: string[];
}

// All possible menu items
const allMenuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'create-indent', label: 'Create Indent', icon: FileText },
  { id: 'approve-indent', label: 'Approve Indent', icon: CheckCircle },
  { id: 'lifting', label: 'Lifting', icon: Truck },
  { id: 'store-in', label: 'Store In', icon: Package },
  { id: 'tally-entry', label: 'Tally Entry', icon: BookOpen },
  { id: 'make-payment', label: 'Make Payment', icon:CreditCard },
  { id: 'license', label: 'License', icon: Shield },
];

export default function Sidebar({ currentPage, onPageChange, allowedPages }: SidebarProps) {
  // Filter menu items based on allowed pages
  const menuItems = allMenuItems.filter(item => 
    allowedPages && allowedPages.includes(item.id)
  );

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col">
      <div className="p-6 border-b border-border">
        <h2 className="text-xl font-bold text-primary">Office FMS</h2>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.length > 0 ? (
          menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;

            return (
              <Button
                key={item.id}
                onClick={() => onPageChange(item.id)}
                variant={isActive ? 'default' : 'ghost'}
                className={cn(
                  'w-full justify-start gap-3',
                  isActive && 'bg-primary text-primary-foreground'
                )}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Button>
            );
          })
        ) : (
          <div className="text-center text-muted-foreground py-8">
            <p className="text-sm">No pages available</p>
          </div>
        )}
      </nav>

      <div className="p-4 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          Powered by Botivate
        </p>
      </div>
    </aside>
  );
}