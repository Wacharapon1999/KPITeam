
import React, { useState, useEffect, useMemo, useRef } from 'react';
import Layout from '../components/Layout';
import { useAppStore } from '../services/storage';
import { LEVEL_SCORES, EvaluationLevel, LEVEL_COLORS, UserRole, KPIRecord as IKPIRecord, KPI, LevelRule, Activity } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '../contexts/AuthContext';
import { Save, User, CheckCircle2, ChevronDown, ChevronRight, AlertCircle, Calendar, Check, PenLine } from 'lucide-react';

// --- Helper Data & Constants ---

const RUBRIC_TEMPLATE = {
  [EvaluationLevel.F]: { label: 'Failed', headerClass: 'bg-[#dc3545] text-white', defaultItems: ["ผลงานต่ำกว่าเกณฑ์มาก", "ผิดพลาดร้ายแรง", "ส่งงานล่าช้า"] },
  [EvaluationLevel.UP]: { label: 'Under Performance', headerClass: 'bg-[#ffc107] text-black', defaultItems: ["ต่ำกว่ามาตรฐาน", "แก้บ่อย", "ต้องดูแลใกล้ชิด"] },
  [EvaluationLevel.PP]: { label: 'Partial Performance', headerClass: 'bg-[#ffeb3b] text-black', defaultItems: ["พอใช้", "ผิดพลาดเล็กน้อย", "ทำตามคำสั่ง"] },
  [EvaluationLevel.GP]: { label: 'Good Performance', headerClass: 'bg-[#d1e7dd] text-black', defaultItems: ["ตามมาตรฐาน", "ไม่มีข้อผิดพลาด", "ตรงเวลา"] },
  [EvaluationLevel.CP]: { label: 'Consistent Performance', headerClass: 'bg-[#a3cfbb] text-black', defaultItems: ["คุณภาพสูงสม่ำเสมอ", "มีความคิดริเริ่ม", "แก้ปัญหาเองได้"] },
  [EvaluationLevel.EP]: { label: 'Exceptional Performance', headerClass: 'bg-[#198754] text-white', defaultItems: ["โดดเด่นเกินเป้า", "เป็นแบบอย่าง", "สร้างคุณค่าเพิ่ม"] }
};

const FALLBACK_KPI_RULES: Record<string, Partial<Record<EvaluationLevel, string[]>>> = {
  'KPI-01': { // Code Quality
    [EvaluationLevel.F]: ["พบคะแนน Bug Critical มากกว่า 5 จุด", "Code ไม่ผ่าน Unit Test"],
    [EvaluationLevel.UP]: ["พบ Bug Critical 3-4 จุด", "แก้ไขงานล่าช้ากว่ากำหนด"],
    [EvaluationLevel.PP]: ["พบ Bug เล็กน้อยจำนวนมาก", "Coverage ต่ำกว่า 60%"],
    [EvaluationLevel.GP]: ["ไม่มี Bug Critical หลุดไป Production", "Unit Test Coverage > 80%"],
    [EvaluationLevel.CP]: ["Code สะอาด อ่านง่าย ตามมาตรฐาน", "ส่งมอบงานก่อนกำหนด 10%"],
    [EvaluationLevel.EP]: ["Zero Bug ใน Production ต่อเนื่อง", "ช่วยปรับปรุง Architecture ของระบบให้ดีขึ้น"]
  },
  'KPI-02': { // Recruitment
    [EvaluationLevel.F]: ["หาคนไม่ได้เลยตามกำหนด", "ผู้สมัครไม่ผ่านเกณฑ์เบื้องต้น"],
    [EvaluationLevel.UP]: ["หาคนได้ต่ำกว่า 50% ของเป้าหมาย", "เอกสารสัญญาจ้างผิดพลาด"],
    [EvaluationLevel.PP]: ["หาคนได้ 70% ของเป้าหมาย", "ใช้เวลาปิดรับสมัครนานกว่า SLA"],
    [EvaluationLevel.GP]: ["หาคนได้ครบ 100% ตามเป้าหมาย", "ปิดรับสมัครภายใน SLA 45 วัน"],
    [EvaluationLevel.CP]: ["หาคนได้ครบและเริ่มงานได้ทันที", "ได้รับ Feedback ดีจาก Hiring Manager"],
    [EvaluationLevel.EP]: ["หาคนได้เกินเป้าหมาย (Talent Pool)", "ลดระยะเวลา Time-to-hire ได้ 20%"]
  }
};

