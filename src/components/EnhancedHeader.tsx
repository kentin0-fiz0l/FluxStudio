import React from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useMessaging } from '../hooks/useMessaging';
import { useFiles } from '../hooks/useFiles';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import {
  Search,
  Bell,
  Settings,
  Home,
  Building2,
  Users,
  FolderOpen,
  Command,
  User,
  LogOut,
  Menu,
  X,
  FileText,
  MessageSquare,
  Wrench
} from 'lucide-react';
// SidebarTrigger removed - no longer using sidebar
import { UnifiedNotificationCenter } from './notifications/UnifiedNotificationCenter';
import { cn } from '../lib/utils';

interface PageAction {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'ghost' | 'outline';
  className?: string;
}

interface EnhancedHeaderProps {
  openCommandPalette: () => void;
  className?: string;
  activeView?: string;
  onViewChange?: (view: string) => void;
  onMessagingToggle?: () => void;
}

export function EnhancedHeader({ openCommandPalette, className, activeView = 'organizations', onViewChange, onMessagingToggle }: EnhancedHeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { organizations, teams, projects } = useOrganization();
  const { isMobile } = useBreakpoint();
  const { unreadCount } = useMessaging();
  const { files } = useFiles();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  // Navigation items - Single page with view switching
  const navigationItems = [
    {
      label: 'Organizations',
      view: 'organizations',
      icon: Building2,
      isActive: activeView === 'organizations',
      badge: organizations?.length || 0,
    },
    {
      label: 'Teams',
      view: 'teams',
      icon: Users,
      isActive: activeView === 'teams',
      badge: teams?.length || 0,
    },
    {
      label: 'Projects',
      view: 'projects',
      icon: FolderOpen,
      isActive: activeView === 'projects',
      badge: projects?.length || 0,
    },
    {
      label: 'Files',
      view: 'files',
      icon: FileText,
      isActive: activeView === 'files',
      badge: files?.length || 0
    }
  ];





  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-b border-gray-700/50 shadow-lg",
        className
      )}
    >
      <div className="flex items-center justify-between h-16 px-4 md:px-6">
        {/* Left section: Logo and Brand */}
        <div className="flex items-center gap-8">
          {/* Logo and Brand */}
          <Link to="/dashboard" className="flex items-center gap-3 group">
            <div className="flex aspect-square size-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
              <Command className="size-6 text-white" />
            </div>
            <div className="hidden md:block">
              <h1 className="text-lg font-bold text-white tracking-tight">Flux Studio</h1>
              <p className="text-xs text-gray-400">Creative Design Platform</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navigationItems.map((item) => (
              <Button
                key={item.label}
                variant="ghost"
                onClick={() => {
                  if (item.view === 'messages' && onMessagingToggle) {
                    onMessagingToggle();
                  } else {
                    onViewChange?.(item.view);
                  }
                }}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 h-auto",
                  item.isActive
                    ? "bg-gray-700/50 text-white shadow-inner"
                    : "text-gray-300 hover:text-white hover:bg-gray-700/30"
                )}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
                {item.badge > 0 && (
                  <Badge className="ml-1 h-5 px-1.5 bg-gray-600 text-white border-gray-500">
                    {item.badge}
                  </Badge>
                )}
              </Button>
            ))}
          </nav>
        </div>


        {/* Right section: Search, Notifications, User */}
        <div className="flex items-center gap-2">

          {/* Search */}
          <Button
            variant="ghost"
            size="sm"
            onClick={openCommandPalette}
            className="hidden md:flex h-9 px-3 text-gray-300 hover:text-white hover:bg-gray-700/50"
          >
            <Search className="h-4 w-4" />
            <span className="hidden lg:inline-block ml-2">Search</span>
            <kbd className="hidden lg:inline-flex ml-2 h-5 items-center gap-0.5 rounded border border-gray-600 bg-gray-700/50 px-1.5 font-mono text-[10px] font-medium text-gray-400">
              ⌘K
            </kbd>
          </Button>

          {/* Messages */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onMessagingToggle?.()}
            className="relative h-9 px-3 text-gray-300 hover:text-white hover:bg-gray-700/50"
          >
            <MessageSquare className="h-4 w-4" />
            <span className="hidden lg:inline-block ml-2">Messages</span>
            {unreadCount > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-red-500 border-2 border-gray-800">
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </Button>

          {/* Notifications */}
          <UnifiedNotificationCenter />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-9 px-2 text-gray-300 hover:text-white hover:bg-gray-700/50">
                <Avatar className="h-8 w-8 mr-2">
                  <AvatarFallback className="bg-primary-600 text-white text-sm font-bold">
                    {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden md:inline-block text-sm font-medium">{user?.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-gray-900 border-gray-700">
              <DropdownMenuItem
                onClick={() => navigate('/profile')}
                className="text-gray-300 hover:text-white hover:bg-gray-800 focus:bg-gray-800 cursor-pointer"
              >
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate('/tools')}
                className="text-gray-300 hover:text-white hover:bg-gray-800 focus:bg-gray-800 cursor-pointer"
              >
                <Wrench className="mr-2 h-4 w-4" />
                Tools
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate('/settings')}
                className="text-gray-300 hover:text-white hover:bg-gray-800 focus:bg-gray-800 cursor-pointer"
              >
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-700" />
              <DropdownMenuItem
                onClick={logout}
                className="text-gray-300 hover:text-white hover:bg-gray-800 focus:bg-gray-800 cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden h-9 w-9 p-0 text-gray-300 hover:text-white hover:bg-gray-700/50"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-700/50 bg-gray-800/95 backdrop-blur-sm">
          <nav className="flex flex-col p-4 gap-2">
            {navigationItems.map((item) => (
              <Button
                key={item.label}
                variant="ghost"
                onClick={() => {
                  if (item.view === 'messages' && onMessagingToggle) {
                    onMessagingToggle();
                  } else {
                    onViewChange?.(item.view);
                  }
                  setMobileMenuOpen(false);
                }}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 h-auto justify-start",
                  item.isActive
                    ? "bg-gray-700/50 text-white"
                    : "text-gray-300 hover:text-white hover:bg-gray-700/30"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
                {item.badge > 0 && (
                  <Badge className="ml-auto h-5 px-1.5 bg-gray-600 text-white border-gray-500">
                    {item.badge}
                  </Badge>
                )}
              </Button>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}