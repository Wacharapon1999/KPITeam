
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider, useAppStore } from './services/storage';
import { UserRole } from './types';
import { Loader2, WifiOff, Info } from 'lucide-react';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import KPIRecord from './pages/KPIRecord';
import ManageEmployees from './pages/ManageEmployees';
import ManageDepartments from './pages/ManageDepartments';
import ManageKPIs from './pages/ManageKPIs';
import ManageActivities from './pages/ManageActivities';
import ManageAssignments from './pages/ManageAssignments';

// Component to protect routes
interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: UserRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, roles }) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
};

const DevModeBanner = () => (
  <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 text-xs text-yellow-800 flex items-center justify-center gap-2">
    <WifiOff className="w-4 h-4" />
    <span className="font-medium">Dev Mode / Mock Data:</span>
    <span>ขณะนี้คุณกำลังใช้ข้อมูลจำลอง การแก้ไขจะไม่ถูกบันทึกลง Google Sheets จนกว่าจะ Deploy</span>
  </div>
);

const AppRoutes = () => {
    const { loading, isDev } = useAppStore();
    const { isAuthenticated } = useAuth();

    if (loading) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
          <Loader2 className="w-10 h-10 text-teal-600 animate-spin mb-4" />
          <p className="text-gray-500 font-kanit">Loading data...</p>
        </div>
      );
    }

    return (
      <div className="flex flex-col min-h-screen">
        {isDev && isAuthenticated && <DevModeBanner />}
        <div className="flex-1">
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/record" element={<ProtectedRoute><KPIRecord /></ProtectedRoute>} />
            
            <Route path="/employees" element={
              <ProtectedRoute roles={[UserRole.MANAGER]}><ManageEmployees /></ProtectedRoute>
            } />
            <Route path="/departments" element={
              <ProtectedRoute roles={[UserRole.MANAGER]}><ManageDepartments /></ProtectedRoute>
            } />
            <Route path="/kpis" element={
              <ProtectedRoute roles={[UserRole.MANAGER]}><ManageKPIs /></ProtectedRoute>
            } />
            <Route path="/activities" element={
              <ProtectedRoute roles={[UserRole.MANAGER]}><ManageActivities /></ProtectedRoute>
            } />
            <Route path="/assignments" element={
              <ProtectedRoute roles={[UserRole.MANAGER]}><ManageAssignments /></ProtectedRoute>
            } />
            
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </div>
    );
}

const App = () => {
  return (
    <DataProvider>
      <AuthProvider>
          <AppRoutes />
      </AuthProvider>
    </DataProvider>
  );
};

export default App;
