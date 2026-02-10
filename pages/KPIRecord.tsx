
import React, { useState, useEffect, useMemo, useRef } from 'react';
import Layout from '../components/Layout';
import { useAppStore } from '../services/storage';
import { LEVEL_SCORES, EvaluationLevel, LEVEL_COLORS, UserRole, KPIRecord as IKPIRecord } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '../contexts/AuthContext';
import { Trash2, Edit, XCircle, Save, History, ClipboardCheck, Info, User, CheckCircle2, ChevronDown, Check } from 'lucide-react';

// Default Template Structure for Rubric (Fallback Only)
const RUBRIC_TEMPLATE = {
  [EvaluationLevel.F]: {
    label: 'Failed',
    headerClass: 'bg-[#dc3545] text-white', // Red
    defaultItems: [
      "ผลงานต่ำกว่าเกณฑ์ที่กำหนดมาก",
      "มีความผิดพลาดร้ายแรง",
      "ส่งงานล่าช้า"
    ]
  },
  [EvaluationLevel.UP]: {
    label: 'Under Performance',
    headerClass: 'bg-[#ffc107] text-black', // Amber/Yellow Dark
    defaultItems: [
      "ผลงานต่ำกว่ามาตรฐาน",
      "ต้องมีการแก้ไขงานบ่อยครั้ง",
      "ต้องได้รับการดูแลอย่างใกล้ชิด"
    ]
  },
  [EvaluationLevel.PP]: {
    label: 'Partial Performance',
    headerClass: 'bg-[#ffeb3b] text-black', // Yellow
    defaultItems: [
      "ผลงานพอใช้ได้แต่ยังไม่ครบถ้วน",
      "มีความผิดพลาดเล็กน้อย",
      "ทำงานได้ตามคำสั่ง"
    ]
  },
  [EvaluationLevel.GP]: {
    label: 'Good Performance',
    headerClass: 'bg-[#d1e7dd] text-black', // Light Green (Pastel)
    defaultItems: [
      "ผลงานเป็นไปตามมาตรฐาน",
      "ไม่มีข้อผิดพลาดสำคัญ",
      "ส่งงานตรงเวลา"
    ]
  },
  [EvaluationLevel.CP]: {
    label: 'Consistent Performance',
    headerClass: 'bg-[#a3cfbb] text-black', // Medium Green
    defaultItems: [
      "ผลงานมีคุณภาพสูงสม่ำเสมอ",
      "มีความคิดริเริ่ม",
      "แก้ปัญหาได้ด้วยตนเอง"
    ]
  },
  [EvaluationLevel.EP]: {
    label: 'Exceptional Performance',
    headerClass: 'bg-[#198754] text-white', // Dark Green
    defaultItems: [
      "ผลงานโดดเด่นเกินเป้าหมาย",
      "เป็นแบบอย่างให้ผู้อื่นได้",
      "สร้างคุณค่าเพิ่มให้กับองค์กร"
    ]
  }
};

// Fallback Rules for specific KPI Codes (Legacy / Code-based Fallback)
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

const ORDERED_LEVELS = [
  EvaluationLevel.F,
  EvaluationLevel.UP,
  EvaluationLevel.PP,
  EvaluationLevel.GP,
  EvaluationLevel.CP,
  EvaluationLevel.EP
];

