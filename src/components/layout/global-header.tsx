'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Home,
  Leaf,
  Camera,
  Wrench,
  Settings,
  Menu,
  X,
  Bot,
  Sun,
  Droplets,
  Thermometer,
  Activity
} from 'lucide-react';
import { motion } from 'framer-motion';

interface GlobalHeaderProps {
  className?: string;
}

export default function GlobalHeader({ className = "" }: GlobalHeaderProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  // Navigation items
  const navItems = [
    { href: '/', label: 'Dashboard', icon: Home, pageId: 'dashboard' },
    { href: '/live-vision', label: 'Live Vision', icon: Camera, pageId: 'live-vision' },
    { href: '/all-tools', label: 'All Tools', icon: Wrench, pageId: 'all-tools' },
    { href: '/dashboard?view=settings', label: 'Settings', icon: Settings, pageId: 'settings' }
  ];

  // Get current page context
  const getCurrentPageContext = () => {
    const currentPath = pathname;

    // Check URL parameters for view/tab
    const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const view = urlParams?.get("view");
    const tab = urlParams?.get("tab");

    if (currentPath === "/" || currentPath.startsWith("/dashboard")) {
      // Check for settings view parameter on main page
      if (view === "settings" || tab === "settings") {
        return {
          page: "settings",
          title: "Settings",
          description: "System configuration and preferences"
        };
      }
      return {
        page: "dashboard",
        title: "Dashboard",
        description: "Overview of your cultivation system"
      };
    } else if (currentPath.startsWith("/live-vision")) {
      return {
        page: "live-vision",
        title: "Live Vision",
        description: "Real-time plant analysis and monitoring"
      };
    } else if (currentPath.startsWith("/all-tools")) {
      return {
        page: "all-tools",
        title: "Cultivation Tools",
        description: "Complete toolkit for plant management"
      };
    } else if (currentPath.startsWith("/settings")) {
      return {
        page: "settings",
        title: "Settings",
        description: "System configuration and preferences"
      };
    }

    return {
      page: 'unknown',
      title: 'CannaAI Pro',
      description: 'Cannabis cultivation management'
    };
  };

  // Update AI assistant context when page changes
  useEffect(() => {
    const pageContext = getCurrentPageContext();

    // Update global AI assistant context if it's available
    if ((window as any).updateAIContext) {
      (window as any).updateAIContext({
        ...pageContext,
        sensorData: window.sensorData || {}
      });
    }
  }, [pathname]);

  const currentContext = getCurrentPageContext();

  return (
    <header className={`bg-slate-900 border-b border-slate-700 text-white sticky top-0 z-40 ${className}`}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <Leaf className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                CannaAI Pro
              </span>
            </Link>

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden text-white hover:bg-slate-800"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href ||
                (item.pageId === "settings" &&
                 ((pathname === "/" || pathname === "/dashboard") &&
                  (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("view") === "settings" : false)));

              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? 'default' : 'ghost'}
                    className={`flex items-center space-x-2 ${
                      isActive
                        ? 'bg-green-600 text-white hover:bg-green-500'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Button>
                </Link>
              );
            })}
          </nav>

          {/* Right side items */}
          <div className="flex items-center space-x-3">
            {/* Current page indicator */}
            <div className="hidden sm:flex items-center space-x-2 text-sm text-slate-400">
              <Activity className="h-4 w-4" />
              <span>{currentContext.title}</span>
            </div>

            {/* Quick sensor stats (if available) */}
            {typeof window !== 'undefined' && (window as any).sensorData && (
              <div className="hidden lg:flex items-center space-x-3 text-xs">
                <Badge variant="outline" className="text-orange-400 border-orange-600">
                  <Thermometer className="h-3 w-3 mr-1" />
                  {Math.round(((window as any).sensorData.temperature * 9/5) + 32)}°F
                </Badge>
                <Badge variant="outline" className="text-blue-400 border-blue-600">
                  <Droplets className="h-3 w-3 mr-1" />
                  {(window as any).sensorData.humidity}%
                </Badge>
                <Badge variant="outline" className="text-green-400 border-green-600">
                  <Sun className="h-3 w-3 mr-1" />
                  {(window as any).sensorData.lightIntensity || 0}
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-slate-700"
          >
            <nav className="py-2 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href ||
                  (item.pageId === "settings" &&
                   ((pathname === "/" || pathname === "/dashboard") &&
                    (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("view") === "settings" : false)));

                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant={isActive ? 'default' : 'ghost'}
                      className={`w-full justify-start flex items-center space-x-2 ${
                        isActive
                          ? 'bg-green-600 text-white hover:bg-green-500'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Button>
                  </Link>
                );
              })}
            </nav>
          </motion.div>
        )}
      </div>
    </header>
  );
}