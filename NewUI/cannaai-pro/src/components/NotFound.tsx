import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, LayoutDashboard } from 'lucide-react';

const NotFound: React.FC = () => (
  <div className="flex-1 flex items-center justify-center bg-gray-900 text-white p-6">
    <div className="text-center max-w-md">
      <Compass className="w-14 h-14 text-emerald-500 mx-auto mb-4" />
      <h2 className="text-2xl font-bold mb-3">Page not found</h2>
      <p className="text-gray-400 mb-6">
        The page you are looking for does not exist or may have moved.
      </p>
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
      >
        <LayoutDashboard className="w-4 h-4" />
        Back to dashboard
      </Link>
    </div>
  </div>
);

export default NotFound;
