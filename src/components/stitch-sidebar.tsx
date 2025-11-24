'use client';

import React from 'react';
import {
  Layers,
  GitMerge,
  Activity,
  FileText,
  Table,
  Columns,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  href: string;
  active?: boolean;
  subItems?: NavItem[];
}

export function StitchSidebar() {
  const navItems = [
    {
      label: 'Replication',
      icon: <Layers className="w-5 h-5" />,
      href: '#',
      active: true,
      subItems: [
        { label: 'Summary', icon: <FileText className="w-4 h-4" />, href: '#' },
        { label: 'Tables to Replicate', icon: <Table className="w-4 h-4" />, href: '#', active: true },
        { label: 'Columns', icon: <Columns className="w-4 h-4" />, href: '#' },
        { label: 'Settings', icon: <Settings className="w-4 h-4" />, href: '#' },
      ]
    },
    {
      label: 'Transformation',
      icon: <GitMerge className="w-5 h-5" />,
      href: '#',
      active: false
    },
    {
      label: 'Orchestration',
      icon: <Activity className="w-5 h-5" />,
      href: '#',
      active: false
    }
  ];

  return (
    <div className="w-64 bg-slate-50 border-r border-slate-200 h-screen flex flex-col font-sans">
      <div className="p-4 border-b border-slate-200">
        <h1 className="font-bold text-xl text-slate-800 flex items-center gap-2">
          <div className="w-6 h-6 bg-indigo-600 rounded flex items-center justify-center text-white text-xs">S</div>
          Stitch
        </h1>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1">
          {navItems.map((item, index) => (
            <li key={index}>
              <div
                className={cn(
                  "flex items-center px-4 py-2 text-sm font-medium transition-colors",
                  item.active ? "text-indigo-600 bg-indigo-50" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                )}
              >
                <span className="mr-3">{item.icon}</span>
                {item.label}
              </div>

              {item.subItems && (
                <ul className="mt-1 mb-2">
                  {item.subItems.map((subItem, subIndex) => (
                    <li key={subIndex}>
                      <Link
                        href={subItem.href}
                        className={cn(
                          "flex items-center pl-12 pr-4 py-1.5 text-sm transition-colors block",
                          subItem.active
                            ? "text-indigo-700 font-medium bg-indigo-50 border-r-2 border-indigo-600"
                            : "text-slate-500 hover:text-slate-900"
                        )}
                      >
                        {subItem.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-slate-200 text-xs text-slate-400">
        Project ID: 900149...
      </div>
    </div>
  );
}
