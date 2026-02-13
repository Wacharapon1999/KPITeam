
import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import { useAppStore } from '../services/storage';
import { LEVEL_SCORES, EvaluationLevel, UserRole, KPIRecord as IKPIRecord, KPI, LevelRule, Activity } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '../contexts/AuthContext';
import { Save, User, CheckCircle2, ChevronDown, ChevronRight, Calendar, Check, Info, MessageSquare, BarChart, Target, Loader2 } from 'lucide-react';

// --- Helper Data & Constants ---

const RUBRIC_TEMPLATE: Record<EvaluationLevel, { label: string, headerClass: string, defaultItems: string[] }> = {
  [EvaluationLevel.F]: { label: 'FAILED', headerClass: 'bg-[#dc3545] text-white', defaultItems: ["ขาดความครบถ้วนหรือผิดพลาดมาก ส่งผลต่อการใช้งาน"] },
  [EvaluationLevel.UP]: { label: 'UNDER PERFORMANCE', headerClass: 'bg-[#ffc107] text-black', defaultItems: ["ข้อมูลรายงาน 30-50% มีข้อผิดพลาดหลายจุด ต้องแก้ไขก่อนใช้งาน"] },
  [EvaluationLevel.PP]: { label: 'PARTIAL PERFORMANCE', headerClass: 'bg-[#ffeb3b] text-black', defaultItems: ["ข้อมูลครบถ้วน 70-89% มีข้อผิดพลาดบางจุด ต้องแก้ไขก่อนใช้งาน"] },
  [EvaluationLevel.GP]: { label: 'GOOD PERFORMANCE', headerClass: 'bg-[#d1e7dd] text-black', defaultItems: ["ข้อมูลครบถ้วน ≥95% ถูกต้องมากที่สุด มีข้อผิดพลาดบางจุดที่ไม่กระทบการใช้งาน และดำเนินการเสร็จ ≤15 วัน"] },
  [EvaluationLevel.CP]: { label: 'CONSISTENT PERFORMANCE', headerClass: 'bg-[#a3cfbb] text-black', defaultItems: ["ข้อมูลครบถ้วน ≥95% ถูกต้องมากที่สุด ไม่มีข้อผิดพลาด"] },
  [EvaluationLevel.EP]: { label: 'EXCEPTIONAL PERFORMANCE', headerClass: 'bg-[#198754] text-white', defaultItems: ["ข้อมูลครบถ้วน 100% ถูกต้องทุกประเด็น ไม่มีข้อผิดพลาด รายงานพร้อมใช้ทันที และดำเนินการเสร็จ ≤8 วัน"] }
};

const ORDERED_LEVELS = [EvaluationLevel.F, EvaluationLevel.UP, EvaluationLevel.PP, EvaluationLevel.GP, EvaluationLevel.CP, EvaluationLevel.EP];

// --- Sub-Component: KPI Row (Tabular UI) ---

interface KPIRowProps {
  kpi: KPI;
  assignmentWeight: number;
  activities: Activity[];
  record: IKPIRecord | undefined;
  levelRules: LevelRule[];
  isExpanded: boolean;
  onToggle: () => void;
  onSave: (data: Partial<IKPIRecord>) => Promise<void>;
  employeeId: string;
}

