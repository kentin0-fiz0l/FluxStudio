/* eslint-disable react-refresh/only-export-components */
"use client";

import * as React from "react";

import { useBreakpoint } from "../../hooks/useBreakpoint";
import { TooltipProvider } from "./tooltip";
import { cn } from "../../lib/utils";

export const SIDEBAR_COOKIE_NAME = "sidebar_state";
export const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
export const SIDEBAR_WIDTH_ICON = "3rem";
export const SIDEBAR_WIDTH_COLLAPSED = "2.5rem";
export const SIDEBAR_KEYBOARD_SHORTCUT = "b";

// Enhanced responsive widths
export const RESPONSIVE_WIDTHS = {
  mobile: "20rem",
  tablet: "14rem",
  desktop: "16rem",
  large: "18rem",
} as const;

export type SidebarContextProps = {
  state: "expanded" | "collapsed";
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  currentWidth: string;
  toggleSidebar: () => void;
  autoCollapse: boolean;
  setAutoCollapse: (auto: boolean) => void;
};

export const SidebarContext = React.createContext<SidebarContextProps | null>(null);

export function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.");
  }

  return context;
}

export function SidebarProvider({
  defaultOpen = true,
  open: openProp,
  onOpenChange: setOpenProp,
  className,
  style,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const { isMobile, isTablet, isDesktop, isLargeDesktop } = useBreakpoint();
  const [openMobile, setOpenMobile] = React.useState(false);
  const [autoCollapse, setAutoCollapse] = React.useState(false);

  // This is the internal state of the sidebar.
  // We use openProp and setOpenProp for control from outside the component.
  const [_open, _setOpen] = React.useState(defaultOpen);
  const open = openProp ?? _open;

  // Auto-collapse on tablet for better space utilization
  React.useEffect(() => {
    if (isTablet && autoCollapse) {
      _setOpen(false);
    } else if (isDesktop && !isMobile) {
      // Auto-expand on desktop if not manually collapsed
      const savedState = document.cookie
        .split('; ')
        .find(row => row.startsWith(`${SIDEBAR_COOKIE_NAME}=`));
      if (!savedState) {
        _setOpen(true);
      }
    }
  }, [isTablet, isDesktop, isMobile, autoCollapse]);

  const setOpen = React.useCallback(
    (value: boolean | ((value: boolean) => boolean)) => {
      const openState = typeof value === "function" ? value(open) : value;
      if (setOpenProp) {
        setOpenProp(openState);
      } else {
        _setOpen(openState);
      }

      // This sets the cookie to keep the sidebar state.
      document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
    },
    [setOpenProp, open],
  );

  // Dynamic width calculation based on screen size
  const currentWidth = React.useMemo(() => {
    if (isMobile) return RESPONSIVE_WIDTHS.mobile;
    if (isTablet) return RESPONSIVE_WIDTHS.tablet;
    if (isLargeDesktop) return RESPONSIVE_WIDTHS.large;
    return RESPONSIVE_WIDTHS.desktop;
  }, [isMobile, isTablet, isLargeDesktop]);

  // Helper to toggle the sidebar.
  const toggleSidebar = React.useCallback(() => {
    return isMobile ? setOpenMobile((open) => !open) : setOpen((open) => !open);
  }, [isMobile, setOpen, setOpenMobile]);

  // Adds a keyboard shortcut to toggle the sidebar.
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSidebar]);

  // We add a state so that we can do data-state="expanded" or "collapsed".
  // This makes it easier to style the sidebar with Tailwind classes.
  const state = open ? "expanded" : "collapsed";

  const contextValue = React.useMemo<SidebarContextProps>(
    () => ({
      state,
      open,
      setOpen,
      isMobile,
      isTablet,
      isDesktop,
      currentWidth,
      openMobile,
      setOpenMobile,
      toggleSidebar,
      autoCollapse,
      setAutoCollapse,
    }),
    [state, open, setOpen, isMobile, isTablet, isDesktop, currentWidth, openMobile, setOpenMobile, toggleSidebar, autoCollapse, setAutoCollapse],
  );

  return (
    <SidebarContext.Provider value={contextValue}>
      <TooltipProvider delayDuration={0}>
        <div
          data-slot="sidebar-wrapper"
          style={
            {
              "--sidebar-width": currentWidth,
              "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
              "--sidebar-width-collapsed": SIDEBAR_WIDTH_COLLAPSED,
              ...style,
            } as React.CSSProperties
          }
          className={cn(
            "group/sidebar-wrapper has-data-[variant=inset]:bg-sidebar flex min-h-svh w-full transition-all duration-300 ease-in-out",
            "supports-[not(color:oklch(0_0_0))]:transition-none", // Disable for older browsers
            className,
          )}
          {...props}
        >
          {children}
        </div>
      </TooltipProvider>
    </SidebarContext.Provider>
  );
}
