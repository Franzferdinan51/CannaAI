'use client';

import React, { useState } from 'react';
import {
  Search,
  RefreshCw,
  Link as LinkIcon,
  Check,
  ChevronDown,
  Plus,
  ArrowRight
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Mock Data
interface TableRowData {
  id: string;
  name: string;
  linked: boolean;
  resync: boolean;
  method: string;
  key: string;
}

const initialData: TableRowData[] = [
  { id: '1', name: 'public.m_events', linked: true, resync: true, method: 'Log-based Incremental', key: 'id' },
  { id: '2', name: 'public.m_messages', linked: true, resync: true, method: 'Log-based Incremental', key: 'id' },
  { id: '3', name: 'public.m_users', linked: true, resync: true, method: 'Log-based Incremental', key: 'id' },
  { id: '4', name: 'public.m_analytics', linked: true, resync: false, method: 'Full Table', key: '-' },
  { id: '5', name: 'public.m_logs', linked: false, resync: false, method: '-', key: '-' },
  { id: '6', name: 'public.m_orders', linked: true, resync: true, method: 'Key-based Incremental', key: 'updated_at' },
];

export function StitchTable() {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set(['1', '2', '3', '4', '6']));
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const toggleRow = (id: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
  };

  const toggleAll = () => {
    if (selectedRows.size === initialData.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(initialData.map(d => d.id)));
    }
  };

  const filteredData = initialData.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    if (activeTab === 'selected') return matchesSearch && selectedRows.has(item.id);
    if (activeTab === 'not-selected') return matchesSearch && !selectedRows.has(item.id);
    return matchesSearch;
  });

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header Section */}
      <div className="px-8 py-6 border-b border-slate-200">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-semibold text-slate-800">Tables to Replicate</h2>
            <p className="text-sm text-slate-500 mt-1">
              Select the tables you want to sync to your destination.
            </p>
          </div>
          <Button variant="default" className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-2" />
            Add tables
          </Button>
        </div>

        <div className="flex items-center gap-4 mt-6">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search tables..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-[400px]">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="selected">Selected ({selectedRows.size})</TabsTrigger>
              <TabsTrigger value="not-selected">Not Selected</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Table Section */}
      <div className="flex-1 overflow-auto p-8 bg-slate-50/50">
        <div className="bg-white rounded-md border border-slate-200 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={selectedRows.size === initialData.length}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <TableHead>Table Name</TableHead>
                <TableHead className="w-[100px] text-center">Linked</TableHead>
                <TableHead className="w-[100px] text-center">Resync</TableHead>
                <TableHead>Replication Method</TableHead>
                <TableHead>Replication Key</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((row) => (
                <TableRow key={row.id} className={selectedRows.has(row.id) ? "bg-indigo-50/30" : ""}>
                  <TableCell>
                    <Checkbox
                      checked={selectedRows.has(row.id)}
                      onCheckedChange={() => toggleRow(row.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium text-slate-700">{row.name}</TableCell>
                  <TableCell className="text-center">
                    {row.linked && <LinkIcon className="w-4 h-4 text-green-500 mx-auto" />}
                  </TableCell>
                  <TableCell className="text-center">
                    {row.resync && <RefreshCw className="w-4 h-4 text-blue-500 mx-auto" />}
                  </TableCell>
                  <TableCell>
                    {row.method !== '-' ? (
                       <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 text-sm font-normal justify-start px-2 w-full hover:bg-slate-100">
                            {row.method} <ChevronDown className="w-3 h-3 ml-auto opacity-50" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuItem>Log-based Incremental</DropdownMenuItem>
                          <DropdownMenuItem>Key-based Incremental</DropdownMenuItem>
                          <DropdownMenuItem>Full Table</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <span className="text-slate-400 pl-2">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                     {row.key !== '-' ? (
                      <span className="text-sm text-slate-600 font-mono bg-slate-100 px-2 py-1 rounded">
                        {row.key}
                      </span>
                     ) : (
                       <span className="text-slate-400">-</span>
                     )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-200 bg-white flex justify-end">
        <Button className="bg-indigo-600 hover:bg-indigo-700 px-8">
          Continue
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