const KPIRecord = () => {
  const { employees, kpis, assignments, activities, records, saveRecord, deleteRecord, levelRules } = useAppStore();
  const { user } = useAuth();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const [selectedPeriodDetail, setSelectedPeriodDetail] = useState('');
  const [selectedKpiId, setSelectedKpiId] = useState('');
  const [selectedActivityId, setSelectedActivityId] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<EvaluationLevel | ''>('');
  const [score, setScore] = useState<number>(0);
  const [note, setNote] = useState('');
  const [noteAutofilled, setNoteAutofilled] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Custom Dropdown State
  const [showActivityDropdown, setShowActivityDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user && user.role === UserRole.EMPLOYEE && !editingId) {
        setSelectedEmpId(user.id);
    }
  }, [user, editingId]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowActivityDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Find currently selected employee object for display
  const selectedEmployee = useMemo(() => employees.find(e => e.id === selectedEmpId), [employees, selectedEmpId]);
  
  // Find currently selected KPI Object
  const selectedKPI = useMemo(() => kpis.find(k => k.id === selectedKpiId), [kpis, selectedKpiId]);

  // Compute Active Rubric Data: Merge Template with KPI specific rules
  const activeRubric = useMemo(() => {
    const rubric: Record<string, { label: string, headerClass: string, items: string[] }> = {};
    
    // 1. Get Rules from LevelRules Store (Data from Sheet) for the selected KPI
    const sheetRules = levelRules.filter(r => r.kpiId === selectedKpiId);

    // 2. Rules in KPI Object (Legacy DB field)
    const kpiRulesFromDB = selectedKPI?.evaluationRules;
    
    // 3. Hardcoded Fallback Rules (Code)
    const kpiRulesFallback = selectedKPI ? FALLBACK_KPI_RULES[selectedKPI.code] : undefined;

    ORDERED_LEVELS.forEach(level => {
      const template = RUBRIC_TEMPLATE[level];
      
      // Default items from template
      let items = template.defaultItems;
      
      // Check Priority:
      // 1. LevelRules from Sheet (Most dynamic - from LevelRules sheet)
      const specificRule = sheetRules.find(r => r.level === level);
      
      if (specificRule && specificRule.description && specificRule.description.trim() !== '') {
         // Split by newline to create list items (Assuming one bullet per line)
         items = specificRule.description.split('\n').map(line => line.trim()).filter(line => line !== '');
      }
      // 2. evaluationRules from KPI object (Backward compatibility)
      else if (kpiRulesFromDB && kpiRulesFromDB[level]) {
        items = kpiRulesFromDB[level]!;
      } 
      // 3. Fallback Code (Mock data for specific codes)
      else if (kpiRulesFallback && kpiRulesFallback[level]) {
        items = kpiRulesFallback[level]!;
      }
      
      rubric[level] = {
        label: template.label,
        headerClass: template.headerClass,
        items: items
      };
    });
    
    return rubric;
  }, [selectedKPI, selectedKpiId, levelRules]);

  const assignedKPIs = assignments
    .filter(a => a.employeeId === selectedEmpId)
    .map(a => {
      const kpi = kpis.find(k => k.id === a.kpiId);
      return kpi ? { ...kpi, assignmentWeight: a.weight } : null;
    })
    .filter(Boolean);

  const currentKPIActivities = activities.filter(a => a.kpiId === selectedKpiId && a.active);
  const selectedActivity = currentKPIActivities.find(a => a.id === selectedActivityId);
  
  const currentAssignment = assignments.find(a => a.employeeId === selectedEmpId && a.kpiId === selectedKpiId);
  const weight = currentAssignment?.weight || 0;
  const weightedScore = ((score * weight) / 100).toFixed(2);

  const handleKpiChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newKpiId = e.target.value;
    setSelectedKpiId(newKpiId);
    
    // Reset state when KPI changes to ensure rubric descriptions and notes are fresh for the new KPI
    setSelectedActivityId('');
    setSelectedLevel('');
    setScore(0);
    setNote('');
    setNoteAutofilled(false);
    
    // Auto-select the first activity for this KPI to improve UX
    const relatedActivities = activities.filter(a => a.kpiId === newKpiId && a.active);
    if (relatedActivities.length > 0) {
      setSelectedActivityId(relatedActivities[0].id);
    }
  };

  const handleLevelChange = (lvl: EvaluationLevel) => {
    setSelectedLevel(lvl);
    setScore(LEVEL_SCORES[lvl]);
    
    // Auto-fill note with the computed rubric description for that level
    const rubricItems = activeRubric[lvl]?.items || [];
    // Combine items into a formatted string
    const rubricText = rubricItems.map((item, i) => `${i+1}. ${item}`).join('\n');
    
    // Only auto-fill if the note is empty or was previously auto-filled
    if (!note || noteAutofilled) {
      setNote(rubricText);
      setNoteAutofilled(true);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    if (user?.role === UserRole.EMPLOYEE) {
        setSelectedEmpId(user.id);
    } else {
        setSelectedEmpId('');
    }
    setSelectedKpiId('');
    setSelectedActivityId('');
    setSelectedLevel('');
    setScore(0);
    setNote('');
    setNoteAutofilled(false);
  };

  const handleEdit = (record: IKPIRecord) => {
    setEditingId(record.id);
    setSelectedEmpId(record.employeeId);
    setSelectedPeriod(record.period);
    setSelectedPeriodDetail(record.periodDetail);
    setSelectedKpiId(record.kpiId);
    setSelectedActivityId(record.activityId);
    setSelectedLevel(record.level);
    setScore(record.score);
    setNote(record.note);
    setNoteAutofilled(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!selectedEmpId || !selectedKpiId || !selectedActivityId || !selectedLevel) {
      alert("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    setIsSaving(true);
    const originalRecord = editingId ? records.find(r => r.id === editingId) : null;

    const newRecord: IKPIRecord = {
      id: editingId || uuidv4(),
      date: originalRecord ? originalRecord.date : new Date().toISOString(),
      employeeId: selectedEmpId,
      kpiId: selectedKpiId,
      activityId: selectedActivityId,
      activityName: currentKPIActivities.find(a => a.id === selectedActivityId)?.name || '',
      period: selectedPeriod,
      periodDetail: selectedPeriodDetail,
      level: selectedLevel,
      score,
      weight,
      weightedScore: parseFloat(weightedScore),
      note
    };

    await saveRecord(newRecord);
    setIsSaving(false);
    alert("บันทึกข้อมูลเรียบร้อย!");
    resetForm();
  };

  const handleDelete = async (recordId: string) => {
    if (window.confirm("คุณต้องการลบรายการนี้ใช่หรือไม่?")) {
      await deleteRecord(recordId);
    }
  };

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

  const visibleRecords = user?.role === UserRole.MANAGER 
    ? records 
    : records.filter(r => r.employeeId === user?.id);

  return (
    <Layout title="บันทึกผล KPI">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Large Main Form Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className={`p-6 border-b flex justify-between items-center ${editingId ? 'bg-orange-50 from-orange-50 to-white' : 'bg-gradient-to-r from-brand-green to-[#005a35] text-white'}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${editingId ? 'bg-orange-500 text-white' : 'bg-white/20 text-white'}`}>
                <ClipboardCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className={`text-xl font-bold ${editingId ? 'text-orange-800' : 'text-white'}`}>
                  {editingId ? 'แก้ไขข้อมูลบันทึกผล' : 'ฟอร์มบันทึกผลการประเมินใหม่'}
                </h3>
                <p className={`text-sm ${editingId ? 'text-orange-600' : 'text-white/80'}`}>
                  {editingId ? `กำลังแก้ไขรายการ ID: ${editingId.slice(0, 8)}` : 'กรอกรายละเอียดการดำเนินงานตามตัวชี้วัด'}
                </p>
              </div>
            </div>
            {editingId && (
              <button 
                onClick={resetForm} 
                className="flex items-center gap-2 bg-white text-brand-red border border-brand-red px-4 py-2 rounded-xl text-sm font-bold hover:bg-brand-red hover:text-white transition-all shadow-sm"
              >
                <XCircle className="w-4 h-4" /> ยกเลิกการแก้ไข
              </button>
            )}
          </div>
          
          <form onSubmit={handleSubmit} className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
              
              {/* Section 1: Target Info (Narrower) */}
              <div className="lg:col-span-3 space-y-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b pb-2">1. ข้อมูลบุคลากรและช่วงเวลา</h4>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">พนักงานที่ประเมิน</label>
                  <div className="flex gap-2 items-center">
                    {selectedEmployee && (
                       <div className="w-12 h-12 shrink-0 rounded-full border-2 border-white shadow-md overflow-hidden bg-gray-100 flex items-center justify-center">
                          {selectedEmployee.photoUrl ? (
                             <img src={selectedEmployee.photoUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                             <User className="w-6 h-6 text-gray-400" />
                          )}
                       </div>
                    )}
                    <select 
                        className="w-full border-gray-200 rounded-xl shadow-sm focus:border-brand-green focus:ring-4 focus:ring-brand-green/10 p-3 border bg-gray-50 disabled:bg-gray-100 text-gray-900 transition-all"
                        value={selectedEmpId}
                        onChange={e => setSelectedEmpId(e.target.value)}
                        required
                        disabled={user?.role === UserRole.EMPLOYEE}
                    >
                        <option value="">-- เลือกพนักงาน --</option>
                        {employees.map(e => (
                        <option key={e.id} value={e.id}>
                            {e.name} ({e.code})
                        </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">ความถี่</label>
                    <select className="w-full border-gray-200 rounded-xl shadow-sm focus:border-brand-green focus:ring-4 focus:ring-brand-green/10 p-3 border text-gray-900 bg-gray-50" value={selectedPeriod} onChange={e => setSelectedPeriod(e.target.value)}>
                      <option value="weekly">รายสัปดาห์</option>
                      <option value="monthly">รายเดือน</option>
                      <option value="quarterly">รายไตรมาส</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">ช่วงเวลา</label>
                    <select className="w-full border-gray-200 rounded-xl shadow-sm focus:border-brand-green focus:ring-4 focus:ring-brand-green/10 p-3 border text-gray-900 bg-gray-50" value={selectedPeriodDetail} onChange={e => setSelectedPeriodDetail(e.target.value)} required>
                      <option value="">-- เลือก --</option>
                      {renderPeriodOptions()}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: KPI Selection (Wider) */}
              <div className="lg:col-span-6 space-y-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b pb-2">2. เลือกหัวข้อการประเมิน</h4>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">ตัวชี้วัด (KPI)</label>
                  <select 
                    className="w-full border-gray-200 rounded-xl shadow-sm focus:border-brand-green focus:ring-4 focus:ring-brand-green/10 p-3 border disabled:bg-gray-100 text-gray-900 bg-gray-50" 
                    value={selectedKpiId} 
                    onChange={handleKpiChange}
                    required 
                    disabled={!selectedEmpId}
                  >
                    <option value="">-- เลือก KPI --</option>
                    {assignedKPIs.map((k: any) => <option key={k.id} value={k.id}>{k.code} - {k.name}</option>)}
                  </select>
                </div>

                <div className="relative" ref={dropdownRef}>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">กิจกรรมย่อย (Activity)</label>
                  
                  {/* Custom Trigger (Replaces Select) */}
                  <div 
                    onClick={() => !(!selectedKpiId) && setShowActivityDropdown(!showActivityDropdown)}
                    className={`
                      w-full border rounded-xl p-3 bg-white transition-all cursor-pointer relative min-h-[50px] flex items-center justify-between
                      ${!selectedKpiId ? 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-70' : 'hover:border-brand-green border-gray-200'}
                      ${showActivityDropdown ? 'ring-4 ring-brand-green/10 border-brand-green' : 'shadow-sm'}
                    `}
                  >
                     <div className="pr-8 w-full">
                       {selectedActivity ? (
                         <div className="animate-in fade-in">
                           <p className="text-sm font-bold text-gray-800 break-words leading-relaxed">{selectedActivity.name}</p>
                           {selectedActivity.description && <p className="text-xs text-gray-500 mt-0.5 break-words">{selectedActivity.description}</p>}
                         </div>
                       ) : (
                         <span className="text-gray-500 text-sm">-- เลือกกิจกรรม --</span>
                       )}
                     </div>
                     <ChevronDown className={`w-5 h-5 text-gray-400 absolute right-3 transition-transform ${showActivityDropdown ? 'rotate-180' : ''}`} />
                  </div>

                  {/* Custom Dropdown Menu */}
                  {showActivityDropdown && (
                    <div className="absolute top-full left-0 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden max-h-[300px] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                       {currentKPIActivities.length > 0 ? (
                         currentKPIActivities.map(activity => (
                           <div 
                             key={activity.id}
                             onClick={() => {
                               setSelectedActivityId(activity.id);
                               setShowActivityDropdown(false);
                             }}
                             className={`p-3 border-b border-gray-50 last:border-0 cursor-pointer hover:bg-green-50 transition-colors flex items-start gap-3 group
                               ${selectedActivityId === activity.id ? 'bg-green-50' : ''}
                             `}
                           >
                             <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${selectedActivityId === activity.id ? 'border-brand-green bg-brand-green text-white' : 'border-gray-300'}`}>
                                {selectedActivityId === activity.id && <Check className="w-3 h-3" />}
                             </div>
                             <div>
                               <p className={`text-sm font-bold leading-relaxed ${selectedActivityId === activity.id ? 'text-brand-green' : 'text-gray-700'}`}>
                                 {activity.name}
                               </p>
                               {activity.description && <p className="text-xs text-gray-400 mt-0.5 leading-relaxed group-hover:text-gray-500">{activity.description}</p>}
                             </div>
                           </div>
                         ))
                       ) : (
                         <div className="p-4 text-center text-sm text-gray-400">ไม่มีกิจกรรมใน KPI นี้</div>
                       )}
                    </div>
                  )}
                </div>
              </div>

              {/* Section 3: Result Summary Card (Narrower) */}
              <div className="lg:col-span-3 space-y-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b pb-2">3. สรุปคะแนน</h4>
                <div className="bg-brand-green/5 p-6 rounded-2xl border border-brand-green/10 flex flex-col justify-center h-[calc(100%-2rem)]">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-gray-600 font-medium">น้ำหนัก KPI</span>
                    <span className="text-xl font-bold text-gray-900">{weight}%</span>
                  </div>
                  <div className="pt-4 border-t border-brand-green/10">
                    <span className="text-sm text-brand-green font-bold uppercase tracking-wider block mb-1">คะแนนถ่วงน้ำหนักรวม</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-black text-brand-green">{weightedScore}</span>
                      <span className="text-gray-400 font-bold">Points</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Level Selection Rubric Table */}
            <div className="mb-8">
              <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                เลือกระดับผลการประเมิน (Performance Level)
                <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-normal">คลิกที่คอลัมน์เพื่อเลือก</span>
              </label>
              
              <div className="overflow-x-auto pb-4 custom-scrollbar">
                <div className="min-w-[1024px] grid grid-cols-6 border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white">
                  {ORDERED_LEVELS.map((level) => {
                    const info = activeRubric[level]; // Use computed rubric based on KPI
                    const isActive = selectedLevel === level;
                    
                    return (
                      <div 
                        key={level}
                        onClick={() => handleLevelChange(level)}
                        className={`
                          flex flex-col cursor-pointer transition-all duration-200 border-r border-gray-100 last:border-r-0
                          ${isActive ? 'ring-2 ring-brand-green z-10 shadow-lg scale-[1.01]' : 'hover:bg-gray-50 opacity-90 hover:opacity-100'}
                        `}
                      >
                        {/* Header */}
                        <div className={`
                           h-20 p-2 flex flex-col items-center justify-center text-center gap-1
                           ${info.headerClass}
                        `}>
                           <span className="text-2xl font-black leading-none">{level}</span>
                           <span className="text-[10px] font-bold uppercase tracking-tight leading-tight px-1">{info.label}</span>
                        </div>
                        
                        {/* Body / Criteria */}
                        <div className={`p-4 text-xs flex-1 flex flex-col gap-2 ${isActive ? 'bg-brand-green/5' : 'bg-white'}`}>
                           {info.items.map((item, idx) => (
                             <div key={idx} className="flex gap-2 items-start leading-relaxed text-gray-600">
                               <span className="font-bold shrink-0 text-gray-400">{idx + 1}.</span>
                               <span>{item}</span>
                             </div>
                           ))}
                        </div>
                        
                        {/* Selected Indicator */}
                        {isActive && (
                           <div className="bg-brand-green text-white text-[10px] py-1 text-center font-bold flex items-center justify-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Selected
                           </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Note Area */}
            <div className="mb-8">
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                 คำอธิบายเพิ่มเติม / หมายเหตุ (Notes)
                 <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">รายละเอียดจะถูกดึงมาจากเกณฑ์การประเมินอัตโนมัติ</span>
              </label>
              <textarea 
                className="w-full border-gray-200 rounded-2xl shadow-sm focus:border-brand-green focus:ring-4 focus:ring-brand-green/10 p-4 border text-gray-900 bg-gray-50 transition-all min-h-[120px]" 
                placeholder="ระบุรายละเอียดผลงานหรือสิ่งที่ทำได้ดี/ควรปรับปรุง..."
                value={note} 
                onChange={e => { setNote(e.target.value); setNoteAutofilled(false); }}
              ></textarea>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                type="submit" 
                disabled={isSaving} 
                className={`flex-1 flex items-center justify-center gap-2 text-white py-4 rounded-2xl font-bold text-lg transition-all shadow-lg active:scale-[0.98] disabled:bg-gray-400 ${editingId ? 'bg-orange-500 shadow-orange-500/30' : 'bg-brand-green shadow-brand-green/30'}`}
              >
                <Save className="w-6 h-6" />
                {isSaving ? 'กำลังบันทึก...' : (editingId ? 'บันทึกการแก้ไขข้อมูล' : 'ยืนยันการบันทึกผลการประเมิน')}
              </button>
              
              <button 
                type="button" 
                onClick={resetForm}
                className="px-8 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all"
              >
                ล้างข้อมูล
              </button>
            </div>
          </form>
        </div>

        {/* History Table Below */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
             <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-gray-400" />
                <h3 className="text-lg font-bold text-gray-800">ประวัติการบันทึก 15 รายการล่าสุด</h3>
             </div>
             <span className="text-xs text-gray-400 bg-white px-3 py-1 rounded-full border border-gray-100">เรียงตามวันที่ล่าสุด</span>
          </div>
          <div className="overflow-x-auto">
             <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-4 font-bold text-gray-500">วันที่ประเมิน</th>
                    <th className="px-6 py-4 font-bold text-gray-500">ชื่อพนักงาน</th>
                    <th className="px-6 py-4 font-bold text-gray-500">หัวข้อการประเมิน / กิจกรรม</th>
                    <th className="px-6 py-4 font-bold text-gray-500 text-center">ระดับผลงาน</th>
                    <th className="px-6 py-4 font-bold text-gray-500 text-right">คะแนนถ่วงน้ำหนัก</th>
                    <th className="px-6 py-4 font-bold text-gray-500 text-right">ดำเนินการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                   {visibleRecords.length === 0 ? (
                     <tr><td colSpan={6} className="text-center py-20 text-gray-400 font-medium">ไม่พบประวัติการบันทึกข้อมูล</td></tr>
                   ) : (
                     visibleRecords.slice().reverse().slice(0, 15).map(r => {
                       const empName = employees.find(e => e.id === r.employeeId)?.name || '-';
                       const kpiName = kpis.find(k => k.id === r.kpiId)?.name || '-';
                       
                       return (
                         <tr key={r.id} className="hover:bg-brand-green/5 transition-colors group">
                           <td className="px-6 py-4 text-gray-600 font-medium">{new Date(r.date).toLocaleDateString()}</td>
                           <td className="px-6 py-4 font-bold text-gray-800">
                              <div className="flex items-center gap-2">
                                {(() => {
                                   const emp = employees.find(e => e.id === r.employeeId);
                                   if (emp?.photoUrl) return <img src={emp.photoUrl} className="w-6 h-6 rounded-full object-cover" />;
                                   return null;
                                })()}
                                {empName}
                              </div>
                           </td>
                           <td className="px-6 py-4">
                             <div className="font-bold text-gray-700">{kpiName}</div>
                             <div className="text-xs text-gray-400">{r.activityName}</div>
                           </td>
                           <td className="px-6 py-4 text-center">
                             <span className={`px-3 py-1 rounded-full text-xs font-black shadow-sm ${LEVEL_COLORS[r.level]}`}>
                               {r.level}
                             </span>
                           </td>
                           <td className="px-6 py-4 text-right">
                             <span className="font-black text-brand-green text-lg">{r.weightedScore.toFixed(2)}</span>
                           </td>
                           <td className="px-6 py-4 text-right whitespace-nowrap">
                              <div className="flex justify-end gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEdit(r)} className="p-2 text-gray-600 hover:text-orange-500 hover:bg-orange-50 rounded-xl transition-all">
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDelete(r.id)} className="p-2 text-gray-600 hover:text-brand-red hover:bg-brand-red/5 rounded-xl transition-all">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                           </td>
                         </tr>
                       );
                     })
                   )}
                </tbody>
             </table>
          </div>
          
          <div className="p-6 bg-gray-50 border-t flex items-center gap-3">
             <Info className="w-5 h-5 text-brand-green" />
             <p className="text-xs text-gray-500 leading-relaxed">
                การแก้ไขข้อมูลจะไม่มีผลกระทบต่อคะแนนที่คำนวณไว้ก่อนหน้าในรายงาน PDF แต่จะอัปเดตค่าในหน้า Dashboard ทันทีหลังจากบันทึกเรียบร้อยแล้ว
             </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default KPIRecord;