const KPIRow: React.FC<KPIRowProps> = ({ kpi, assignmentWeight, activities, record, levelRules, isExpanded, onToggle, onSave }) => {
  const { user } = useAuth();
  const isManager = user?.role === UserRole.MANAGER;

  // Local state for form inputs
  const [activityId, setActivityId] = useState(record?.activityId || '');
  const [level, setLevel] = useState<EvaluationLevel | ''>(record?.level || '');
  const [userNote, setUserNote] = useState(record?.userNote || '');
  const [progress, setProgress] = useState<number>(record?.progress || 0);
  const [detailProgress, setDetailProgress] = useState(record?.detailProgress || '');
  const [managerComment, setManagerComment] = useState(record?.managerComment || '');
  const [isSaving, setIsSaving] = useState(false);
  const [prevProgress, setPrevProgress] = useState<number>(record?.progress || 0);
  
  useEffect(() => {
    setActivityId(record?.activityId || '');
    setLevel(record?.level || '');
    setUserNote(record?.userNote || '');
    setProgress(record?.progress || 0);
    setDetailProgress(record?.detailProgress || '');
    setManagerComment(record?.managerComment || '');
    setPrevProgress(record?.progress || 0);
  }, [record]);

  useEffect(() => {
    if (isExpanded && !activityId && !record?.activityId && activities.length === 1) {
      setActivityId(activities[0].id);
    }
  }, [isExpanded, activities, activityId, record]);

  const activeRubric = useMemo(() => {
    const rubric: Record<string, { label: string, headerClass: string, items: string[] }> = {};
    const sheetRules = levelRules.filter(r => r.kpiId === kpi.id);

    ORDERED_LEVELS.forEach(lvl => {
      const template = RUBRIC_TEMPLATE[lvl];
      let items = template.defaultItems;
      const specificRule = sheetRules.find(r => r.level === lvl);
      
      if (specificRule?.description?.trim()) {
         items = specificRule.description.split('\n').map(l => l.trim()).filter(Boolean);
      } else if (kpi.evaluationRules?.[lvl]) {
        items = kpi.evaluationRules[lvl]!;
      }
      rubric[lvl] = { ...template, items };
    });
    return rubric;
  }, [kpi, levelRules]);

  const handleSaveClick = async () => {
    if (!activityId) {
      alert("กรุณาเลือกกิจกรรม (Activity)");
      return;
    }
    
    // Validation: if progress changed, detailProgress is required
    if (!isManager && progress !== prevProgress && !detailProgress.trim()) {
      alert("ทุกครั้งที่เปลี่ยน % จะต้องใส่ Detail Progress");
      return;
    }

    setIsSaving(true);
    const score = level ? LEVEL_SCORES[level] : 0;
    const weightedScore = (score * assignmentWeight) / 100;
    const activityName = activities.find(a => a.id === activityId)?.name || '';

    const rubricItems = level ? (activeRubric[level]?.items || []) : [];
    const rubricNote = rubricItems.map((it, i) => `${i+1}. ${it}`).join('\n');

    await onSave({
      kpiId: kpi.id,
      activityId,
      activityName,
      level: level as EvaluationLevel,
      score,
      weight: assignmentWeight,
      weightedScore,
      note: rubricNote, 
      userNote: userNote,
      progress,
      detailProgress,
      managerComment
    });
    setIsSaving(false);
  };

  const handleLevelSelect = (lvl: EvaluationLevel) => {
    setLevel(lvl);
  };

  return (
    <div className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden ${isExpanded ? 'shadow-xl ring-2 ring-brand-green/10 border-brand-green' : 'shadow-sm border-gray-100'}`}>
      
      {/* Table Header Style Layout (Visible) */}
      <div 
        onClick={onToggle}
        className={`p-6 flex flex-col lg:flex-row items-stretch cursor-pointer gap-4 lg:gap-0 ${isExpanded ? 'bg-green-50/30' : 'bg-white hover:bg-gray-50'}`}
      >
        <div className="flex-1 lg:border-r border-gray-100 pr-6">
           <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-black uppercase text-gray-400 bg-gray-100 px-2 py-0.5 rounded tracking-widest">% Weight: {assignmentWeight}%</span>
              {record && <span className="text-[10px] font-black uppercase text-green-600 bg-green-100 px-2 py-0.5 rounded tracking-widest">Recorded</span>}
           </div>
           <h3 className="font-black text-gray-800 text-lg leading-tight mb-2">{kpi.name}</h3>
           <p className="text-xs text-gray-500 font-light line-clamp-2 leading-relaxed">{kpi.description}</p>
        </div>

        <div className="lg:w-48 lg:px-6 flex flex-col justify-center lg:border-r border-gray-100">
           <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Update Progress</div>
           <div className="flex items-center gap-2">
              <span className="text-lg font-black text-brand-green">{progress}%</span>
           </div>
        </div>

        <div className="lg:w-64 lg:px-6 flex flex-col justify-center lg:border-r border-gray-100">
           <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Performance</div>
           <div className="flex items-center gap-2">
              {level ? (
                <span className={`text-lg font-black ${level === EvaluationLevel.F ? 'text-brand-red' : 'text-brand-green'}`}>
                   {level}
                </span>
              ) : (
                <div className="text-xs font-bold text-gray-300 italic">No Assessment</div>
              )}
              <span className="text-sm font-black text-gray-700 ml-2">
                 {record ? record.score.toFixed(2) : '0.00'} / 5.0
              </span>
           </div>
        </div>

        <div className="lg:w-32 lg:pl-6 flex flex-col justify-center items-center lg:items-end">
           <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Summary Score</div>
           <div className="text-2xl font-black text-brand-green">
              {record ? record.weightedScore.toFixed(2) : '0.00'}
           </div>
           <div className="lg:hidden mt-2 text-brand-green">
              {isExpanded ? <ChevronDown /> : <ChevronRight />}
           </div>
        </div>
      </div>

      {/* Expanded Details Area */}
      {isExpanded && (
        <div className="p-8 border-t border-gray-100 bg-white space-y-10 animate-in slide-in-from-top-4 duration-300">
          
          {/* Target & Activity & Progress Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             <div className="space-y-6">
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                   <div className="flex items-center gap-2 mb-4 border-b border-gray-200 pb-2">
                      <Target className="w-4 h-4 text-brand-green" />
                      <span className="text-xs font-black uppercase text-gray-500 tracking-wider">Target & Activity</span>
                   </div>
                   
                   <div className="mb-6">
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Activity Selection</label>
                      <div className="flex flex-col gap-2">
                         {activities.map(act => (
                            <button
                               key={act.id}
                               onClick={() => setActivityId(act.id)}
                               className={`text-left p-3 rounded-xl border-2 transition-all flex items-start gap-3 ${activityId === act.id ? 'border-brand-green bg-green-50 text-brand-green' : 'border-gray-100 hover:border-brand-green/30'}`}
                            >
                               <div className={`mt-1 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${activityId === act.id ? 'border-brand-green bg-brand-green text-white' : 'border-gray-300'}`}>
                                  {activityId === act.id && <Check className="w-2.5 h-2.5" />}
                               </div>
                               <div>
                                  <div className="text-sm font-black">{act.name}</div>
                                  {act.description && <div className="text-[10px] opacity-70 mt-1">{act.description}</div>}
                               </div>
                            </button>
                         ))}
                      </div>
                   </div>

                   <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 flex items-start gap-3">
                      <Info className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
                      <div className="text-[11px] text-yellow-800 leading-relaxed font-bold">
                         <span className="text-yellow-900 block mb-1">กฎการอัปเดตความคืบหน้า</span>
                         ทุกครั้งที่เลื่อน % จะต้องใส่ detail progress เพื่อระบุรายละเอียดเนื้องานที่สำเร็จ
                      </div>
                   </div>
                </div>
             </div>

             <div className="space-y-6">
                <div className="space-y-4">
                   <div className="flex items-center gap-2 px-1">
                      <BarChart className="w-4 h-4 text-brand-green" />
                      <span className="text-sm font-black text-gray-700">Update Progress</span>
                   </div>
                   <div className="px-4">
                      <input 
                         type="range" 
                         min="0" max="100" step="5"
                         className="w-full h-3 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-brand-green border border-gray-200"
                         value={progress}
                         onChange={e => setProgress(parseInt(e.target.value))}
                      />
                      <div className="flex justify-between mt-2 px-1">
                         <span className="text-[10px] font-black text-gray-400">0%</span>
                         <span className="text-lg font-black text-brand-green">{progress}%</span>
                         <span className="text-[10px] font-black text-gray-400">100%</span>
                      </div>
                   </div>

                   <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 px-1 tracking-widest">Detail Progress (เนื้องานที่ทำได้ตาม %)</label>
                      <textarea 
                         className="w-full border-2 border-gray-100 rounded-2xl bg-gray-50 p-4 text-sm focus:border-brand-green focus:ring-0 outline-none transition-all min-h-[120px] shadow-inner font-medium placeholder:text-gray-300"
                         placeholder="เช่น: 20% รวบรวมข้อมูลเสร็จสิ้น, 100% จัดทำรายงานและส่งอนุมัติเรียบร้อย..."
                         value={detailProgress}
                         onChange={e => setDetailProgress(e.target.value)}
                      />
                   </div>
                </div>
             </div>
          </div>

          {/* Performance Level Rubric Grid */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
               <CheckCircle2 className="w-4 h-4 text-brand-green" />
               <h4 className="text-sm font-black text-gray-700">เลือกระดับผลการประเมิน (Performance Level)</h4>
            </div>
            
            <div className="overflow-x-auto pb-4 custom-scrollbar">
              <div className="min-w-[1000px] flex border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
                 {ORDERED_LEVELS.map((lvl) => {
                   const info = activeRubric[lvl];
                   const isSelected = level === lvl;
                   return (
                     <div 
                       key={lvl}
                       onClick={() => handleLevelSelect(lvl)}
                       className={`flex-1 flex flex-col border-r border-gray-100 last:border-r-0 cursor-pointer transition-all hover:opacity-95 ${isSelected ? 'ring-2 ring-brand-green z-10 scale-[1.02] shadow-xl' : 'bg-white'}`}
                     >
                        {/* Header Box */}
                        <div className={`h-20 flex flex-col items-center justify-center text-center p-2 ${info.headerClass}`}>
                           <span className="text-2xl font-black leading-none">{lvl}</span>
                           <span className="text-[10px] font-black uppercase tracking-wider mt-1">{info.label}</span>
                        </div>
                        
                        {/* Description Body */}
                        <div className={`p-5 flex-1 text-[11px] leading-relaxed font-medium text-gray-600 ${isSelected ? 'bg-green-50/30' : 'bg-white'}`}>
                           {info.items.map((it, idx) => (
                             <div key={idx} className="flex gap-2 mb-2">
                               <span className="text-gray-400 font-black">{idx + 1}.</span>
                               <span>{it}</span>
                             </div>
                           ))}
                        </div>

                        {/* Selected Footer Bar */}
                        {isSelected && (
                           <div className="bg-brand-green text-white py-1.5 text-center text-[10px] font-black uppercase tracking-widest animate-in fade-in slide-in-from-bottom-2">
                              Selected
                           </div>
                        )}
                     </div>
                   );
                 })}
              </div>
            </div>
          </div>

          {/* Manager Comment & Save Button */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 pt-6 border-t border-dashed border-gray-200">
             <div className="lg:col-span-3 space-y-4">
                <div className="flex items-center gap-2 px-1">
                   <MessageSquare className="w-4 h-4 text-brand-green" />
                   <span className="text-sm font-black text-gray-700">Manager Comment (Feedback จากหัวหน้างาน)</span>
                </div>
                <textarea 
                   readOnly={!isManager}
                   className={`w-full border-2 rounded-2xl p-4 text-sm focus:ring-0 outline-none transition-all min-h-[120px] font-medium shadow-inner ${isManager ? 'bg-white border-brand-green/20 focus:border-brand-green shadow-sm' : 'bg-gray-50 border-gray-100 text-gray-500 italic'}`}
                   placeholder={isManager ? "ใส่ความคิดเห็นของหัวหน้างานที่นี่..." : "(ยังไม่มีความเห็นจากหัวหน้างาน)"}
                   value={managerComment}
                   onChange={e => setManagerComment(e.target.value)}
                />
             </div>

             <div className="flex items-end">
                <button 
                   onClick={handleSaveClick}
                   disabled={isSaving}
                   className="w-full py-5 bg-brand-green text-white rounded-2xl font-black text-xl shadow-xl shadow-brand-green/20 hover:bg-brand-green/90 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:bg-gray-400 disabled:shadow-none"
                >
                   {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                   {isSaving ? 'Saving...' : 'บันทึกข้อมูล'}
                </button>
             </div>
          </div>

        </div>
      )}
    </div>
  );
};

// --- Main Component ---

const KPIRecord = () => {
  const { employees, kpis, assignments, activities, records, saveRecord, levelRules } = useAppStore();
  const { user } = useAuth();
  
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('quarterly');
  const [selectedPeriodDetail, setSelectedPeriodDetail] = useState('');
  const [expandedKpiId, setExpandedKpiId] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.role === UserRole.EMPLOYEE) {
       setSelectedEmpId(user.id);
    }
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    let q = 'q1';
    if (month > 3 && month <= 6) q = 'q2';
    else if (month > 6 && month <= 9) q = 'q3';
    else if (month > 9) q = 'q4';
    setSelectedPeriod('quarterly');
    setSelectedPeriodDetail(`${q}-${year}`);
  }, [user]);

  const selectedEmployee = useMemo(() => employees.find(e => e.id === selectedEmpId), [employees, selectedEmpId]);

  const renderPeriodOptions = () => {
    const year = new Date().getFullYear();
    if (selectedPeriod === 'weekly') {
      return Array.from({ length: 52 }, (_, i) => (
        <option key={i} value={`week-${i + 1}-${year}`}>Week {i + 1} / {year}</option>
      ));
    } else if (selectedPeriod === 'monthly') {
       return Array.from({ length: 12 }, (_, i) => (
        <option key={i} value={`month-${i + 1}-${year}`}>Month {i + 1} / {year}</option>
      ));
    } else if (selectedPeriod === 'quarterly') {
      return ['Q1', 'Q2', 'Q3', 'Q4'].map(q => (
        <option key={q} value={`${q.toLowerCase()}-${year}`}>{q} / {year}</option>
      ));
    }
    return null;
  };

  const myAssignments = useMemo(() => {
    if (!selectedEmpId) return [];
    return assignments
      .filter(a => a.employeeId === selectedEmpId)
      .map(a => {
        const kpi = kpis.find(k => k.id === a.kpiId);
        return kpi ? { kpi, weight: a.weight } : null;
      })
      .filter(Boolean) as { kpi: KPI, weight: number }[];
  }, [assignments, kpis, selectedEmpId]);

  const currentPeriodRecords = useMemo(() => {
    return records.filter(r => 
      r.employeeId === selectedEmpId && 
      r.period === selectedPeriod && 
      r.periodDetail === selectedPeriodDetail
    );
  }, [records, selectedEmpId, selectedPeriod, selectedPeriodDetail]);

  const handleSaveRecord = async (data: Partial<IKPIRecord>) => {
    if (!selectedEmpId) return;
    const existing = currentPeriodRecords.find(r => r.kpiId === data.kpiId);
    const newRecord: IKPIRecord = {
      id: existing?.id || uuidv4(),
      date: existing?.date || new Date().toISOString(),
      employeeId: selectedEmpId,
      period: selectedPeriod,
      periodDetail: selectedPeriodDetail,
      kpiId: data.kpiId!,
      activityId: data.activityId!,
      activityName: data.activityName || '',
      level: data.level as EvaluationLevel,
      score: data.score || 0,
      weight: data.weight || 0,
      weightedScore: data.weightedScore || 0,
      note: data.note || '',
      userNote: data.userNote || '',
      progress: data.progress || 0,
      detailProgress: data.detailProgress || '',
      managerComment: data.managerComment || ''
    };
    await saveRecord(newRecord);
    setExpandedKpiId(null); 
  };

  return (
    <Layout title="KPI Detail">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Top Control Section */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-8 justify-between items-center sticky top-20 z-30">
          <div className="flex items-center gap-5 w-full md:w-auto">
             <div className="w-14 h-14 rounded-2xl bg-brand-green/10 flex items-center justify-center text-brand-green border-2 border-white shadow-sm shrink-0">
               {selectedEmployee?.photoUrl ? (
                 <img src={selectedEmployee.photoUrl} className="w-full h-full rounded-2xl object-cover" alt={selectedEmployee.name} />
               ) : (
                 <User className="w-7 h-7" />
               )}
             </div>
             <div className="flex-1">
               <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">พนักงาน (Employee)</label>
               {user?.role === UserRole.MANAGER ? (
                 <select 
                   className="font-black text-gray-800 bg-transparent border-none p-0 focus:ring-0 cursor-pointer hover:text-brand-green transition-colors text-xl"
                   value={selectedEmpId}
                   onChange={e => setSelectedEmpId(e.target.value)}
                 >
                   <option value="">-- เลือกพนักงาน --</option>
                   {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.code})</option>)}
                 </select>
               ) : (
                 <div className="font-black text-gray-800 text-xl">{selectedEmployee?.name || 'Loading...'}</div>
               )}
             </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto bg-gray-50 p-3 rounded-2xl border border-gray-100">
             <div className="flex items-center gap-3">
               <Calendar className="w-5 h-5 text-gray-400 ml-2" />
               <select 
                 className="bg-transparent border-none p-0 text-sm font-black text-gray-700 focus:ring-0 cursor-pointer w-28"
                 value={selectedPeriod}
                 onChange={e => {
                   setSelectedPeriod(e.target.value);
                   const year = new Date().getFullYear();
                   if (e.target.value === 'quarterly') setSelectedPeriodDetail(`q1-${year}`);
                   else if (e.target.value === 'monthly') setSelectedPeriodDetail(`month-1-${year}`);
                   else if (e.target.value === 'weekly') setSelectedPeriodDetail(`week-1-${year}`);
                 }}
               >
                 <option value="quarterly">Quarterly</option>
                 <option value="monthly">Monthly</option>
                 <option value="weekly">Weekly</option>
               </select>
             </div>
             <div className="hidden sm:block h-8 w-px bg-gray-200 mx-2"></div>
             <div className="flex flex-col">
               <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">รอบระยะเวลา</label>
               <select 
                 className="bg-transparent border-none p-0 text-sm font-black text-gray-700 focus:ring-0 cursor-pointer w-32"
                 value={selectedPeriodDetail}
                 onChange={e => setSelectedPeriodDetail(e.target.value)}
               >
                 {renderPeriodOptions()}
               </select>
             </div>
          </div>
        </div>

        {/* List of KPIs */}
        {!selectedEmpId ? (
          <div className="text-center py-32 bg-white rounded-3xl border-2 border-dashed border-gray-100">
             <User className="w-16 h-16 text-gray-100 mx-auto mb-4" />
             <p className="text-gray-400 font-black uppercase tracking-widest text-xs">กรุณาเลือกพนักงานเพื่อเริ่มต้นการบันทึกข้อมูล</p>
          </div>
        ) : (
          <div className="space-y-6">
             <div className="flex items-center justify-between px-4">
                <div className="flex items-center gap-3">
                   <h2 className="text-xl font-black text-gray-800">รายการ KPI ประจำงวด</h2>
                   <div className="h-5 w-px bg-gray-300"></div>
                   <div className="text-sm font-bold text-gray-400 uppercase tracking-widest">{selectedPeriodDetail}</div>
                </div>
                <div className="flex items-center gap-2">
                   <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Progress:</span>
                   <span className="text-sm font-black bg-brand-green/10 text-brand-green px-4 py-1.5 rounded-full border border-brand-green/20">
                     {currentPeriodRecords.length} / {myAssignments.length} Completed
                   </span>
                </div>
             </div>

             {myAssignments.length === 0 ? (
               <div className="bg-white p-20 rounded-3xl text-center border-2 border-dashed border-gray-100">
                  <p className="text-gray-400 font-bold">พนักงานท่านนี้ยังไม่มีรายการ KPI ที่ได้รับมอบหมาย</p>
               </div>
             ) : (
               <div className="flex flex-col gap-6">
                  {myAssignments.map(({ kpi, weight }) => {
                    const record = currentPeriodRecords.find(r => r.kpiId === kpi.id);
                    const kpiActivities = activities.filter(a => a.kpiId === kpi.id && a.active);
                    return (
                      <KPIRow
                        key={kpi.id}
                        kpi={kpi}
                        assignmentWeight={weight}
                        activities={kpiActivities}
                        record={record}
                        levelRules={levelRules}
                        isExpanded={expandedKpiId === kpi.id}
                        onToggle={() => setExpandedKpiId(expandedKpiId === kpi.id ? null : kpi.id)}
                        onSave={handleSaveRecord}
                        employeeId={selectedEmpId}
                      />
                    );
                  })}
               </div>
             )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default KPIRecord;
