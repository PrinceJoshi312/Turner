import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { LogOut, Rocket, BarChart2, LayoutDashboard } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-2.5">
      <div className="flex flex-wrap justify-between items-center max-w-6xl mx-auto">
        <Link to="/" className="flex items-center gap-2">
          <div className="bg-primary-600 p-1.5 rounded-lg">
            <Rocket className="w-6 h-6 text-white" />
          </div>
          <span className="self-center text-xl font-bold whitespace-nowrap text-gray-900">
            AutoFineTune
          </span>
        </Link>
        
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            <Link to="/jobs/new" className="hover:text-primary-600 flex items-center gap-1.5">
              <PlusSquare className="w-4 h-4" /> New Job
            </Link>
            <Link to="/evaluations" className="hover:text-primary-600 flex items-center gap-1.5">
              <BarChart2 className="w-4 h-4" /> Evaluations
            </Link>
          </div>

          <div className="flex items-center gap-4 border-l pl-6 border-gray-200">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-gray-900 truncate max-w-[150px]">
                {user?.email}
              </p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Developer</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm font-semibold text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

const PlusSquare = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>
);

export default Navbar;
