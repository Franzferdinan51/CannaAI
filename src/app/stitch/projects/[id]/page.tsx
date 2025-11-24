import React from 'react';
import { StitchSidebar } from '@/components/stitch-sidebar';
import { StitchTable } from '@/components/stitch-table';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Settings, Play } from 'lucide-react';

// Mock data for demonstration - in a real app this would come from an API
const MOCK_PROJECTS: Record<string, { name: string; status: string; lastSynced: string }> = {
  "9001494476041120481": {
    name: "Marketing Database",
    status: "Active",
    lastSynced: "10 mins ago"
  }
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function StitchProjectPage({ params }: PageProps) {
  const { id } = await params;

  const project = MOCK_PROJECTS[id] || {
    name: `Project ${id.substring(0, 8)}...`,
    status: "Unknown",
    lastSynced: "Never"
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      <StitchSidebar />
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-white">
        {/* Top Navigation / Breadcrumbs */}
        <div className="px-8 py-4 border-b border-slate-200 bg-white">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/stitch">Stitch</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="/stitch/projects">Projects</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{project.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Project Header */}
        <div className="px-8 py-6 bg-white">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-slate-900">{project.name}</h1>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  {project.status}
                </Badge>
              </div>
              <p className="text-slate-500 flex items-center gap-2 text-sm">
                <span>ID: {id}</span>
                <span>•</span>
                <span>Last synced: {project.lastSynced}</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
               <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                <Play className="w-4 h-4 mr-2" />
                Run Extraction
              </Button>
            </div>
          </div>
        </div>

        <Separator />

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden bg-slate-50/50">
           <StitchTable />
        </div>
      </main>
    </div>
  );
}
