
import React, { useMemo, useState } from 'react';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import { Users, Target, BarChart3, Award, Trophy, Download, Filter } from 'lucide-react';
import { useAppStore } from '../services/storage';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { LEVEL_COLORS, EvaluationLevel, UserRole } from '../types';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
  const { employees, records, assignments, departments, kpis } = useAppStore();
  const { user } = useAuth();
  const [selectedDeptId, setSelectedDeptId] = useState<string>('all');

  // Filter data based on role AND selected department (for Managers)
  const filteredEmployees = useMemo(() => {
    if (!user) return [];
    let list = employees;
    if (user.role === UserRole.EMPLOYEE) {
        list = employees.filter(e => e.id === user.id);
    }
    if (selectedDeptId !== 'all') {
        list = list.filter(e => e.departmentId === selectedDeptId);
    }
    return list;
  }, [employees, user, selectedDeptId]);

  const filteredEmployeeIds = useMemo(() => filteredEmployees.map(e => e.id), [filteredEmployees]);

  const visibleRecords = useMemo(() => {
    return records.filter(r => filteredEmployeeIds.includes(r.employeeId));
  }, [records, filteredEmployeeIds]);

  const visibleAssignments = useMemo(() => {
    return assignments.filter(a => filteredEmployeeIds.includes(a.employeeId));
  }, [assignments, filteredEmployeeIds]);

  const stats = useMemo(() => {
    const numericAvg = visibleRecords.length 
      ? (visibleRecords.reduce((sum, r) => sum + (r.score || 0), 0) / visibleRecords.length)
      : 0;
    
    const avgScore = numericAvg.toFixed(2);
    
    const completionRate = visibleAssignments.length 
      ? Math.round((visibleRecords.length / visibleAssignments.length) * 100) 
      : 0;

    // Calculate Current Level based on Average Score
    let currentLevel = EvaluationLevel.F;
    if (numericAvg >= 4.5) currentLevel = EvaluationLevel.EP;
    else if (numericAvg >= 3.5) currentLevel = EvaluationLevel.CP;
    else if (numericAvg >= 2.5) currentLevel = EvaluationLevel.GP;
    else if (numericAvg >= 1.5) currentLevel = EvaluationLevel.PP;
    else if (numericAvg >= 0.5) currentLevel = EvaluationLevel.UP;

    const levelColorFull = LEVEL_COLORS[currentLevel] || 'bg-gray-500 text-white';
    const levelBgColor = levelColorFull.split(' ')[0];

    return { avgScore, completionRate, currentLevel, levelBgColor };
  }, [visibleRecords, visibleAssignments]);

  // Chart Data Preparation
  const chartData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.map((month, idx) => {
      const monthNum = idx + 1;
      const recsInMonth = visibleRecords.filter(r => r.periodDetail.includes(`month-${monthNum}-`) || r.date.includes(`-${monthNum.toString().padStart(2,'0')}-`));
      const avg = recsInMonth.length 
        ? recsInMonth.reduce((sum, r) => sum + r.score, 0) / recsInMonth.length 
        : 0;
      return { name: month, score: avg.toFixed(2) };
    });
  }, [visibleRecords]);

  // CSV Export Function
  const exportCSV = () => {
    if (visibleRecords.length === 0) {
      alert("No data to export");
      return;
    }
    
    const headers = ["Date", "Employee Name", "Department", "KPI Code", "KPI Name", "Activity", "Period", "Level", "Score", "Weight", "Weighted Score", "Note"];
    
    const csvRows = visibleRecords.map(r => {
      const emp = employees.find(e => e.id === r.employeeId);
      const dept = departments.find(d => d.id === emp?.departmentId);
      const kpi = kpis.find(k => k.id === r.kpiId);
      
      return [
        `"${new Date(r.date).toLocaleDateString()}"`,
        `"${emp?.name || ''}"`,
        `"${dept?.name || ''}"`,
        `"${kpi?.code || ''}"`,
        `"${kpi?.name || ''}"`,
        `"${r.activityName || ''}"`,
        `"${r.periodDetail}"`,
        `"${r.level}"`,
        r.score,
        r.weight,
        r.weightedScore,
        `"${r.note.replace(/"/g, '""')}"` // Escape quotes
      ].join(",");
    });

    const csvContent = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `kpi_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Layout title="Dashboard">
      {/* Manager Filters & Actions */}
      {user?.role === UserRole.MANAGER && (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
           <div className="flex items-center gap-3 w-full md:w-auto">
              <Filter className="w-5 h-5 text-gray-500" />
              <select 
                className="border-gray-300 rounded-lg text-sm focus:ring-teal-500 focus:border-teal-500 p-2 border bg-white text-gray-900 min-w-[200px]"
                value={selectedDeptId}
                onChange={(e) => setSelectedDeptId(e.target.value)}
              >
                <option value="all">ทุกแผนก (All Departments)</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
           </div>
           
           <button 
            onClick={exportCSV}
            className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-teal-700 transition shadow-sm w-full md:w-auto justify-center"
           >
             <Download className="w-4 h-4" /> Export CSV
           </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
        <StatCard 
            title={user?.role === UserRole.MANAGER && selectedDeptId === 'all' ? "พนักงานทั้งหมด" : "พนักงานที่แสดง"} 
            value={filteredEmployees.length} 
            icon={Users} 
            color="bg-blue-500" 
        />
        <StatCard title="KPI ที่เกี่ยวข้อง" value={visibleAssignments.length} icon={Target} color="bg-purple-500" />
        <StatCard title="คะแนนเฉลี่ย" value={stats.avgScore} icon={BarChart3} color="bg-teal-500" />
        <StatCard title="ระดับปัจจุบัน" value={stats.currentLevel} icon={Trophy} color={stats.levelBgColor} />
        <StatCard title="อัตราความสำเร็จ" value={`${stats.completionRate}%`} icon={Award} color="bg-orange-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart Section */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">แนวโน้มคะแนนเฉลี่ยรายเดือน</h3>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" stroke="#888" fontSize={12} />
                <YAxis domain={[0, 5]} stroke="#888" fontSize={12} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Legend />
                <Line type="monotone" dataKey="score" stroke="#26A69A" strokeWidth={3} activeDot={{ r: 8 }} name="คะแนนเฉลี่ย" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Summary List */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 overflow-y-auto max-h-[430px]">
          <h3 className="text-lg font-bold text-gray-800 mb-4">
              {user?.role === UserRole.MANAGER ? "อันดับพนักงานยอดเยี่ยม (Top 5)" : "สรุปผลงานของฉัน"}
          </h3>
          <div className="space-y-4">
             {filteredEmployees.map(emp => {
                const empRecs = records.filter(r => r.employeeId === emp.id);
                const totalScore = empRecs.reduce((sum, r) => sum + (r.weightedScore || 0), 0);
                const dept = departments.find(d => d.id === emp.departmentId);
                return { ...emp, totalScore, deptName: dept?.name };
             })
             .sort((a, b) => b.totalScore - a.totalScore)
             .slice(0, user?.role === UserRole.MANAGER ? 5 : 1)
             .map((emp, idx) => (
               <div key={emp.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-100 transition">
                 <div className="flex items-center justify-center w-8 h-8 rounded-full bg-teal-100 text-teal-700 font-bold text-sm">
                   {idx + 1}
                 </div>
                 <div className="flex-1">
                   <h4 className="font-medium text-gray-800">{emp.name}</h4>
                   <p className="text-xs text-gray-500">{emp.deptName || '-'}</p>
                 </div>
                 <div className="text-right">
                   <span className="block font-bold text-teal-600">{emp.totalScore.toFixed(2)}</span>
                   <span className="text-[10px] text-gray-400">Points</span>
                 </div>
               </div>
             ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
