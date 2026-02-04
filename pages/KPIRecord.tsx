
import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAppStore } from '../services/storage';
import { LEVEL_SCORES, EvaluationLevel, LEVEL_COLORS, UserRole, KPIRecord as IKPIRecord } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '../contexts/AuthContext';
import { Trash2, Edit, XCircle } from 'lucide-react';

const KPIRecord = () => {
  const { employees, kpis, assignments, activities, records, saveRecord, deleteRecord, levelRules } = useAppStore();
  const { user } = useAuth();
  
  // Form State
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

  // Effect to auto-select logged in user if not manager
  useEffect(() => {
    if (user && user.role === UserRole.EMPLOYEE && !editingId) {
        setSelectedEmpId(user.id);
    }
  }, [user, editingId]);

  // Derived State
  const assignedKPIs = assignments
    .filter(a => a.employeeId === selectedEmpId)
    .map(a => {
      const kpi = kpis.find(k => k.id === a.kpiId);
      return kpi ? { ...kpi, assignmentWeight: a.weight } : null;
    })
    .filter(Boolean);

  const currentKPIActivities = activities.filter(a => a.kpiId === selectedKpiId && a.active);
  
  const currentAssignment = assignments.find(a => a.employeeId === selectedEmpId && a.kpiId === selectedKpiId);
  const weight = currentAssignment?.weight || 0;
  const weightedScore = ((score * weight) / 100).toFixed(2);

  // Handlers
  const handleLevelChange = (lvl: EvaluationLevel) => {
    setSelectedLevel(lvl);
    setScore(LEVEL_SCORES[lvl]);
    
    // Logic for auto-description
    const rule = levelRules.find(r => r.level === lvl) 
      || { description: 'Default description based on level.' }; // Simplified lookup
    
    if (!note || noteAutofilled) {
      setNote(rule.description || '');
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
    // Keep Period settings as they usually don't change often
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
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!selectedEmpId || !selectedKpiId || !selectedActivityId || !selectedLevel) {
      alert("Please fill all required fields");
      return;
    }

    setIsSaving(true);
    
    // Find original record if editing to preserve original date, else new date
    const originalRecord = editingId ? records.find(r => r.id === editingId) : null;

    const newRecord: IKPIRecord = {
      id: editingId || uuidv4(),
      date: originalRecord ? originalRecord.date : new Date().toISOString(), // Preserve date on edit
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
    alert(editingId ? "แก้ไขข้อมูลเรียบร้อย!" : "บันทึกข้อมูลเรียบร้อย!");
    resetForm();
  };

  const handleDelete = async (recordId: string) => {
    if (window.confirm("คุณต้องการลบรายการนี้ใช่หรือไม่?")) {
      try {
        if (editingId === recordId) {
            resetForm();
        }
        await deleteRecord(recordId);
      } catch (error) {
        console.error("Delete failed in component:", error);
      }
    }
  };

  // Generate Period Options
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

  // Filter records for history view
  const visibleRecords = user?.role === UserRole.MANAGER 
    ? records 
    : records.filter(r => r.employeeId === user?.id);

  return (
    <Layout title="บันทึกผล KPI">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Section */}
        <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit sticky top-24">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-800">
                {editingId ? 'แก้ไขข้อมูล' : 'ฟอร์มบันทึก'}
            </h3>
            {editingId && (
                <button onClick={resetForm} className="text-sm text-red-500 flex items-center gap-1 hover:bg-red-50 px-2 py-1 rounded">
                    <XCircle className="w-4 h-4" /> ยกเลิก
                </button>
            )}
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">พนักงาน</label>
              <select 
                className="w-full border-gray-300 rounded-lg shadow-sm focus:border-teal-500 focus:ring-teal-500 p-2 border bg-white disabled:bg-gray-100 text-gray-900"
                value={selectedEmpId}
                onChange={e => setSelectedEmpId(e.target.value)}
                required
                disabled={user?.role === UserRole.EMPLOYEE}
              >
                <option value="">เลือกพนักงาน</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">ช่วงเวลา</label>
                 <select 
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:border-teal-500 focus:ring-teal-500 p-2 border text-gray-900 bg-white"
                    value={selectedPeriod}
                    onChange={e => setSelectedPeriod(e.target.value)}
                 >
                   <option value="weekly">รายสัปดาห์</option>
                   <option value="monthly">รายเดือน</option>
                   <option value="quarterly">รายไตรมาส</option>
                 </select>
              </div>
              <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">รายละเอียด</label>
                 <select 
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:border-teal-500 focus:ring-teal-500 p-2 border text-gray-900 bg-white"
                    value={selectedPeriodDetail}
                    onChange={e => setSelectedPeriodDetail(e.target.value)}
                    required
                 >
                   <option value="">เลือก</option>
                   {renderPeriodOptions()}
                 </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">KPI</label>
              <select 
                className="w-full border-gray-300 rounded-lg shadow-sm focus:border-teal-500 focus:ring-teal-500 p-2 border disabled:bg-gray-100 text-gray-900 bg-white"
                value={selectedKpiId}
                onChange={e => setSelectedKpiId(e.target.value)}
                required
                disabled={!selectedEmpId}
              >
                <option value="">เลือก KPI</option>
                {assignedKPIs.map((k: any) => <option key={k.id} value={k.id}>{k.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">กิจกรรม</label>
              <select 
                className="w-full border-gray-300 rounded-lg shadow-sm focus:border-teal-500 focus:ring-teal-500 p-2 border disabled:bg-gray-100 text-gray-900 bg-white"
                value={selectedActivityId}
                onChange={e => setSelectedActivityId(e.target.value)}
                required
                disabled={!selectedKpiId}
              >
                <option value="">เลือกกิจกรรม</option>
                {currentKPIActivities.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">ระดับ</label>
                 <select 
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:border-teal-500 focus:ring-teal-500 p-2 border text-gray-900 bg-white"
                    value={selectedLevel}
                    onChange={e => handleLevelChange(e.target.value as EvaluationLevel)}
                    required
                 >
                   <option value="">เลือก</option>
                   {Object.keys(LEVEL_SCORES).map(lvl => <option key={lvl} value={lvl}>{lvl} ({LEVEL_SCORES[lvl as EvaluationLevel]})</option>)}
                 </select>
               </div>
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">คะแนน</label>
                 <input 
                    type="number" 
                    className="w-full bg-gray-50 border-gray-300 rounded-lg p-2 border text-gray-900 bg-white"
                    value={score}
                    readOnly
                 />
               </div>
            </div>

            <div className="bg-teal-50 p-3 rounded-lg border border-teal-100">
              <div className="flex justify-between text-sm mb-1">
                <span>น้ำหนัก (%)</span>
                <span className="font-semibold text-gray-900">{weight}%</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-teal-800">
                <span>คะแนนถ่วงน้ำหนัก</span>
                <span>{weightedScore}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ</label>
              <textarea 
                className="w-full border-gray-300 rounded-lg shadow-sm focus:border-teal-500 focus:ring-teal-500 p-2 border text-gray-900 bg-white"
                rows={3}
                value={note}
                onChange={e => { setNote(e.target.value); setNoteAutofilled(false); }}
              ></textarea>
            </div>

            <button type="submit" disabled={isSaving} className={`w-full text-white py-2.5 rounded-lg font-medium transition shadow-sm disabled:bg-gray-400 ${editingId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-teal-600 hover:bg-teal-700'}`}>
              {isSaving ? 'กำลังบันทึก...' : (editingId ? 'บันทึกการแก้ไข' : 'บันทึกผลการประเมิน')}
            </button>
          </form>
        </div>

        {/* History List */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50">
             <h3 className="text-lg font-bold text-gray-800">ประวัติการบันทึก (ล่าสุด)</h3>
          </div>
          <div className="overflow-x-auto">
             <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-4 font-medium text-gray-500">วันที่</th>
                    <th className="px-6 py-4 font-medium text-gray-500">พนักงาน</th>
                    <th className="px-6 py-4 font-medium text-gray-500">KPI / Activity</th>
                    <th className="px-6 py-4 font-medium text-gray-500 text-center">ระดับ</th>
                    <th className="px-6 py-4 font-medium text-gray-500 text-right">คะแนนถ่วง</th>
                    <th className="px-6 py-4 font-medium text-gray-500 text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                   {visibleRecords.slice().reverse().slice(0, 20).map(r => {
                     const empName = employees.find(e => e.id === r.employeeId)?.name || '-';
                     const kpiName = kpis.find(k => k.id === r.kpiId)?.name || '-';
                     const isEditingThis = editingId === r.id;
                     
                     return (
                       <tr key={r.id} className={`hover:bg-gray-50 transition-colors ${isEditingThis ? 'bg-orange-50' : ''}`}>
                         <td className="px-6 py-4 text-gray-600">{new Date(r.date).toLocaleDateString()}</td>
                         <td className="px-6 py-4 font-medium text-gray-800">{empName}</td>
                         <td className="px-6 py-4 text-gray-600">
                           <div className="font-medium text-gray-700">{kpiName}</div>
                           <div className="text-xs text-gray-400">{r.activityName}</div>
                         </td>
                         <td className="px-6 py-4 text-center">
                           <span className={`px-2 py-1 rounded-full text-xs font-bold ${LEVEL_COLORS[r.level]}`}>
                             {r.level}
                           </span>
                         </td>
                         <td className="px-6 py-4 text-right font-bold text-teal-600">{r.weightedScore.toFixed(2)}</td>
                         <td className="px-6 py-4 text-right whitespace-nowrap">
                             <button 
                              type="button"
                              onClick={() => handleEdit(r)}
                              className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-full transition-colors cursor-pointer mr-1"
                              title="แก้ไข"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(r.id);
                              }}
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors cursor-pointer"
                              title="ลบรายการ"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                         </td>
                       </tr>
                     );
                   })}
                </tbody>
             </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default KPIRecord;
