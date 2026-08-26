import React from 'react';
import { useParams } from 'react-router-dom';
import ComprehensiveDashboard from './ComprehensiveDashboard';

const dashboardTabs = new Set(['overview', 'analysis', 'environment', 'strains']);

const Dashboard: React.FC = () => {
  const { tab } = useParams<{ tab?: string }>();
  const initialDashboard = tab && dashboardTabs.has(tab)
    ? tab as 'overview' | 'analysis' | 'environment' | 'strains'
    : undefined;
  return <ComprehensiveDashboard initialDashboard={initialDashboard} />;
};

export default Dashboard;
