import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ClipboardEdit, Users, Building, ListTodo, CheckSquare, UserPlus, LogOut, Database, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAppStore } from '../services/storage';
import { UserRole } from '../types';

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isDev } = useAppStore();

  const isActive = (path: string) => location.pathname === path ? 'bg-white/20' : '';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const allNavItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard', roles: [UserRole.MANAGER, UserRole.EMPLOYEE] },
    { path: '/record', icon: ClipboardEdit, label: 'บันทึก KPI', roles: [UserRole.MANAGER, UserRole.EMPLOYEE] },
    { path: '/employees', icon: Users, label: 'จัดการพนักงาน', roles: [UserRole.MANAGER] },
    { path: '/departments', icon: Building, label: 'จัดการแผนก', roles: [UserRole.MANAGER] },
    { path: '/kpis', icon: ListTodo, label: 'จัดการ KPI', roles: [UserRole.MANAGER] },
    { path: '/activities', icon: CheckSquare, label: 'จัดการกิจกรรม', roles: [UserRole.MANAGER] },
    { path: '/assignments', icon: UserPlus, label: 'มอบหมาย KPI', roles: [UserRole.MANAGER] },
  ];

  // Filter items based on role
  const navItems = allNavItems.filter(item => user && item.roles.includes(user.role));

  return (
    <nav className="w-64 bg-gradient-to-br from-teal-500 to-teal-700 min-h-screen text-white fixed left-0 top-0 z-50 shadow-xl hidden md:flex flex-col">
      <div className="p-6 border-b border-white/10">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <LayoutDashboard className="w-8 h-8" />
          KPI System
        </h2>
        <p className="text-teal-100 text-sm mt-2">
           สวัสดี, {user?.name} <br/>
           <span className="text-xs opacity-75">({user?.role})</span>
        </p>
      </div>
      
      <div className="py-4 flex-1">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 px-6 py-3 hover:bg-white/10 transition-colors ${isActive(item.path)}`}
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </Link>
        ))}
      </div>

      <div className="p-4 border-t border-white/10 space-y-2">
        <div className="flex items-center gap-2 px-4 py-2 text-xs text-teal-100 bg-teal-800/30 rounded-lg">
            {isDev ? <WifiOff className="w-3 h-3 text-yellow-300" /> : <Wifi className="w-3 h-3 text-green-300" />}
            <span>{isDev ? 'Local / Mock Data' : 'Connected to Sheets'}</span>
        </div>

        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 px-6 py-3 w-full hover:bg-red-500/20 text-red-100 hover:text-white transition-colors rounded-lg"
        >
          <LogOut className="w-5 h-5" />
          <span>ออกจากระบบ</span>
        </button>
      </div>
    </nav>
  );
};

export default Sidebar;