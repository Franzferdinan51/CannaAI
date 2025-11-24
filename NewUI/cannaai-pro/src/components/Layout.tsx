import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Sprout,
  Thermometer,
  Scan,
  FileText,
  Settings,
  MessageCircle,
  Leaf,
  Bell,
  User
} from 'lucide-react';
import { useSocketContext } from '../contexts/SocketContext';

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  path: string;
  active?: boolean;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon, label, path, active }) => {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(path)}
      className={`
        group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 mb-1 w-full text-left
        ${active
          ? 'bg-[#252A33] text-white shadow-sm border-l-2 border-emerald-500'
          : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
        }
      `}
    >
      <span className={`${active ? 'text-emerald-400' : 'text-gray-500 group-hover:text-gray-300'}`}>
        {icon}
      </span>
      {label}
    </button>
  );
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { isConnected, notifications } = useSocketContext();

  const sidebarItems = [
    { icon: <LayoutDashboard className="w-5 h-5" />, label: 'Dashboard', path: '/dashboard' },
    { icon: <Sprout className="w-5 h-5" />, label: 'Plants', path: '/plants' },
    { icon: <Thermometer className="w-5 h-5" />, label: 'Sensors', path: '/sensors' },
    { icon: <Scan className="w-5 h-5" />, label: 'Scanner', path: '/scanner' },
    { icon: <FileText className="w-5 h-5" />, label: 'Reports', path: '/reports' },
    { icon: <MessageCircle className="w-5 h-5" />, label: 'AI Assistant', path: '/chat' },
    { icon: <Settings className="w-5 h-5" />, label: 'Settings', path: '/settings' },
  ];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#0B0D10] text-gray-300 selection:bg-emerald-500/30">

      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-gray-800 bg-[#11141A] flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-gray-800">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xl">
            <Leaf className="w-6 h-6" />
            <span className="text-white">CannaAI</span>
            <span className="text-emerald-500 font-light">Pro</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          {sidebarItems.map((item) => (
            <SidebarItem
              key={item.path}
              icon={item.icon}
              label={item.label}
              path={item.path}
              active={location.pathname === item.path}
            />
          ))}
        </nav>

        {/* Bottom Section */}
        <div className="p-3 border-t border-gray-800">
          {/* Connection Status */}
          <div className="flex items-center gap-2 px-3 py-2 text-xs">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`} />
            <span className="text-gray-400">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          {/* Notifications & User */}
          <div className="flex items-center gap-2 px-3 py-2">
            <button className="relative p-2 text-gray-400 hover:text-gray-200 transition-colors">
              <Bell className="w-5 h-5" />
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full" />
              )}
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-200 transition-colors">
              <User className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="flex-1 overflow-hidden"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

export default Layout;