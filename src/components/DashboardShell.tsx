import React, { forwardRef, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { useCommandPalette } from '../hooks/useCommandPalette';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useMessaging } from '../hooks/useMessaging';
import { useFiles } from '../hooks/useFiles';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { CommandPalette } from './search/CommandPalette';
import { UnifiedNotificationCenter } from './notifications/UnifiedNotificationCenter';
import { EnhancedHeader } from './EnhancedHeader';
import { File } from '../pages/File';
import { MessagingSidepanel } from './messaging/MessagingSidepanel';
import { FloatingMessageButton } from './messaging/FloatingMessageButton';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Skeleton } from './ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Home,
  Building2,
  Users,
  FolderOpen,
  Search,
  Bell,
  Settings,
  User,
  LogOut,
  Palette,
  Briefcase,
  BarChart3,
  Shield,
  ChevronRight,
  ChevronLeft,
  Plus,
  Command,
  Menu,
  PanelLeftClose,
  PanelLeft,
  FileText,
  MessageSquare,
  Printer,
} from 'lucide-react';
import { cn } from '../lib/utils';

// ForwardRef wrapper for button elements to fix Slot ref warnings
const ForwardedButton = forwardRef<HTMLButtonElement, React.ComponentProps<'button'>>((props, ref) => (
  <button {...props} ref={ref} />
));
ForwardedButton.displayName = "ForwardedButton";

// ForwardRef wrapper for anchor elements to fix Slot ref warnings
const ForwardedAnchor = forwardRef<HTMLAnchorElement, React.ComponentProps<'a'>>((props, ref) => (
  <a {...props} ref={ref} />
));
ForwardedAnchor.displayName = "ForwardedAnchor";