const ORDERED_LEVELS = [EvaluationLevel.F, EvaluationLevel.UP, EvaluationLevel.PP, EvaluationLevel.GP, EvaluationLevel.CP, EvaluationLevel.EP];

// --- Sub-Component: KPI Row (Accordion Item) ---

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

const KPIRow: React.FC<KPIRowProps> = ({ kpi, assignmentWeight, activities, record, levelRules, isExpanded, onToggle, onSave, employeeId }) => {
  // Local state for form inputs inside this KPI card
  const [activityId, setActivityId] = useState(record?.activityId || '');
  const [level, setLevel] = useState<EvaluationLevel | ''>(record?.level || '');
  const [note, setNote] = useState(record?.note || '');
  const [isSaving, setIsSaving] = useState(false);
  
  // Sync state if record prop updates (e.g. after save or period change)
  useEffect(() => {
    setActivityId(record?.activityId || '');
    setLevel(record?.level || '');
    setNote(record?.note || '');
  }, [record]);

  // Auto-select activity if there is only one and none is currently selected
  useEffect(() => {
    if (isExpanded && !activityId && !record?.activityId && activities.length === 1) {
      setActivityId(activities[0].id);
    }
  }, [isExpanded, activities, activityId, record]);

  // Compute Rubric for this KPI
  const activeRubric = useMemo(() => {
    const rubric: Record<string, { label: string, headerClass: string, items: string[] }> = {};
    const sheetRules = levelRules.filter(r => r.kpiId === kpi.id);
    const kpiRulesFromDB = kpi.evaluationRules;
    const kpiRulesFallback = FALLBACK_KPI_RULES[kpi.code];

    ORDERED_LEVELS.forEach(lvl => {
      const template = RUBRIC_TEMPLATE[lvl];
      let items = template.defaultItems;
      const specificRule = sheetRules.find(r => r.level === lvl);
      
      if (specificRule?.description?.trim()) {
         items = specificRule.description.split('\n').map(l => l.trim()).filter(Boolean);
      } else if (kpiRulesFromDB?.[lvl]) {
        items = kpiRulesFromDB[lvl]!;
      } else if (kpiRulesFallback?.[lvl]) {
        items = kpiRulesFallback[lvl]!;
      }
      
      rubric[lvl] = { ...template, items };
    });
    return rubric;
  }, [kpi, levelRules]);

  const handleSaveClick = async () => {
    if (!activityId || !level) {
      alert("กรุณาเลือกกิจกรรมและระดับการประเมิน");
      return;
    }
    setIsSaving(true);
    const score = LEVEL_SCORES[level];
    const weightedScore = (score * assignmentWeight) / 100;
    
    // Find Activity Name
    const activityName = activities.find(a => a.id === activityId)?.name || '';

    await onSave({
      kpiId: kpi.id,
      activityId,
      activityName,
      level,
      score,
      weight: assignmentWeight,
      weightedScore,
      note
    });
    setIsSaving(false);
  };

  const handleLevelSelect = (lvl: EvaluationLevel) => {
    setLevel(lvl);
    // Removed auto-fill logic to allow manual note entry
  };

  const selectedActivity = activities.find(a => a.id === activityId);

  return (
    <div className={`bg-white rounded-xl border transition-all duration-300 overflow-hidden ${isExpanded ? 'shadow-lg ring-1 ring-brand-green border-brand-green' : 'shadow-sm border-gray-100 hover:border-brand-green/30'}`}>
      
      {/* Header Row (Always Visible) */}
      <div 
        onClick={onToggle}
        className={`p-5 flex items-center justify-between cursor-pointer transition-colors ${isExpanded ? 'bg-gray-50' : 'bg-white hover:bg-gray-50'}`}
      >
        <div className="flex items-start gap-4 flex-1">
          <div className={`mt-1 p-2 rounded-lg shrink-0 ${record ? 'bg-green-100 text-brand-green' : 'bg-gray-100 text-gray-400'}`}>
             {record ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
               <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded">Weight: {assignmentWeight}%</span>
               {record && <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded">ประเมินแล้ว</span>}
            </div>
            <h3 className={`font-bold text-lg leading-tight ${isExpanded ? 'text-brand-green' : 'text-gray-800'}`}>{kpi.name}</h3>
            {kpi.description && <p className="text-sm text-gray-500 mt-1 line-clamp-1">{kpi.description}</p>}
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
             <div className="text-sm text-gray-400 font-medium">คะแนน</div>
             <div className="text-2xl font-black text-gray-800">
               {record ? record.score.toFixed(2) : '0.00'} <span className="text-xs text-gray-400 font-normal">/ 5.0</span>
             </div>
          </div>
          {isExpanded ? <ChevronDown className="text-brand-green" /> : <ChevronRight className="text-gray-300" />}
        </div>
      </div>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="p-5 border-t border-gray-100 animate-in slide-in-from-top-2">
          
          {/* 1. Activity Selector (List View) */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              กิจกรรมย่อย (Activity)
              {activities.length > 0 && <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">เลือก 1 กิจกรรม</span>}
            </label>
            
            {activities.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activities.map(act => {
                        const isActive = activityId === act.id;
                        return (
                            <div 
                                key={act.id}
                                onClick={() => setActivityId(act.id)}
                                className={`
                                    relative p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3
                                    ${isActive 
                                        ? 'border-brand-green bg-green-50/50 shadow-sm' 
                                        : 'border-gray-100 bg-white hover:border-brand-green/30 hover:bg-gray-50'
                                    }
                                `}
                            >
                                <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${isActive ? 'border-brand-green bg-brand-green text-white' : 'border-gray-300'}`}>
                                    {isActive && <div className="w-2 h-2 bg-white rounded-full" />}
                                </div>
                                <div>
                                    <p className={`text-sm font-bold whitespace-pre-wrap ${isActive ? 'text-gray-900' : 'text-gray-700'}`}>{act.name}</p>
                                    {act.description && <p className="text-xs text-gray-500 mt-1 leading-relaxed whitespace-pre-wrap">{act.description}</p>}
                                </div>
                                
                                {isActive && (
                                    <div className="absolute top-3 right-3 text-brand-green bg-white rounded-full p-0.5">
                                        <Check className="w-3 h-3" />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="p-4 bg-gray-50 rounded-xl text-center text-sm text-gray-400 border border-dashed border-gray-200">
                    ไม่พบกิจกรรมย่อยสำหรับ KPI นี้
                </div>
            )}
          </div>

          {/* 2. Rubric Selection */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-3">เลือกระดับผลการประเมิน (Performance Level)</label>
            <div className="overflow-x-auto pb-4 custom-scrollbar">
               <div className="min-w-[900px] grid grid-cols-6 border border-gray-200 rounded-xl overflow-hidden">
                 {ORDERED_LEVELS.map((lvl) => {
                   const info = activeRubric[lvl];
                   const isSelected = level === lvl;
                   return (
                     <div 
                       key={lvl}
                       onClick={() => handleLevelSelect(lvl)}
                       className={`flex flex-col cursor-pointer transition-all border-r border-gray-100 last:border-r-0 hover:opacity-90 ${isSelected ? 'ring-2 ring-brand-green z-10 scale-[1.01] shadow-lg' : 'bg-white'}`}
                     >
                        <div className={`h-14 p-2 flex flex-col items-center justify-center text-center ${info.headerClass}`}>
                           <span className="text-xl font-black leading-none">{lvl}</span>
                           <span className="text-[9px] font-bold uppercase">{info.label}</span>
                        </div>
                        <div className={`p-3 text-xs flex-1 flex flex-col gap-1.5 ${isSelected ? 'bg-brand-green/5' : 'bg-white'}`}>
                           {info.items.map((it, idx) => (
                             <div key={idx} className="flex gap-1.5 items-start text-gray-600 leading-tight">
                               <span className="font-bold text-[10px] text-gray-400 mt-0.5">{idx+1}.</span>
                               <span>{it}</span>
                             </div>
                           ))}
                        </div>
                        {isSelected && (
                           <div className="bg-brand-green text-white text-[10px] py-1 text-center font-bold">Selected</div>
                        )}
                     </div>
                   );
                 })}
               </div>
            </div>
          </div>

          {/* 3. Note & Save */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             <div className="lg:col-span-2">
               <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                 <PenLine className="w-4 h-4 text-brand-green" />
                 บันทึกเพิ่มเติม (Note)
               </label>
               <textarea 
                 className="w-full border-gray-300 rounded-xl bg-white p-3 text-sm focus:border-brand-green focus:ring-4 focus:ring-brand-green/10 transition-all min-h-[100px] shadow-sm placeholder:text-gray-400"
                 placeholder="ระบุเหตุผล หรือ รายละเอียดประกอบการประเมิน..."
                 value={note}
                 onChange={e => setNote(e.target.value)}
               />
             </div>
             <div className="flex flex-col justify-end">
               <button 
                 onClick={handleSaveClick}
                 disabled={isSaving}
                 className="w-full py-3 bg-brand-green text-white rounded-xl font-bold text-lg shadow-lg shadow-brand-green/20 hover:bg-brand-green/90 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:bg-gray-400"
               >
                 <Save className="w-5 h-5" />
                 {isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
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
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const [selectedPeriodDetail, setSelectedPeriodDetail] = useState('');
  const [expandedKpiId, setExpandedKpiId] = useState<string | null>(null);

  // Initialize defaults
  useEffect(() => {
    if (user && user.role === UserRole.EMPLOYEE) {
       setSelectedEmpId(user.id);
    }
    
    // Default to current month/year
    const now = new Date();
    const currentMonth = `month-${now.getMonth() + 1}-${now.getFullYear()}`;
    setSelectedPeriodDetail(currentMonth);
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
    }
    return ['Q1', 'Q2', 'Q3', 'Q4'].map(q => (
      <option key={q} value={`${q.toLowerCase()}-${year}`}>{q} / {year}</option>
    ));
  };

  // Get Assigned KPIs
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

  // Get records for current period/employee
  const currentPeriodRecords = useMemo(() => {
    return records.filter(r => 
      r.employeeId === selectedEmpId && 
      r.period === selectedPeriod && 
      r.periodDetail === selectedPeriodDetail
    );
  }, [records, selectedEmpId, selectedPeriod, selectedPeriodDetail]);

  const handleSaveRecord = async (data: Partial<IKPIRecord>) => {
    if (!selectedEmpId) return;

    // Check if record exists for this KPI in this period to update instead of create new
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
      note: data.note || ''
    };

    await saveRecord(newRecord);
    // Note: No need to refresh manually, store update triggers re-render
    setExpandedKpiId(null); // Close accordion on save
  };

  return (
    <Layout title="บันทึกผล KPI">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Top Bar: Context Selector */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 justify-between items-center sticky top-20 z-30">
          <div className="flex items-center gap-4 w-full md:w-auto">
             <div className="w-12 h-12 rounded-full bg-brand-green/10 flex items-center justify-center text-brand-green border-2 border-white shadow-sm shrink-0">
               {selectedEmployee?.photoUrl ? (
                 <img src={selectedEmployee.photoUrl} className="w-full h-full rounded-full object-cover" />
               ) : (
                 <User className="w-6 h-6" />
               )}
             </div>
             <div className="flex-1">
               <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">พนักงาน</label>
               {user?.role === UserRole.MANAGER ? (
                 <select 
                   className="font-bold text-gray-800 bg-transparent border-none p-0 focus:ring-0 cursor-pointer hover:text-brand-green transition-colors"
                   value={selectedEmpId}
                   onChange={e => setSelectedEmpId(e.target.value)}
                 >
                   <option value="">-- เลือกพนักงาน --</option>
                   {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                 </select>
               ) : (
                 <div className="font-bold text-gray-800 text-lg">{selectedEmployee?.name || 'Loading...'}</div>
               )}
             </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto bg-gray-50 p-2 rounded-xl border border-gray-200">
             <Calendar className="w-5 h-5 text-gray-400 ml-2" />
             <div className="h-8 w-px bg-gray-200 mx-1"></div>
             <div>
               <label className="block text-[10px] font-bold text-gray-400 uppercase">ช่วงเวลา</label>
               <select 
                 className="bg-transparent border-none p-0 text-sm font-bold text-gray-700 focus:ring-0 cursor-pointer w-32"
                 value={selectedPeriodDetail}
                 onChange={e => setSelectedPeriodDetail(e.target.value)}
               >
                 {renderPeriodOptions()}
               </select>
             </div>
          </div>
        </div>

        {/* Info Banner */}
        {!selectedEmpId ? (
          <div className="text-center py-20 text-gray-400">กรุณาเลือกพนักงานเพื่อเริ่มประเมิน</div>
        ) : (
          <div className="space-y-4">
             <div className="flex items-center justify-between px-2">
                <h2 className="text-lg font-bold text-gray-800">รายการ KPI ที่ต้องประเมิน</h2>
                <span className="text-xs font-medium bg-brand-green/10 text-brand-green px-3 py-1 rounded-full">
                  {currentPeriodRecords.length} / {myAssignments.length} เสร็จสิ้น
                </span>
             </div>

             {myAssignments.length === 0 ? (
               <div className="bg-white p-10 rounded-2xl text-center border border-dashed border-gray-300">
                  <p className="text-gray-400">พนักงานคนนี้ยังไม่ได้รับมอบหมาย KPI</p>
               </div>
             ) : (
               <div className="flex flex-col gap-4">
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
