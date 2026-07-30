import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu, X, Wifi, WifiOff, LayoutDashboard, ScanLine, Sprout,
  Activity, FileText, MessageSquare, Settings, Zap, ChevronRight,
  Camera, AlertTriangle, BrainCircuit
} from "lucide-react";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/scanner", label: "Plant Analysis", icon: ScanLine, highlight: true },
  { path: "/plants", label: "Plants", icon: Sprout },
  { path: "/sensors", label: "Sensors", icon: Activity },
  { path: "/reports", label: "Reports", icon: FileText },
  { path: "/chat", label: "AI Assistant", icon: MessageSquare },
  { path: "/advisors", label: "MoA Advisors", icon: BrainCircuit },
  { path: "/automation", label: "Automation", icon: Zap },
  { path: "/settings", label: "Settings", icon: Settings },
];

const mobileNavItems = navItems.filter(item =>
  ['/dashboard', '/scanner', '/plants', '/chat', '/advisors'].includes(item.path)
);

export default function Layout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const location = useLocation();
  const navigate = useNavigate();

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

  // Close sidebar on route change
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');
  const currentPage = navItems.find(item => isActive(item.path)) || navItems[0];

  return (
    <div className="flex min-h-screen bg-[#090d0b] text-white selection:bg-emerald-400/30">
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{
          x: isSidebarOpen ? 0 : -280,
        }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed lg:static inset-y-0 left-0 z-50 w-[280px] bg-[#101712]/95 backdrop-blur-xl border-r border-emerald-950/80 flex flex-col lg:translate-x-0"
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-5 border-b border-emerald-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-300 via-emerald-500 to-teal-600 shadow-lg shadow-emerald-950/60 flex items-center justify-center">
              <Sprout className="w-6 h-6 text-emerald-950" />
            </div>
            <div>
              <h1 className="font-bold text-lg">CannaAI</h1>
              <p className="text-xs text-emerald-300/70">Cultivation OS</p>
            </div>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-2 hover:bg-gray-800 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          <p className="px-3 pt-2 pb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-200/40">Grow room</p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all
                  ${active
                    ? 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/15 shadow-sm shadow-black/20'
                    : 'text-slate-400 hover:bg-white/[0.045] hover:text-white'
                  }
                  ${item.highlight && !active ? 'ring-1 ring-emerald-500/30' : ''}
                `}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-emerald-400' : ''}`} />
                <span className="font-medium">{item.label}</span>
                {item.highlight && (
                  <Camera className="w-4 h-4 ml-auto text-emerald-400" />
                )}
                {active && <ChevronRight className="w-4 h-4 ml-auto" />}
              </button>
            );
          })}
        </nav>

        {/* Connection Status */}
        <div className="p-4 border-t border-emerald-950/80">
          <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${isOnline ? 'bg-emerald-400/5 text-emerald-300' : 'bg-red-400/5 text-red-300'}`}>
            {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            <span>{isOnline ? 'Connected' : 'Offline Mode'}</span>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-[#101712]/95 backdrop-blur-xl border-b border-emerald-950/80 sticky top-0 z-30">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 hover:bg-gray-800 rounded-lg"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-300 to-emerald-600 flex items-center justify-center">
              <Sprout className="w-5 h-5 text-emerald-950" />
            </div>
            <span className="font-bold">CannaAI</span>
          </div>
          <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-red-400'}`} />
        </header>

        <header className="hidden lg:flex h-[76px] items-center justify-between px-8 border-b border-emerald-950/70 bg-[#0d120f]/80 backdrop-blur-xl sticky top-0 z-20">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300/55">CannaAI workspace</p>
            <h2 className="mt-1 text-xl font-semibold text-white">{currentPage.label}</h2>
          </div>
          <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${isOnline ? 'border-emerald-400/15 bg-emerald-400/5 text-emerald-300' : 'border-red-400/15 bg-red-400/5 text-red-300'}`}>
            <span className={`h-2 w-2 rounded-full ${isOnline ? 'bg-emerald-400 shadow-[0_0_10px_#34d399]' : 'bg-red-400'}`} />
            {isOnline ? 'System online' : 'Offline mode'}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto pb-20 lg:pb-0">
          {children}
        </main>

        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 flex items-center justify-around border-t border-emerald-950/80 bg-[#101712]/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl">
          {mobileNavItems.map(item => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return <button key={item.path} onClick={() => navigate(item.path)} className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium transition-colors ${active ? 'text-emerald-300' : 'text-slate-500'}`}>
              <span className={`grid h-8 w-10 place-items-center rounded-xl ${active ? 'bg-emerald-400/12' : ''}`}><Icon className="h-4 w-4" /></span>
              <span className="truncate">{item.label.replace('Plant Analysis', 'Scan').replace('AI Assistant', 'Assistant').replace('MoA Advisors', 'Advisors')}</span>
            </button>;
          })}
        </nav>
      </div>
    </div>
  );
}