interface DashboardShellProps {
  children: React.ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, getUserDashboardPath } = useAuth();
  const {
    currentOrganization,
    currentTeam,
    currentProject,
    organizations,
    teams,
    projects,
    navigateTo
  } = useOrganization();
  const { isOpen: isCommandPaletteOpen, open: openCommandPalette, close: closeCommandPalette } = useCommandPalette();
  const { isMobile, isTablet, isDesktop, currentBreakpoint } = useBreakpoint();
  const { unreadCount } = useMessaging();
  const { files } = useFiles();
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState('organizations');
  const [isMessagingOpen, setIsMessagingOpen] = useState(false);

  useEffect(() => {
    // Simulate initial data loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleViewChange = (view: string) => {
    if (view === 'messages') {
      // Open messaging sidepanel instead of changing view
      setIsMessagingOpen(true);
    } else {
      setActiveView(view);
    }
  };

  // Keyboard shortcuts for messaging and navigation
  useKeyboardShortcuts({
    shortcuts: [
      {
        key: 'm',
        metaKey: true,
        action: () => setIsMessagingOpen(!isMessagingOpen),
        description: 'Toggle messaging panel'
      },
      {
        key: 'Escape',
        action: () => {
          if (isMessagingOpen) setIsMessagingOpen(false);
          if (isCommandPaletteOpen) closeCommandPalette();
        },
        description: 'Close panels'
      },
      {
        key: '1',
        metaKey: true,
        action: () => setActiveView('organizations'),
        description: 'Go to Organizations'
      },
      {
        key: '2',
        metaKey: true,
        action: () => setActiveView('teams'),
        description: 'Go to Teams'
      },
      {
        key: '3',
        metaKey: true,
        action: () => setActiveView('projects'),
        description: 'Go to Projects'
      },
      {
        key: '4',
        metaKey: true,
        action: () => setActiveView('files'),
        description: 'Go to Files'
      }
    ]
  });

  if (!user) return null;

  // Navigation items based on user role and context
  const getNavigationItems = () => {
    const baseItems = [
      {
        title: "Organizations",
        icon: Building2,
        url: "/dashboard/organizations",
        isActive: location.pathname.startsWith("/dashboard/organizations"),
        badge: organizations.length > 0 ? organizations.length : undefined,
      },
      {
        title: "Teams",
        icon: Users,
        url: "/dashboard/teams",
        isActive: location.pathname.startsWith("/dashboard/teams"),
        badge: teams.length > 0 ? teams.length : undefined,
      },
      {
        title: "Projects",
        icon: FolderOpen,
        url: "/dashboard/projects",
        isActive: location.pathname.startsWith("/dashboard/projects"),
        badge: projects.length > 0 ? projects.length : undefined,
      },
      {
        title: "Files",
        icon: FileText,
        url: "/dashboard/files",
        isActive: location.pathname.startsWith("/dashboard/files"),
        badge: files?.length || 0
      },
      {
        title: "Messages",
        icon: MessageSquare,
        url: "/dashboard/messages",
        isActive: location.pathname.startsWith("/dashboard/messages"),
        badge: unreadCount || 0
      },
      {
        title: "3D Printing",
        icon: Printer,
        url: "/dashboard/printing",
        isActive: location.pathname.startsWith("/dashboard/printing") || location.pathname.startsWith("/printing"),
      },
    ];

    // Add role-specific items
    if (user.userType === 'designer') {
      baseItems.push(
        {
          title: "Design Studio",
          icon: Palette,
          url: "/dashboard/design",
          isActive: location.pathname.startsWith("/dashboard/design"),
        },
        {
          title: "Portfolio",
          icon: Briefcase,
          url: "/dashboard/portfolio",
          isActive: location.pathname.startsWith("/dashboard/portfolio"),
        }
      );
    }

    if (user.userType === 'admin') {
      baseItems.push(
        {
          title: "Analytics",
          icon: BarChart3,
          url: "/dashboard/analytics",
          isActive: location.pathname.startsWith("/dashboard/analytics"),
        },
        {
          title: "Admin Panel",
          icon: Shield,
          url: "/dashboard/admin",
          isActive: location.pathname.startsWith("/dashboard/admin"),
        }
      );
    }

    return baseItems;
  };

  // Get contextual navigation based on current context
  const getContextualItems = () => {
    const contextualItems = [];

    if (currentOrganization) {
      contextualItems.push({
        title: currentOrganization.name,
        icon: Building2,
        url: `/dashboard/organization/${currentOrganization.id}`,
        isActive: location.pathname === `/dashboard/organization/${currentOrganization.id}`,
      });
    }

    if (currentTeam) {
      contextualItems.push({
        title: currentTeam.name,
        icon: Users,
        url: `/dashboard/organization/${currentOrganization?.id}/team/${currentTeam.id}`,
        isActive: location.pathname === `/dashboard/organization/${currentOrganization?.id}/team/${currentTeam.id}`,
      });
    }

    if (currentProject) {
      contextualItems.push({
        title: currentProject.name,
        icon: FolderOpen,
        url: `/dashboard/organization/${currentOrganization?.id}${currentTeam ? `/team/${currentTeam.id}` : ''}/project/${currentProject.id}`,
        isActive: location.pathname === `/dashboard/organization/${currentOrganization?.id}${currentTeam ? `/team/${currentTeam.id}` : ''}/project/${currentProject.id}`,
      });
    }

    return contextualItems;
  };

  const navigationItems = getNavigationItems();
  const contextualItems = getContextualItems();

  return (
    <div className="min-h-screen w-full bg-background">
      {/* Header */}
      <EnhancedHeader
        openCommandPalette={openCommandPalette}
        activeView={activeView}
        onViewChange={handleViewChange}
        onMessagingToggle={() => setIsMessagingOpen(true)}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 animate-fadeIn">

          {/* Page Content - View-specific content based on activeView */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xl animate-slideUp">
            {activeView === 'organizations' && (
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Organizations</h2>
                <p className="text-gray-600">Manage your organizations and settings</p>
              </div>
            )}
            {activeView === 'teams' && (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Teams</h2>
                <p className="text-gray-600">Collaborate with your team members</p>
              </div>
            )}
            {activeView === 'projects' && (
              <div className="text-center py-12">
                <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Projects</h2>
                <p className="text-gray-600">Manage your creative projects</p>
              </div>
            )}
            {activeView === 'files' && (
              <div className="w-full">
                <File />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={closeCommandPalette}
      />

      {/* Messaging Sidepanel - Available from any view */}
      <MessagingSidepanel
        isOpen={isMessagingOpen}
        onClose={() => setIsMessagingOpen(false)}
      />

      {/* Floating Message Button - Always visible for quick access */}
      <FloatingMessageButton
        onClick={() => setIsMessagingOpen(true)}
        isMessagingOpen={isMessagingOpen}
      />
    </div>
  );
}