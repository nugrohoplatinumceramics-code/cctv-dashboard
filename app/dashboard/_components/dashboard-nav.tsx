'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Video,
  PlaySquare,
  Camera,
  Users,
  FolderTree,
  Bell,
  LayoutGrid,
} from 'lucide-react';

interface DashboardNavProps {
  session: any;
}

export function DashboardNav({ session }: DashboardNavProps) {
  const pathname = usePathname();
  const userRole = session?.user?.role;
  const canAccessPlayback = session?.user?.canAccessPlayback ?? true;

  const navItems = [
    {
      title: 'Dashboard',
      href: '/dashboard',
      icon: LayoutGrid,
      show: true,
    },
    {
      title: 'Live View',
      href: '/dashboard/live',
      icon: Video,
      show: true,
    },
    {
      title: 'Playback',
      href: '/dashboard/playback',
      icon: PlaySquare,
      show: userRole === 'ADMIN' || canAccessPlayback,
    },
    {
      title: 'Alerts',
      href: '/dashboard/alerts',
      icon: Bell,
      show: true,
    },
    {
      title: 'Cameras',
      href: '/dashboard/cameras',
      icon: Camera,
      show: userRole === 'ADMIN',
    },
    {
      title: 'Groups',
      href: '/dashboard/groups',
      icon: FolderTree,
      show: userRole === 'ADMIN',
    },
    {
      title: 'Users',
      href: '/dashboard/users',
      icon: Users,
      show: userRole === 'ADMIN',
    },
  ];

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-900 h-[calc(100vh-4rem)] sticky top-16">
      <nav className="p-4 space-y-1">
        {navItems
          .filter((item) => item.show)
          .map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )}
              >
                <Icon className="h-5 w-5" />
                {item.title}
              </Link>
            );
          })}
      </nav>
    </aside>
  );
}
