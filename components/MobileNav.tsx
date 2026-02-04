import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ClipboardEdit, Users, Building, ListTodo, CheckSquare, UserPlus, Menu, X, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';

const MobileNav = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

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

  const navItems = allNavItems.filter(item => user && item.roles.includes(user.role));

  return (
    <div className="md:hidden bg-teal-600 text-white p-4 sticky top-0 z-50 shadow-md">
      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-xl font-bold">KPI System</h2>
            <p className="text-xs text-teal-100">{user?.name}</p>
        </div>
        <button onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X /> : <Menu />}
        </button>
      </div>
      
      {isOpen && (
        <div className="mt-4 pb-4 border-t border-teal-500 pt-4">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 hover:bg-teal-700 rounded-lg transition-colors ${location.pathname === item.path ? 'bg-teal-800' : ''}`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          ))}
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-500/50 rounded-lg transition-colors text-red-100 mt-2"
          >
            <LogOut className="w-5 h-5" />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default MobileNav;