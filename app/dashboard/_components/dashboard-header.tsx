'use client';

import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Video, Bell, User, LogOut, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';

interface DashboardHeaderProps {
  session: any;
}

export function DashboardHeader({ session }: DashboardHeaderProps) {
  const [unreadAlerts, setUnreadAlerts] = useState(0);

  useEffect(() => {
    fetchUnreadAlerts();
    const interval = setInterval(fetchUnreadAlerts, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchUnreadAlerts = async () => {
    try {
      const res = await fetch('/api/alerts?isRead=false');
      if (res.ok) {
        const data = await res.json();
        setUnreadAlerts(data?.length || 0);
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    }
  };

  const handleLogout = () => {
    signOut({ callbackUrl: '/login' });
  };

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900 sticky top-0 z-50">
      <div className="h-full px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-600">
            <Video className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">CCTV Dashboard</h1>
            <p className="text-xs text-slate-400">Real-time Monitoring System</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Alerts */}
          <Button
            variant="ghost"
            size="icon"
            className="relative text-slate-300 hover:text-white"
            onClick={() => (window.location.href = '/dashboard/alerts')}
          >
            <Bell className="h-5 w-5" />
            {unreadAlerts > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                {unreadAlerts > 9 ? '9+' : unreadAlerts}
              </Badge>
            )}
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 text-slate-300 hover:text-white">
                <User className="h-5 w-5" />
                <div className="text-left hidden md:block">
                  <p className="text-sm font-medium">{session?.user?.name || 'User'}</p>
                  <p className="text-xs text-slate-400">{session?.user?.role || 'USER'}</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div>
                  <p className="font-medium">{session?.user?.name}</p>
                  <p className="text-xs text-muted-foreground">{session?.user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
