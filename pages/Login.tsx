
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard } from 'lucide-react';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(username, password)) {
      navigate('/');
    } else {
      setError('รหัสพนักงาน/อีเมล หรือ รหัสผ่าน ไม่ถูกต้อง');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md border border-gray-100">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-brand-green p-3 rounded-2xl mb-4 shadow-lg shadow-brand-green/20">
            <LayoutDashboard className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">KPI Tracking System</h1>
          <p className="text-gray-500 mt-1 font-light">กรุณาเข้าสู่ระบบเพื่อใช้งาน</p>
        </div>

        {error && (
          <div className="bg-brand-red/10 text-brand-red p-3 rounded-xl text-sm mb-4 text-center border border-brand-red/20 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">รหัสพนักงาน หรือ อีเมล</label>
            <input
              type="text"
              required
              className="w-full border border-gray-300 px-4 py-3 rounded-xl focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green transition-all outline-none"
              placeholder="001 หรือ email@example.com"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">รหัสผ่าน</label>
            <input
              type="password"
              required
              className="w-full border border-gray-300 px-4 py-3 rounded-xl focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green transition-all outline-none"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="w-full bg-brand-green text-white font-semibold py-3.5 rounded-xl hover:opacity-90 transition-all shadow-lg shadow-brand-green/20 active:scale-[0.98]"
          >
            เข้าสู่ระบบ
          </button>
        </form>
        
        <div className="mt-8 text-center">
            <p className="text-xs text-gray-400">© 2024 Modern KPI Tracker System. <br/>All Rights Reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
