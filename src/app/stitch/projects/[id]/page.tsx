import React from 'react';
import { StitchSidebar } from '@/components/stitch-sidebar';
import { StitchTable } from '@/components/stitch-table';

export default function StitchProjectPage() {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <StitchSidebar />
      <main className="flex-1 h-full overflow-hidden">
        <StitchTable />
      </main>
    </div>
  );
}
