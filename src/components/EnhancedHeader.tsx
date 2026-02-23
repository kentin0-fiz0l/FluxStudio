import React, { lazy, Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
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
import { Badge } from './ui/badge';
import {
  Search,
  Settings,
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
import { OfflineIndicator } from './common/OfflineIndicator';
import { cn } from '../lib/utils';

// Lazy-load the notification center (heavy component, only opens on click)
const UnifiedNotificationCenter = lazy(() => import('./notifications/UnifiedNotificationCenter').then(m => ({ default: m.UnifiedNotificationCenter })));

interface EnhancedHeaderProps {
  openCommandPalette: () => void;
  className?: string;
  activeView?: string;
  onViewChange?: (view: string) => void;
  onMessagingToggle?: () => void;
}

export function EnhancedHeader({ openCommandPalette, className, activeView = 'organizations', onViewChange, onMessagingToggle }: EnhancedHeaderProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { organizations, teams, projects } = useOrganization();
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
        "sticky top-0 z-50 w-full bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 border-b border-neutral-700/50 shadow-lg",
        className
      )}
    >
      <div className="flex items-center justify-between h-16 px-4 md:px-6">
        {/* Left section: Logo and Brand */}
        <div className="flex items-center gap-8">
          {/* Logo and Brand */}
          <Link to="/dashboard" className="flex items-center gap-3 group">
            <div className="flex aspect-square size-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
              <Command className="size-6 text-white" aria-hidden="true" />
            </div>
            <div className="hidden md:block">
              <h1 className="text-lg font-bold text-white tracking-tight">Flux Studio</h1>
              <p className="text-xs text-neutral-400">Creative Design Platform</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1" aria-label="Main navigation">
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
                    ? "bg-neutral-700/50 text-white shadow-inner"
                    : "text-neutral-300 hover:text-white hover:bg-neutral-700/30"
                )}
              >
                <item.icon className="h-4 w-4" aria-hidden="true" />
                <span>{item.label}</span>
                {item.badge > 0 && (
                  <Badge className="ml-1 h-5 px-1.5 bg-neutral-600 text-white border-neutral-500">
                    {item.badge}
                  </Badge>
                )}
              </Button>
            ))}
          </nav>
        </div>


        {/* Right section: Search, Notifications, User */}
        <div className="flex items-center gap-2">

          {/* Offline status */}
          <OfflineIndicator />

          {/* Search - visible on all screen sizes */}
          <Button
            variant="ghost"
            size="sm"
            onClick={openCommandPalette}
            aria-label="Search (⌘K)"
            className="h-9 px-3 text-neutral-300 hover:text-white hover:bg-neutral-700/50"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            <span className="hidden lg:inline-block ml-2">Search</span>
            <kbd className="hidden lg:inline-flex ml-2 h-5 items-center gap-0.5 rounded border border-neutral-600 bg-neutral-700/50 px-1.5 font-mono text-[10px] font-medium text-neutral-400">
              ⌘K
            </kbd>
          </Button>

          {/* Messages */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onMessagingToggle?.()}
            aria-label={unreadCount > 0 ? `Messages (${unreadCount} unread)` : 'Messages'}
            className="relative h-9 px-3 text-neutral-300 hover:text-white hover:bg-neutral-700/50"
          >
            <MessageSquare className="h-4 w-4" aria-hidden="true" />
            <span className="hidden lg:inline-block ml-2">Messages</span>
            {unreadCount > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-red-500 border-2 border-neutral-800">
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </Button>

          {/* Notifications */}
          <Suspense fallback={null}>
            <UnifiedNotificationCenter />
          </Suspense>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-9 px-2 text-neutral-300 hover:text-white hover:bg-neutral-700/50">
                <Avatar className="h-8 w-8 mr-2">
                  <AvatarFallback className="bg-primary-600 text-white text-sm font-bold">
                    {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden md:inline-block text-sm font-medium">{user?.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-neutral-900 border-neutral-700">
              <DropdownMenuItem
                onClick={() => navigate('/profile')}
                className="text-neutral-300 hover:text-white hover:bg-neutral-800 focus:bg-neutral-800 cursor-pointer"
              >
                <User className="mr-2 h-4 w-4" aria-hidden="true" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate('/tools')}
                className="text-neutral-300 hover:text-white hover:bg-neutral-800 focus:bg-neutral-800 cursor-pointer"
              >
                <Wrench className="mr-2 h-4 w-4" aria-hidden="true" />
                Tools
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate('/settings')}
                className="text-neutral-300 hover:text-white hover:bg-neutral-800 focus:bg-neutral-800 cursor-pointer"
              >
                <Settings className="mr-2 h-4 w-4" aria-hidden="true" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-neutral-700" />
              <DropdownMenuItem
                onClick={logout}
                className="text-neutral-300 hover:text-white hover:bg-neutral-800 focus:bg-neutral-800 cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            className="lg:hidden h-9 w-9 p-0 text-neutral-300 hover:text-white hover:bg-neutral-700/50"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-neutral-700/50 bg-neutral-800/95 backdrop-blur-sm">
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
                    ? "bg-neutral-700/50 text-white"
                    : "text-neutral-300 hover:text-white hover:bg-neutral-700/30"
                )}
              >
                <item.icon className="h-5 w-5" aria-hidden="true" />
                <span>{item.label}</span>
                {item.badge > 0 && (
                  <Badge className="ml-auto h-5 px-1.5 bg-neutral-600 text-white border-neutral-500">
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