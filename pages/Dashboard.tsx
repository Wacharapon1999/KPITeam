
import React, { useMemo, useState } from 'react';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import { 
  Users, Target, BarChart3, Award, Trophy, Download, 
  Filter, User, CheckCircle2, Star, Crown, ArrowUpRight, ShieldAlert,
  AlertCircle, Building, Briefcase, Mail
} from 'lucide-react';
import { useAppStore } from '../services/storage';
import { LEVEL_COLORS, EvaluationLevel, UserRole } from '../types';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
  const { employees, records, assignments, departments, kpis } = useAppStore();
  const { user } = useAuth();
  
  // ปรับให้พนักงานทั่วไปดึง ID ตัวเองมาเป็นค่าเริ่มต้นเพื่อแสดงสถานะทันที
  // ปรับปรุง: Manager ก็จะเห็นของตัวเองก่อนเช่นกัน (user?.id) แล้วค่อยกดเลือกดูคนอื่น
  const [selectedDeptId, setSelectedDeptId] = useState<string>('all');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(
    user?.id || 'all'
  );

  const handleDeptChange = (deptId: string) => {
    setSelectedDeptId(deptId);
    setSelectedEmployeeId('all');
  };

  const handleEmpChange = (empId: string) => {
    setSelectedEmployeeId(empId);
  };

  const employeeOptions = useMemo(() => {
    if (selectedDeptId === 'all') return employees;
    return employees.filter(e => e.departmentId === selectedDeptId);
  }, [employees, selectedDeptId]);

  const filteredEmployees = useMemo(() => {
    if (!user) return [];
    if (user.role === UserRole.EMPLOYEE) return employees.filter(e => e.id === user.id);
    
    let list = employees;
    if (selectedDeptId !== 'all') list = list.filter(e => e.departmentId === selectedDeptId);
    if (selectedEmployeeId !== 'all') list = list.filter(e => e.id === selectedEmployeeId);
    return list;
  }, [employees, user, selectedDeptId, selectedEmployeeId]);

  const filteredEmployeeIds = useMemo(() => filteredEmployees.map(e => e.id), [filteredEmployees]);
  const visibleRecords = useMemo(() => records.filter(r => filteredEmployeeIds.includes(r.employeeId)), [records, filteredEmployeeIds]);
  const visibleAssignments = useMemo(() => assignments.filter(a => filteredEmployeeIds.includes(a.employeeId)), [assignments, filteredEmployeeIds]);

  // Helper to get Status Info (Visual Status Badges Logic)
  const getStatusInfo = (score: number) => {
    if (score >= 4.5) return { label: 'Elite Performer', color: 'bg-indigo-600', text: 'text-indigo-600', light: 'bg-indigo-50', icon: Crown, desc: 'ผลงานยอดเยี่ยมระดับสูงสุด โดดเด่นกว่ามาตรฐานมาก' };
    if (score >= 3.5) return { label: 'High Performer', color: 'bg-brand-green', text: 'text-brand-green', light: 'bg-brand-green/10', icon: Star, desc: 'ผลงานดีเด่น มีวินัยในการทำงานและได้คะแนนสูง' };
    if (score >= 2.5) return { label: 'On Track', color: 'bg-blue-500', text: 'text-blue-500', light: 'bg-blue-50', icon: CheckCircle2, desc: 'ผลงานเป็นไปตามเป้าหมาย รักษามาตรฐานได้ดี' };
    if (score >= 1.5) return { label: 'Developing', color: 'bg-orange-500', text: 'text-orange-500', light: 'bg-orange-50', icon: ArrowUpRight, desc: 'อยู่ระหว่างพัฒนาศักยภาพ ต้องการการชี้แนะเพิ่มเติม' };
    return { label: 'Needs Support', color: 'bg-brand-red', text: 'text-brand-red', light: 'bg-brand-red/10', icon: ShieldAlert, desc: 'ควรได้รับการดูแลและร่วมกันหาแนวทางแก้ไขทันที' };
  };

  const stats = useMemo(() => {
    const numericAvg = visibleRecords.length ? (visibleRecords.reduce((sum, r) => sum + (r.score || 0), 0) / visibleRecords.length) : 0;
    const avgScore = numericAvg.toFixed(2);
    const completionRate = visibleAssignments.length ? Math.round((visibleRecords.length / visibleAssignments.length) * 100) : 0;

    let currentLevel = EvaluationLevel.F;
    if (numericAvg >= 4.5) currentLevel = EvaluationLevel.EP;
    else if (numericAvg >= 3.5) currentLevel = EvaluationLevel.CP;
    else if (numericAvg >= 2.5) currentLevel = EvaluationLevel.GP;
    else if (numericAvg >= 1.5) currentLevel = EvaluationLevel.PP;
    else if (numericAvg >= 0.5) currentLevel = EvaluationLevel.UP;

    const levelColorFull = LEVEL_COLORS[currentLevel] || 'bg-gray-500 text-white';
    const levelBgColor = levelColorFull.split(' ')[0];

    return { avgScore, numericAvg, completionRate, currentLevel, levelBgColor };
  }, [visibleRecords, visibleAssignments]);

  const kpiPerformance = useMemo(() => {
    const relevantKpiIds = Array.from(new Set(visibleAssignments.map(a => a.kpiId)));
    return relevantKpiIds.map(id => {
      const kpi = kpis.find(k => k.id === id);
      const kpiRecs = visibleRecords.filter(r => r.kpiId === id);
      const avg = kpiRecs.length ? kpiRecs.reduce((sum, r) => sum + r.score, 0) / kpiRecs.length : 0;
      return { id, name: kpi?.name || 'Unknown', code: kpi?.code || '', avgScore: avg, percentage: (avg / 5) * 100, count: kpiRecs.length };
    }).sort((a, b) => b.avgScore - a.avgScore);
  }, [kpis, visibleRecords, visibleAssignments]);

  const isIndividualView = user?.role === UserRole.EMPLOYEE || (selectedEmployeeId !== 'all');
  
  // Get current employee info for profile card
  const currentEmployee = isIndividualView ? filteredEmployees[0] : null;
  const currentDept = currentEmployee ? departments.find(d => d.id === currentEmployee.departmentId) : null;

  return (
    <Layout title={user?.role === UserRole.MANAGER ? "Manager Dashboard" : "My Performance Dashboard"}>
      {/* Filters (Show only for Managers) */}
      {user?.role === UserRole.MANAGER && (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-8 flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-6">
           <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 flex-1">
              <div className="flex items-center gap-2 text-gray-400">
                <Filter className="w-5 h-5" />
                <span className="text-xs font-bold uppercase tracking-wider">ตัวกรองพนักงาน</span>
              </div>
              <div className="relative flex-1 max-w-xs">
                <select className="w-full border-gray-200 rounded-xl text-sm p-3 pl-10 border bg-gray-50 text-gray-700 appearance-none font-medium transition-all" value={selectedDeptId} onChange={(e) => handleDeptChange(e.target.value)}>
                  <option value="all">ทุกแผนก (All Depts)</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <Users className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              <div className="relative flex-1 max-w-xs">
                <select className="w-full border-gray-200 rounded-xl text-sm p-3 pl-10 border bg-gray-50 text-gray-700 appearance-none font-medium transition-all" value={selectedEmployeeId} onChange={(e) => handleEmpChange(e.target.value)}>
                  <option value="all">พนักงานทุกคน (All Members)</option>
                  {employeeOptions.map(e => <option key={e.id} value={e.id}>{e.name} ({e.code})</option>)}
                </select>
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
           </div>
        </div>
      )}

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
        <StatCard title={user?.role === UserRole.MANAGER && selectedEmployeeId === 'all' ? "จำนวนบุคลากร" : "บุคลากร"} value={filteredEmployees.length} icon={Users} color="bg-brand-green" />
        <StatCard title="รายการ KPI" value={visibleAssignments.length} icon={Target} color="bg-brand-green" />
        <StatCard title="คะแนนเฉลี่ย" value={stats.avgScore} icon={BarChart3} color="bg-brand-green" />
        <StatCard title="ระดับปัจจุบัน" value={stats.currentLevel} icon={Trophy} color={stats.levelBgColor} />
        <StatCard title="ความครบถ้วน" value={`${stats.completionRate}%`} icon={Award} color="bg-brand-green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: KPI Performance Details */}
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 h-full">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-xl font-bold text-gray-800">
                  {isIndividualView ? `KPI ของ ${filteredEmployees[0]?.name || 'พนักงาน'}` : 'ประสิทธิภาพรายตัวชี้วัด (KPI Performance)'}
                </h3>
                <p className="text-sm text-gray-400">แสดงคะแนนเฉลี่ยแยกตามหัวข้อ KPI ที่ได้รับมอบหมาย</p>
              </div>
            </div>
            
            <div className="space-y-8">
              {kpiPerformance.length > 0 ? (
                kpiPerformance.map((item) => (
                  <div key={item.id} className="group">
                    <div className="flex justify-between items-end mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-gray-400 font-bold">{item.count} บันทึกข้อมูล</span>
                        </div>
                        <h4 className="text-base font-bold text-gray-700 group-hover:text-brand-green transition-colors">{item.name}</h4>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-black text-brand-green">{item.avgScore.toFixed(2)}</span>
                        <span className="text-xs text-gray-400 font-bold ml-1">/ 5.0</span>
                      </div>
                    </div>
                    <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden border border-gray-50 p-0.5 shadow-inner">
                      <div 
                        className={`h-full bg-brand-green rounded-full transition-all duration-1000 ease-out shadow-sm relative`}
                        style={{ width: `${Math.min(item.percentage, 100)}%` }}
                      >
                         <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent"></div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100">
                  <Target className="w-16 h-16 text-gray-200 mb-4" />
                  <p className="text-gray-400 font-medium">ไม่พบข้อมูลคะแนนสำหรับตัวกรองนี้</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Profile & Status */}
        <div className="lg:col-span-4 space-y-8">
          
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
             <div className="flex items-center justify-between mb-6 border-b pb-4">
                <h3 className="text-lg font-bold text-gray-800">ข้อมูลพนักงาน</h3>
                <div className="bg-brand-green/10 p-2 rounded-xl"><User className="w-4 h-4 text-brand-green" /></div>
             </div>
             
             <div className="space-y-6">
                {isIndividualView && currentEmployee ? (
                  <>
                    <div className="flex flex-col items-center text-center">
                      <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-lg shadow-gray-100 relative overflow-hidden">
                        {currentEmployee.photoUrl ? (
                           <img src={currentEmployee.photoUrl} alt={currentEmployee.name} className="w-full h-full object-cover" />
                        ) : (
                           <User className="w-10 h-10 text-gray-400" />
                        )}
                        <div className="absolute bottom-0 right-0 bg-brand-green border-4 border-white w-8 h-8 rounded-full flex items-center justify-center">
                           <CheckCircle2 className="w-4 h-4 text-white" />
                        </div>
                      </div>
                      <h2 className="text-xl font-bold text-gray-800">{currentEmployee.name}</h2>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs font-bold bg-gray-100 text-gray-500 px-3 py-1 rounded-full">ID: {currentEmployee.code}</span>
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-gray-50">
                        <div className="flex items-start gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                           <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                              <Building className="w-5 h-5" />
                           </div>
                           <div className="overflow-hidden">
                              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-0.5">แผนก</p>
                              <p className="text-sm font-semibold text-gray-700 truncate">{currentDept?.name || 'ไม่ระบุ'}</p>
                           </div>
                        </div>

                        <div className="flex items-start gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                           <div className="p-2 bg-purple-50 text-purple-600 rounded-lg shrink-0">
                              <Briefcase className="w-5 h-5" />
                           </div>
                           <div className="overflow-hidden">
                              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-0.5">ตำแหน่ง</p>
                              <p className="text-sm font-semibold text-gray-700 truncate">{currentEmployee.position || 'ไม่ระบุ'}</p>
                           </div>
                        </div>

                        <div className="flex items-start gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                           <div className="p-2 bg-orange-50 text-orange-600 rounded-lg shrink-0">
                              <Mail className="w-5 h-5" />
                           </div>
                           <div className="overflow-hidden">
                              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-0.5">อีเมล</p>
                              <p className="text-sm font-semibold text-gray-700 truncate">{currentEmployee.email || 'ไม่ระบุ'}</p>
                           </div>
                        </div>
                    </div>
                    
                    {/* Compact Performance Summary below profile */}
                    {(() => {
                      const status = getStatusInfo(stats.numericAvg);
                      const StatusIcon = status.icon;
                      return (
                        <div className={`mt-2 p-4 rounded-2xl ${status.light} border border-transparent`}>
                           <div className="flex items-center justify-between mb-2">
                              <span className={`text-xs font-black uppercase tracking-wider ${status.text}`}>สถานะปัจจุบัน</span>
                              <StatusIcon className={`w-4 h-4 ${status.text}`} />
                           </div>
                           <div className="flex items-end justify-between">
                              <div className={`text-sm font-bold ${status.text}`}>{status.label}</div>
                              <div className="text-2xl font-black text-gray-800 leading-none">{stats.avgScore}</div>
                           </div>
                        </div>
                      );
                    })()}
                  </>
                ) : (
                  <div className="text-center py-14 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
                    <div className="bg-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                      <User className="w-6 h-6 text-gray-300" />
                    </div>
                    <p className="text-sm text-gray-400 font-bold px-6">เลือกพนักงานเพื่อดูข้อมูลโปรไฟล์</p>
                  </div>
                )}
             </div>
          </div>

          {/* Mini List - Show only for Managers or when looking at a group */}
          {user?.role === UserRole.MANAGER && (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 mb-6">สรุปผลงานพนักงานในกลุ่ม</h3>
              <div className="space-y-3">
                {filteredEmployees.map(emp => {
                  const empRecs = records.filter(r => r.employeeId === emp.id);
                  const score = empRecs.length ? empRecs.reduce((sum, r) => sum + r.score, 0) / empRecs.length : 0;
                  const status = getStatusInfo(score);
                  const StatusIcon = status.icon;
                  return (
                    <div key={emp.id} className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 hover:bg-white border border-transparent hover:border-gray-200 transition-all cursor-default">
                      <div className="flex items-center gap-3 min-w-0">
                        {emp.photoUrl ? (
                           <img src={emp.photoUrl} alt="" className="w-8 h-8 rounded-xl object-cover" />
                        ) : (
                           <div className={`p-2 rounded-xl ${status.light} ${status.text} flex-shrink-0`}>
                             <StatusIcon className="w-4 h-4" />
                           </div>
                        )}
                        <div className="truncate">
                          <div className="text-sm font-bold text-gray-800 truncate">{emp.name}</div>
                          <div className="text-[9px] text-gray-400 font-bold uppercase">{status.label}</div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <span className="text-base font-black text-brand-green">{score.toFixed(1)}</span>
                      </div>
                    </div>
                  );
                }).sort((a,b) => b.score - a.score).slice(0, 6)}
              </div>
            </div>
          )}

        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
