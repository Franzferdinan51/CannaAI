import React, { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu, X, Wifi, WifiOff, LayoutDashboard, ScanLine, Sprout,
  Activity, FileText, MessageSquare, Settings, Zap, ChevronRight,
  Camera, AlertTriangle
} from "lucide-react";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/scanner", label: "Plant Analysis", icon: ScanLine, highlight: true },
  { path: "/plants", label: "Plants", icon: Sprout },
  { path: "/sensors", label: "Sensors", icon: Activity },
  { path: "/reports", label: "Reports", icon: FileText },
  { path: "/chat", label: "AI Assistant", icon: MessageSquare },
  { path: "/automation", label: "Automation", icon: Zap },
  { path: "/settings", label: "Settings", icon: Settings },
];

export default function Layout() {
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

  return (
    <div className="flex h-screen bg-[#0B0D10] text-white">
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
        className="fixed lg:static inset-y-0 left-0 z-50 w-[280px] bg-[#181B21] border-r border-gray-800 flex flex-col lg:translate-x-0"
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
              <Sprout className="w-6 h-6 text-black" />
            </div>
            <div>
              <h1 className="font-bold text-lg">CannaAI</h1>
              <p className="text-xs text-gray-400">Pro Edition</p>
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
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }
                  ${item.highlight ? 'ring-1 ring-emerald-500/50' : ''}
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
        <div className="p-4 border-t border-gray-800">
          <div className={`flex items-center gap-2 text-sm ${isOnline ? 'text-emerald-400' : 'text-red-400'}`}>
            {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            <span>{isOnline ? 'Connected' : 'Offline Mode'}</span>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between p-4 bg-[#181B21] border-b border-gray-800">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 hover:bg-gray-800 rounded-lg"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
              <Sprout className="w-5 h-5 text-black" />
            </div>
            <span className="font-bold">CannaAI</span>
          </div>
          <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-red-400'}`} />
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}