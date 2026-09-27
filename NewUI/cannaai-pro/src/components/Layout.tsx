import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu, X, Wifi, WifiOff, LayoutDashboard, ScanLine, Sprout,
  Activity, FileText, MessageSquare, Settings, Zap, ChevronRight,
  BrainCircuit, Plus, Leaf
} from "lucide-react";
import { useSettingsStore } from './settings/store';

const navGroups = [
  {
    label: "Grow room",
    items: [
      { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { path: "/scanner", label: "Plant Analysis", icon: ScanLine, highlight: true },
      { path: "/plants", label: "Plants", icon: Sprout },
      { path: "/sensors", label: "Sensors", icon: Activity },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { path: "/chat", label: "AI Assistant", icon: MessageSquare },
      { path: "/advisors", label: "MoA Advisors", icon: BrainCircuit },
      { path: "/reports", label: "Reports", icon: FileText },
    ],
  },
  {
    label: "System",
    items: [
      { path: "/automation", label: "Automation", icon: Zap },
      { path: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

const flatNavItems = navGroups.flatMap(g => g.items);

const mobileNavItems = flatNavItems.filter(item =>
  ['/dashboard', '/scanner', '/plants', '/chat', '/advisors'].includes(item.path)
);

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-300 via-emerald-400 to-lime-400 flex items-center justify-center shadow-[0_0_32px_-6px_rgba(52,211,153,0.8)]">
          <Sprout className="w-6 h-6 text-emerald-950" strokeWidth={2.4} />
        </div>
        <div className="absolute -inset-1 rounded-2xl bg-emerald-400/25 blur-lg -z-10" />
      </div>
      {!compact && (
        <div>
          <h1 className="font-display font-800 font-extrabold text-[19px] leading-none tracking-tight">
            <span className="gradient-text">CannaAI</span>
          </h1>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-200/50">Cultivation OS</p>
        </div>
      )}
    </div>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia('(min-width: 1024px)').matches);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const location = useLocation();
  const navigate = useNavigate();
  const displaySettings = useSettingsStore(state => state.settings?.display);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.cannaaiCompact = displaySettings?.compactMode ? 'true' : 'false';
    root.dataset.cannaaiAnimations = displaySettings?.animationsEnabled === false ? 'false' : 'true';
    return () => {
      delete root.dataset.cannaaiCompact;
      delete root.dataset.cannaaiAnimations;
    };
  }, [displaySettings?.compactMode, displaySettings?.animationsEnabled]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const handleViewportChange = () => setIsDesktop(mediaQuery.matches);
    handleViewportChange();
    mediaQuery.addEventListener('change', handleViewportChange);
    return () => mediaQuery.removeEventListener('change', handleViewportChange);
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');
  const currentPage = flatNavItems.find(item => isActive(item.path)) || flatNavItems[0];

  return (
    <div className="grain flex min-h-screen text-white">
      {/* Ambient background */}
      <div className="ambient-stage">
        <div className="ambient-orb ambient-orb-1" />
        <div className="ambient-orb ambient-orb-2" />
        <div className="ambient-orb ambient-orb-3" />
      </div>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ x: isDesktop || isSidebarOpen ? 0 : -300 }}
        transition={{ type: "spring", damping: 28, stiffness: 220 }}
        className="fixed lg:sticky top-0 inset-y-0 left-0 z-50 w-[288px] h-screen flex flex-col glass-deep lg:rounded-r-3xl lg:my-3 lg:ml-3 lg:h-[calc(100vh-1.5rem)]"
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 pt-6 pb-5">
          <Logo />
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-2 rounded-xl hover:bg-white/[0.06] text-white/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-6 scrollbar-hide">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.24em] text-emerald-200/35">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <button
                      key={item.path}
                      type="button"
                      aria-current={active ? 'page' : undefined}
                      onClick={() => navigate(item.path)}
                      className={`group relative w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[14px] transition-all duration-300 ${
                        active
                          ? 'text-white font-semibold'
                          : 'text-white/50 hover:text-white hover:bg-white/[0.05] font-medium'
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="nav-active-pill"
                          className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-400/[0.16] to-lime-400/[0.07] border border-emerald-400/25 shadow-[0_0_24px_-8px_rgba(52,211,153,0.6)]"
                          transition={{ type: "spring", damping: 30, stiffness: 350 }}
                        />
                      )}
                      <span className={`relative z-10 grid place-items-center w-8 h-8 rounded-lg transition-all duration-300 ${
                        active
                          ? 'bg-emerald-400/20 text-emerald-300 shadow-[0_0_16px_-4px_rgba(52,211,153,0.7)]'
                          : 'bg-white/[0.04] text-white/45 group-hover:text-white/80 group-hover:bg-white/[0.07]'
                      }`}>
                        <Icon className="w-[18px] h-[18px]" strokeWidth={active ? 2.4 : 2} />
                      </span>
                      <span className="relative z-10">{item.label}</span>
                      {item.highlight && !active && (
                        <span className="relative z-10 ml-auto pill pill-live !py-0.5 !px-2 !text-[9px]">
                          <span className="dot-pulse !w-1.5 !h-1.5" /> AI
                        </span>
                      )}
                      {active && <ChevronRight className="relative z-10 w-4 h-4 ml-auto text-emerald-300/70" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Status footer */}
        <div className="p-4">
          <div className={`glass rounded-2xl p-3.5 ${isOnline ? '' : 'opacity-80'}`}>
            <div className="flex items-center gap-2.5">
              {isOnline ? (
                <span className="dot-pulse" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-300" />
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-[13px] font-semibold ${isOnline ? 'text-emerald-200' : 'text-red-200'}`}>
                  {isOnline ? 'All systems live' : 'Offline mode'}
                </p>
                <p className="text-[11px] text-white/40 truncate">
                  {isOnline ? 'Local AI · sensors · automations' : 'Changes will sync when back online'}
                </p>
              </div>
              <Leaf className="w-4 h-4 text-emerald-400/40" />
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 glass-deep sticky top-0 z-30 border-x-0 border-t-0">
          <button
            type="button"
            aria-label="Open navigation menu"
            onClick={() => setIsSidebarOpen(true)}
            className="p-2.5 rounded-xl hover:bg-white/[0.06] text-white/80"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Logo compact />
          <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-400 shadow-[0_0_12px_#34d399]' : 'bg-red-400'}`} />
        </header>

        {/* Desktop header */}
        <header className="hidden lg:flex h-[88px] items-center justify-between px-8 sticky top-0 z-20">
          <div className="rise-in">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-emerald-300/50">
              CannaAI workspace
            </p>
            <h2 className="mt-1.5 font-display text-[26px] font-bold text-white tracking-tight">
              {currentPage.label}
            </h2>
          </div>
          <div className="flex items-center gap-3 rise-in rise-in-1">
            <button
              type="button"
              onClick={() => navigate('/scanner')}
              className="btn-primary-glow inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm"
            >
              <Plus className="h-4 w-4" strokeWidth={2.6} />
              New analysis
            </button>
            <div className={`glass flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold ${isOnline ? 'text-emerald-200' : 'text-red-200'}`}>
              {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              {isOnline ? 'System online' : 'Offline mode'}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 px-4 pb-28 pt-2 sm:px-6 lg:px-8 lg:pb-10 lg:pt-1">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 glass-deep border-x-0 border-b-0 px-3 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-2.5">
          <div className="flex items-center justify-around">
            {mobileNavItems.map(item => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <button
                  key={item.path}
                  type="button"
                  aria-label={item.label}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => navigate(item.path)}
                  className="relative flex min-w-0 flex-1 flex-col items-center gap-1 py-1"
                >
                  <span className={`grid h-10 w-12 place-items-center rounded-2xl transition-all duration-300 ${
                    active
                      ? 'bg-emerald-400/15 text-emerald-300 shadow-[0_0_20px_-6px_rgba(52,211,153,0.7)]'
                      : 'text-white/40'
                  }`}>
                    <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
                  </span>
                  <span className={`text-[9px] font-semibold tracking-wide ${active ? 'text-emerald-300' : 'text-white/35'}`}>
                    {item.label.replace('Plant Analysis', 'Scan').replace('AI Assistant', 'Assistant').replace('MoA Advisors', 'Advisors')}
                  </span>
                  {active && (
                    <motion.span
                      layoutId="mobile-nav-dot"
                      className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
