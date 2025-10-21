import React, { forwardRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { useCommandPalette } from '../hooks/useCommandPalette';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { CommandPalette } from './search/CommandPalette';
import { UnifiedNotificationCenter } from './notifications/UnifiedNotificationCenter';
import { EnhancedHeader } from './EnhancedHeader';
// Sidebar imports removed - using centered layout instead
import { Avatar, AvatarFallback } from './ui/avatar';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
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

  if (!user) return null;

  // Navigation items based on user role and context
  const getNavigationItems = () => {
    const baseItems = [
      {
        title: "Dashboard",
        icon: Home,
        url: "/dashboard",
        isActive: location.pathname === "/dashboard",
      },
      {
        title: "Organizations",
        icon: Building2,
        url: "/dashboard/organizations",
        isActive: location.pathname.startsWith("/dashboard/organizations"),
        badge: organizations.length,
      },
    ];

    // Role-specific items
    const roleItems = (() => {
      switch (user.userType) {
        case 'client':
          return [
            {
              title: "My Projects",
              icon: FolderOpen,
              url: "/dashboard/projects",
              isActive: location.pathname.startsWith("/dashboard/projects"),
            },
            {
              title: "Messages",
              icon: Bell,
              url: "/dashboard/messages",
              isActive: location.pathname.startsWith("/dashboard/messages"),
            },
          ];
        case 'designer':
          return [
            {
              title: "Creative Hub",
              icon: Palette,
              url: "/dashboard/designer",
              isActive: location.pathname === "/dashboard/designer",
            },
            {
              title: "Portfolio",
              icon: Briefcase,
              url: "/dashboard/portfolio",
              isActive: location.pathname.startsWith("/dashboard/portfolio"),
            },
            {
              title: "Projects",
              icon: FolderOpen,
              url: "/dashboard/projects",
              isActive: location.pathname.startsWith("/dashboard/projects"),
            },
          ];
        case 'admin':
          return [
            {
              title: "Analytics",
              icon: BarChart3,
              url: "/dashboard/admin",
              isActive: location.pathname === "/dashboard/admin",
            },
            {
              title: "User Management",
              icon: Shield,
              url: "/dashboard/users",
              isActive: location.pathname.startsWith("/dashboard/users"),
            },
          ];
        default:
          return [];
      }
    })();

    return [...baseItems, ...roleItems];
  };

  // Quick access items for current context
  const getContextualItems = () => {
    const items = [];

    if (currentOrganization) {
      items.push({
        title: currentOrganization.name,
        icon: Building2,
        url: `/dashboard/organization/${currentOrganization.id}`,
        isActive: location.pathname.includes(`/organization/${currentOrganization.id}`),
        children: teams.map(team => ({
          title: team.name,
          icon: Users,
          url: `/dashboard/organization/${currentOrganization.id}/team/${team.id}`,
          isActive: location.pathname.includes(`/team/${team.id}`),
        })),
      });
    }

    if (currentTeam) {
      items.push({
        title: currentTeam.name,
        icon: Users,
        url: `/dashboard/organization/${currentOrganization?.id}/team/${currentTeam.id}`,
        isActive: location.pathname.includes(`/team/${currentTeam.id}`),
        children: projects.filter(p => p.teamId === currentTeam.id).map(project => ({
          title: project.name,
          icon: FolderOpen,
          url: `/dashboard/organization/${currentOrganization?.id}/team/${currentTeam.id}/project/${project.id}`,
          isActive: location.pathname.includes(`/project/${project.id}`),
        })),
      });
    }

    return items;
  };

  const navigationItems = getNavigationItems();
  const contextualItems = getContextualItems();

  // Dynamic sidebar behavior based on screen size
  const getSidebarConfig = () => {
    if (isMobile) {
      return {
        defaultOpen: false,
        variant: "sidebar" as const,
        collapsible: "offcanvas" as const,
      };
    }
    if (isTablet) {
      return {
        defaultOpen: false, // Start collapsed on tablet for space
        variant: "sidebar" as const,
        collapsible: "icon" as const,
      };
    }
    return {
      defaultOpen: true,
      variant: "sidebar" as const,
      collapsible: "icon" as const,
    };
  };

  const sidebarConfig = getSidebarConfig();

  return (
    <SidebarProvider defaultOpen={sidebarConfig.defaultOpen}>
      <div
        className={cn(
          "min-h-screen flex w-full bg-background transition-all duration-300 ease-in-out",
          "motion-reduce:transition-none"
        )}
        style={{
          '--content-spacing': isTablet ? '1rem' : isDesktop ? '1.5rem' : '0.75rem',
        } as React.CSSProperties}
      >
        <Sidebar
          variant={sidebarConfig.variant}
          collapsible={sidebarConfig.collapsible}
          className={cn(
            "bg-gray-900 border-r border-gray-800 z-30",
            "transition-all duration-300 ease-in-out motion-reduce:transition-none"
          )}
        >
          <SidebarHeader className="border-b border-gray-800">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2 flex-1">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary-600 text-white">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight group-[[data-state=collapsed]]:hidden">
                  <span className="truncate font-semibold text-white">Flux Studio</span>
                  <span className="truncate text-xs text-gray-400">
                    Creative Design Platform
                  </span>
                </div>
              </div>
              <SidebarTrigger className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-800">
                <PanelLeftClose className="h-4 w-4 rotate-0 scale-100 transition-all group-[[data-state=collapsed]]:rotate-180" />
              </SidebarTrigger>
            </div>
          </SidebarHeader>

          <SidebarContent>
            {/* Main Navigation */}
            <SidebarGroup>
              <SidebarGroupLabel className="text-gray-400 group-[[data-state=collapsed]]:sr-only">Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={item.isActive}
                        tooltip={item.title}
                      >
                        <ForwardedAnchor href={item.url} className="text-gray-300 hover:text-white hover:bg-gray-800">
                          <item.icon className="text-gray-400" />
                          <span className="group-[[data-state=collapsed]]:sr-only">{item.title}</span>
                          {item.badge && (
                            <Badge
                              variant="secondary"
                              className="ml-auto h-5 w-5 shrink-0 items-center justify-center group-[[data-state=collapsed]]:hidden"
                            >
                              {item.badge}
                            </Badge>
                          )}
                        </ForwardedAnchor>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Contextual Navigation */}
            {contextualItems.length > 0 && (
              <>
                <SidebarSeparator className="bg-gray-800" />
                <SidebarGroup>
                  <SidebarGroupLabel className="text-gray-400 group-[[data-state=collapsed]]:sr-only">Current Context</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {contextualItems.map((item) => (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton
                            asChild
                            isActive={item.isActive}
                            tooltip={item.title}
                          >
                            <ForwardedAnchor href={item.url} className="text-gray-300 hover:text-white hover:bg-gray-800">
                              <item.icon className="text-gray-400" />
                              <span className="group-[[data-state=collapsed]]:sr-only">{item.title}</span>
                              {item.children && item.children.length > 0 && (
                                <ChevronRight className="ml-auto h-4 w-4 group-[[data-state=collapsed]]:hidden" />
                              )}
                            </ForwardedAnchor>
                          </SidebarMenuButton>
                          {/* Sub-items would go here if expanded */}
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </>
            )}

            {/* Quick Actions */}
            <SidebarSeparator className="bg-gray-800" />
            <SidebarGroup>
              <SidebarGroupLabel className="text-gray-400 group-[[data-state=collapsed]]:sr-only">Quick Actions</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      tooltip="Global Search"
                    >
                      <ForwardedButton onClick={openCommandPalette} className="text-gray-300 hover:text-white hover:bg-gray-800">
                        <Search className="text-gray-400" />
                        <span className="group-[[data-state=collapsed]]:sr-only">Search</span>
                        <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 group-[[data-state=collapsed]]:hidden">
                          <span className="text-xs">⌘</span>K
                        </kbd>
                      </ForwardedButton>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      tooltip="Create New"
                    >
                      <ForwardedButton onClick={() => navigate('/dashboard/organizations/create')} className="text-gray-300 hover:text-white hover:bg-gray-800">
                        <Plus className="text-gray-400" />
                        <span className="group-[[data-state=collapsed]]:sr-only">Create New</span>
                      </ForwardedButton>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-gray-800">
            <SidebarMenu>
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton
                      size="lg"
                      className="data-[state=open]:bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-800"
                    >
                      <Avatar className="h-8 w-8 rounded-lg">
                        <AvatarFallback className="rounded-lg bg-primary-600 text-white">
                          {user.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left text-sm leading-tight group-[[data-state=collapsed]]:hidden">
                        <span className="truncate font-semibold text-white">{user.name}</span>
                        <span className="truncate text-xs capitalize text-gray-400">
                          {user.userType}
                        </span>
                      </div>
                      <ChevronRight className="ml-auto size-4 text-gray-400 group-[[data-state=collapsed]]:hidden" />
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                    side="bottom"
                    align="end"
                    sideOffset={4}
                  >
                    <DropdownMenuItem onClick={() => navigate('/dashboard/profile')}>
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/dashboard/settings')}>
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </DropdownMenuItem>
                    {user.userType !== 'client' && (
                      <DropdownMenuItem onClick={() => navigate(getUserDashboardPath(user.userType))}>
                        <Palette className="mr-2 h-4 w-4" />
                        Specialized Dashboard
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="min-h-screen flex flex-col">
          <EnhancedHeader openCommandPalette={openCommandPalette} />
          <main className="flex-1 overflow-y-auto bg-gray-50">
            <div
              className={cn(
                "transition-all duration-300 ease-in-out motion-reduce:transition-none",
                // Responsive padding based on screen size and sidebar state
                isMobile ? "p-3" : "p-4",
                isTablet ? "md:p-5" : "md:p-6",
                isDesktop && "lg:p-8",
                // Additional spacing for large screens
                currentBreakpoint === 'xl' && "xl:p-10",
                currentBreakpoint === '2xl' && "2xl:p-12"
              )}
              style={{
                padding: 'var(--content-spacing)',
              } as React.CSSProperties}
            >
              {children}
            </div>
          </main>
        </SidebarInset>
      </div>

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={closeCommandPalette}
      />
    </SidebarProvider>
  );
}