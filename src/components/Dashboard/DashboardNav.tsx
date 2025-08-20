// ./src/components/Dashboard/DashboardNav.tsx
'use client';

import Link from 'next/link';
import { useState } from 'react';
import { UserRole } from '@/types';
import type { LucideIcon } from 'lucide-react';
import {
  ChevronLeft,
  ChevronRight,
  Home,
  FolderKanban,
  Users,
  MessageSquare,
  Clock,
  BarChart3,
  Settings,
  UserCog,
  Building,
  FileText,
  UserPlus,
  User,
  Calendar,
  Eye,
  TrendingUp,
} from 'lucide-react';

interface NavLink {
  href: string;
  name: string;
  icon: LucideIcon; // ✅ precise type instead of ComponentType<any>
}

interface DashboardNavProps {
  role: UserRole;
}

export default function DashboardNav({ role }: DashboardNavProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const baseLinks: NavLink[] = [{ href: '/dashboard', name: 'Overview', icon: Home }];

  const roleLinks: Record<UserRole, NavLink[]> = {
    superadmin: [
      { href: '/dashboard/superadmin/projects', name: 'Project Management', icon: FolderKanban },
      { href: '/dashboard/superadmin/my-chats', name: 'Communication', icon: MessageSquare },
      { href: '/dashboard/superadmin/users-management', name: 'User Management', icon: UserCog },
      { href: '/dashboard/superadmin/attendance', name: 'Attendance', icon: Clock },
      { href: '/dashboard/superadmin/leave-reuqests', name: 'Leave Requests', icon: Calendar },
      { href: '/dashboard/superadmin/time-tracking-reports', name: 'Tracking Reports', icon: Clock },

    ],
    admin: [
      { href: '/dashboard/admin/projects', name: 'Project Management', icon: FolderKanban },
      { href: '/dashboard/admin/my-chats', name: 'Communication', icon: MessageSquare },
      { href: '/dashboard/admin/attendance', name: 'User Management', icon: UserCog },
      { href: '/dashboard/admin/time-tracking-reports', name: 'Tracking Reports', icon: Clock },
      { href: '/dashboard/admin/leave-reuqests', name: 'Leave Requests', icon: Calendar },

    ],
    hr: [
      { href: '/dashboard/hr', name: 'HR Management', icon: Building },
      { href: '/dashboard/hr/leave-requests', name: 'Leave Requests', icon: Calendar },
      { href: '/dashboard/hr/my-chats', name: 'Communication', icon: MessageSquare },
      { href: '/dashboard/hr/attendance', name: 'Attendance', icon: Calendar },
    ],
    employee: [
      { href: '/dashboard/employee/my-projects', name: 'My Projects', icon: FolderKanban },
      { href: '/dashboard/employee/my-time-tracking', name: 'Time Tracking', icon: Clock },
      { href: '/dashboard/employee/my-profile', name: 'My Profile', icon: User },
      { href: '/dashboard/employee/my-leaves', name: 'Leave Requests', icon: Calendar },
      { href: '/dashboard/employee/my-attendance', name: 'My Attendance', icon: Clock },
      { href: '/dashboard/employee/my-chats', name: 'Communication', icon: MessageSquare },
    ],
    client: [
      { href: '/dashboard/client/client-projects', name: 'My Projects', icon: FolderKanban },
      { href: '/dashboard/client/my-projects', name: 'Project Progress', icon: TrendingUp },
      { href: '/dashboard/client/my-chats', name: 'Communication', icon: MessageSquare },

    ],
  };

  const getSectionTitle = (r: UserRole): string => {
    const titles: Record<UserRole, string> = {
      superadmin: 'System Management',
      admin: 'Administration',
      hr: 'HR Tools',
      employee: 'My Workspace',
      client: 'Client Portal',
    };
    return titles[r];
  };

  const NavItem = ({ link, isBase = false }: { link: NavLink; isBase?: boolean }) => {
    const IconComponent = link.icon;
    return (
      <Link
        href={link.href}
        className={`
          group flex items-center transition-all duration-300 relative overflow-hidden
          ${isCollapsed ? 
            'px-3 py-3 mx-auto w-12 h-12 rounded-xl justify-center hover:bg-gradient-to-br hover:from-blue-500 hover:to-indigo-600 hover:text-white hover:shadow-lg hover:scale-110' : 
            'px-4 py-3 rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:shadow-sm hover:scale-[1.02]'
          }
          ${isBase ? 'text-gray-700 hover:text-blue-700' : 'text-gray-600 hover:text-blue-800'}
          ${isBase ? 'font-medium' : 'font-normal'}
          active:scale-[0.95]
        `}
        title={isCollapsed ? link.name : ''}
      >
        {isCollapsed && (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-indigo-500/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        )}
        <IconComponent
          className={`
            flex-shrink-0 transition-all duration-300 relative z-10
            ${isBase ? 'w-5 h-5' : 'w-4 h-4'}
            ${isCollapsed ? 'group-hover:text-white group-hover:drop-shadow-sm' : 'group-hover:text-blue-600 mr-3'}
          `}
        />
        <span
          className={`
            transition-all duration-500 truncate font-medium
            ${isCollapsed ? 'w-0 opacity-0 absolute' : 'w-auto opacity-100'}
          `}
        >
          {link.name}
        </span>
        {!isCollapsed && (
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 to-indigo-500/0 group-hover:from-blue-500/5 group-hover:to-indigo-500/10 rounded-xl transition-all duration-300" />
        )}
      </Link>
    );
  };

  return (
    <aside
      className={`
        sticky top-0
        bg-white/95 backdrop-blur-xl transition-all duration-500 ease-out z-10
        ${isCollapsed ? 'w-20 ml-4 my-4 rounded-2xl shadow-2xl border border-gray-200/50' : 'w-64 border-r border-gray-200/30 shadow-xl'}
        h-dvh
      `}
    >
      <div className="flex flex-col h-full">
        {/* Header with collapse toggle */}
        <div
          className={`
          flex items-center justify-between p-4 
          ${isCollapsed ? 'border-b-0 justify-center' : 'border-b border-gray-200/30'}
        `}
        >
          <div
            className={`
              font-bold text-xl bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent 
              transition-all duration-500
              ${isCollapsed ? 'w-0 opacity-0 scale-0' : 'w-auto opacity-100 scale-100'}
            `}
          >
            Dashboard
          </div>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`
              p-2.5 rounded-xl hover:bg-blue-50 transition-all duration-300 group relative
              ${isCollapsed ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg hover:shadow-xl hover:scale-110' : ''}
            `}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-gray-500 group-hover:text-blue-600 transition-all duration-300" />
            )}
          </button>
        </div>

        {/* Scrollable nav content */}
        <div
          className={`
          flex-1 overflow-y-auto space-y-1 transition-all duration-300
          ${isCollapsed ? 'p-2 pt-4' : 'p-4'}
        `}
        >
          {baseLinks.map((link) => (
            <NavItem key={link.href} link={link} isBase />
          ))}

          <div className={`transition-all duration-300 ${isCollapsed ? 'pt-2' : 'pt-6'}`}>
            <div
              className={`
                transition-all duration-500 mb-3
                ${isCollapsed ? 'w-0 opacity-0 h-0 overflow-hidden' : 'w-auto opacity-100 h-auto'}
              `}
            >
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider px-3 mb-2">
                {getSectionTitle(role)}
              </div>
              <div className="h-px bg-gradient-to-r from-blue-200/50 via-indigo-200/50 to-transparent mx-3" />
            </div>

            <div className={`space-y-1 ${isCollapsed ? 'space-y-2' : ''}`}>
              {roleLinks[role].map((link) => (
                <NavItem key={link.href} link={link} />
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className={`
            p-4 border-t border-gray-200 transition-all duration-300
            ${isCollapsed ? 'text-center' : ''}
          `}
        >
          <div className="flex items-center">
            <div
              className={`
              w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center
              ${isCollapsed ? 'mx-auto' : 'mr-3'}
            `}
            >
              <User className="w-4 h-4 text-white" />
            </div>
            <div
              className={`
                transition-all duration-300
                ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}
              `}
            >
              <div className="text-sm font-medium text-gray-700 capitalize">{role} User</div>
              <div className="text-xs text-gray-500">Online</div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
