"use client";

import { cn } from "@/lib/utils";
import React, { useState, createContext, useContext, useEffect, useCallback } from "react";
import { AnimatePresence, motion, MotionProps } from "framer-motion";
import { IconMenu2, IconX } from "@tabler/icons-react";

/**
 * Interface for sidebar navigation links
 */
interface Links {
  label: string;
  href: string;
  icon: React.JSX.Element | React.ReactNode;
  /** Optional badge to display on the link */
  badge?: string | number;
  /** Whether this link is currently active */
  isActive?: boolean;
  /** Optional click handler */
  onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  /** Accessibility label */
  ariaLabel?: string;
  /** Whether to show this link */
  show?: boolean;
  /** Nested links for submenus */
  subLinks?: Links[];
}

interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
  isMobile: boolean;
  activeLink: string | null;
  setActiveLink: (link: string | null) => void;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(
  undefined
);

/**
 * Hook to access sidebar context
 * @throws Error if used outside of SidebarProvider
 */
export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

interface SidebarProviderProps {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
  defaultOpen?: boolean;
}

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
  defaultOpen = false,
}: SidebarProviderProps) => {
  const [openState, setOpenState] = useState(defaultOpen);
  const [isMobile, setIsMobile] = useState(false);
  const [activeLink, setActiveLink] = useState<string | null>(null);

  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Close sidebar on mobile when clicking outside
  useEffect(() => {
    if (!isMobile || !open) return;

    const handleClickOutside = (event: MouseEvent) => {
      const sidebar = document.getElementById("mobile-sidebar");
      if (sidebar && !sidebar.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMobile, open, setOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && open && isMobile) {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, isMobile, setOpen]);

  return (
    <SidebarContext.Provider 
      value={{ 
        open, 
        setOpen, 
        animate, 
        isMobile, 
        activeLink, 
        setActiveLink 
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
};

interface SidebarProps extends SidebarProviderProps {
  children: React.ReactNode;
}

export const Sidebar = ({
  children,
  open,
  setOpen,
  animate,
  defaultOpen,
}: SidebarProps) => {
  return (
    <SidebarProvider 
      open={open} 
      setOpen={setOpen} 
      animate={animate}
      defaultOpen={defaultOpen}
    >
      {children}
    </SidebarProvider>
  );
};

interface SidebarBodyProps extends Omit<MotionProps, "children"> {
  children: React.ReactNode;
  className?: string;
}

export const SidebarBody = (props: SidebarBodyProps) => {
  return (
    <>
      <DesktopSidebar {...props} />
      <MobileSidebar {...props} />
    </>
  );
};

interface DesktopSidebarProps extends MotionProps {
  className?: string;
  children: React.ReactNode;
}

export const DesktopSidebar = ({
  className,
  children,
  ...props
}: DesktopSidebarProps) => {
  const { open, setOpen, animate } = useSidebar();
  
  return (
    <motion.aside
      className={cn(
        "h-full px-4 py-4 hidden md:flex md:flex-col bg-neutral-100 dark:bg-neutral-800 shrink-0 border-r border-neutral-200 dark:border-neutral-700",
        className
      )}
      animate={{
        width: animate ? (open ? "300px" : "70px") : "300px",
      }}
      transition={{
        duration: 0.3,
        ease: "easeInOut",
      }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      role="navigation"
      aria-label="Main navigation"
      {...props}
    >
      {children}
    </motion.aside>
  );
};

interface MobileSidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: React.ReactNode;
}

export const MobileSidebar = ({
  className,
  children,
  ...props
}: MobileSidebarProps) => {
  const { open, setOpen } = useSidebar();
  
  return (
    <>
      <div
        className={cn(
          "h-14 px-4 py-4 flex flex-row md:hidden items-center justify-between bg-neutral-100 dark:bg-neutral-800 w-full border-b border-neutral-200 dark:border-neutral-700",
          className
        )}
        {...props}
      >
        <div className="flex justify-end z-20 w-full">
          <button
            onClick={() => setOpen(!open)}
            className="p-2 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            <IconMenu2 className="text-neutral-800 dark:text-neutral-200 h-5 w-5" />
          </button>
        </div>
        
        <AnimatePresence>
          {open && (
            <motion.nav
              id="mobile-sidebar"
              initial={{ x: "-100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "-100%", opacity: 0 }}
              transition={{
                duration: 0.3,
                ease: "easeInOut",
              }}
              className={cn(
                "fixed h-full w-full inset-0 bg-white dark:bg-neutral-900 p-10 z-[100] flex flex-col justify-between overflow-y-auto",
                className
              )}
              role="navigation"
              aria-label="Mobile navigation"
            >
              <div>
                <button
                  className="absolute right-10 top-10 z-50 p-2 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                >
                  <IconX className="text-neutral-800 dark:text-neutral-200 h-5 w-5" />
                </button>
                <div className="mt-10">
                  {children}
                </div>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

interface SidebarLinkProps {
  link: Links;
  className?: string;
  onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  /** Whether to show the link in collapsed state */
  showInCollapsed?: boolean;
}

export const SidebarLink = ({
  link,
  className,
  onClick,
  showInCollapsed = true,
}: SidebarLinkProps) => {
  const { open, animate, setActiveLink, activeLink, isMobile, setOpen } = useSidebar();
  const [isSubMenuOpen, setIsSubMenuOpen] = useState(false);
  
  const isActive = link.isActive || activeLink === link.href;
  
  const handleClick = useCallback((event: React.MouseEvent<HTMLAnchorElement>) => {
    // Handle submenus
    if (link.subLinks && link.subLinks.length > 0) {
      event.preventDefault();
      setIsSubMenuOpen(!isSubMenuOpen);
    } else {
      setActiveLink(link.href);
      // Close mobile sidebar on link click
      if (isMobile) {
        setOpen(false);
      }
    }
    
    // Call custom onClick if provided
    if (link.onClick) {
      link.onClick(event);
    }
    if (onClick) {
      onClick(event);
    }
  }, [link, onClick, setActiveLink, isMobile, setOpen, isSubMenuOpen]);

  if (link.show === false) {
    return null;
  }

  return (
    <div className="relative">
      <a
        href={link.href}
        onClick={handleClick}
        className={cn(
          "flex items-center justify-start gap-2 group/sidebar py-2 px-2 rounded-md transition-all duration-150",
          "hover:bg-neutral-200 dark:hover:bg-neutral-700",
          isActive && "bg-neutral-200 dark:bg-neutral-700 font-medium",
          !open && !showInCollapsed && "md:hidden",
          className
        )}
        aria-label={link.ariaLabel || link.label}
        aria-current={isActive ? "page" : undefined}
      >
        <div className="flex items-center justify-center min-w-[24px]">
          {link.icon}
        </div>

        <motion.span
          animate={{
            display: animate ? (open ? "inline-block" : "none") : "inline-block",
            opacity: animate ? (open ? 1 : 0) : 1,
          }}
          className="text-neutral-700 dark:text-neutral-200 text-sm group-hover/sidebar:translate-x-1 transition duration-150 whitespace-nowrap overflow-hidden text-ellipsis flex-1"
        >
          {link.label}
        </motion.span>

        {link.badge && open && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="ml-auto bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full"
          >
            {link.badge}
          </motion.span>
        )}

        {link.subLinks && link.subLinks.length > 0 && open && (
          <motion.div
            animate={{ rotate: isSubMenuOpen ? 90 : 0 }}
            className="ml-auto"
          >
            <IconMenu2 className="h-4 w-4" />
          </motion.div>
        )}
      </a>

      {/* Submenu */}
      {link.subLinks && link.subLinks.length > 0 && (
        <AnimatePresence>
          {isSubMenuOpen && open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="ml-6 mt-1 space-y-1">
                {link.subLinks.map((subLink, index) => (
                  <SidebarLink
                    key={subLink.href + index}
                    link={subLink}
                    className="text-sm"
                    showInCollapsed={false}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
};

/**
 * Sidebar header component for branding
 */
interface SidebarHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const SidebarHeader = ({ children, className }: SidebarHeaderProps) => {
  const { open } = useSidebar();
  
  return (
    <div className={cn("mb-8", className)}>
      <AnimatePresence mode="wait">
        {open ? (
          <motion.div
            key="expanded"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        ) : (
          <motion.div
            key="collapsed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex justify-center"
          >
            {/* You can add a collapsed logo here */}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * Sidebar footer component
 */
interface SidebarFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const SidebarFooter = ({ children, className }: SidebarFooterProps) => {
  return (
    <div className={cn("mt-auto pt-4 border-t border-neutral-200 dark:border-neutral-700", className)}>
      {children}
    </div>
  );
};