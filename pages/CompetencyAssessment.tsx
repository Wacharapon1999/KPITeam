
import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import { useAppStore } from '../services/storage';
import { UserRole, CompetencyRecord, EvaluationLevel, COMPETENCY_SCORES, COMPETENCY_LEVEL_DESC } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { User, Calendar, Save, Calculator, AlertCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

const CompetencyAssessment = () => {
  const { employees, competencies, competencyRecords, saveCompetencyRecord } = useAppStore();
  const { user } = useAuth();
  
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [localRecords, setLocalRecords] = useState<Record<string, EvaluationLevel>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Initialize Period & Employee
  useEffect(() => {
    const year = new Date().getFullYear();
    // Default to Q1
    setSelectedPeriod(`Q1-${year}`);

    if (user && user.role === UserRole.EMPLOYEE) {
      setSelectedEmpId(user.id);
    }
  }, [user]);

  // Load existing records into local state when employee/period changes
  useEffect(() => {
    if (selectedEmpId && selectedPeriod) {
      const existing = competencyRecords.filter(
        r => r.employeeId === selectedEmpId && r.period === selectedPeriod
      );
      const recordMap: Record<string, EvaluationLevel> = {};
      existing.forEach(r => {
        recordMap[r.competencyId] = r.level;
      });
      setLocalRecords(recordMap);
    } else {
      setLocalRecords({});
    }
  }, [selectedEmpId, selectedPeriod, competencyRecords]);

  const selectedEmployee = useMemo(() => employees.find(e => e.id === selectedEmpId), [employees, selectedEmpId]);

  const handleScoreChange = (competencyId: string, level: EvaluationLevel) => {
    setLocalRecords(prev => ({
      ...prev,
      [competencyId]: level
    }));
  };

  const calculateTotal = () => {
    let totalScore = 0;
    let totalWeight = 0;
    
    competencies.forEach(comp => {
      const level = localRecords[comp.id];
      if (level) {
        const rawScore = COMPETENCY_SCORES[level];
        const weightedScore = (rawScore * comp.weight) / 100;
        totalScore += weightedScore;
      }
      totalWeight += comp.weight;
    });

    return { totalScore, totalWeight };
  };

  const handleSaveAll = async () => {
    if (!selectedEmpId || !selectedPeriod) {
      alert("Please select employee and period");
      return;
    }
    
    if (Object.keys(localRecords).length === 0) {
      alert("Please evaluate at least one competency");
      return;
    }

    setIsSaving(true);
    try {
      const promises = competencies.map(comp => {
        const level = localRecords[comp.id];
        if (!level) return Promise.resolve(); // Skip unanswered

        const rawScore = COMPETENCY_SCORES[level];
        const weightedScore = (rawScore * comp.weight) / 100;

        // Check if exists
        const existing = competencyRecords.find(
          r => r.employeeId === selectedEmpId && r.period === selectedPeriod && r.competencyId === comp.id
        );

        const record: CompetencyRecord = {
          id: existing?.id || uuidv4(),
          date: new Date().toISOString(),
          employeeId: selectedEmpId,
          competencyId: comp.id,
          period: selectedPeriod,
          level: level,
          score: rawScore,
          weight: comp.weight,
          weightedScore: weightedScore
        };

        return saveCompetencyRecord(record);
      });

      await Promise.all(promises);
      alert("บันทึกผลการประเมิน Competency เรียบร้อยแล้ว");
    } catch (error) {
      console.error(error);
      alert("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setIsSaving(false);
    }
  };

  const { totalScore, totalWeight } = calculateTotal();

  return (
    <Layout title="แบบประเมิน Competency">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* --- Top Control Bar --- */}
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
               <label className="block text-[10px] font-bold text-gray-400 uppercase">Quarter / Year</label>
               <select 
                 className="bg-transparent border-none p-0 text-sm font-bold text-gray-700 focus:ring-0 cursor-pointer w-32"
                 value={selectedPeriod}
                 onChange={e => setSelectedPeriod(e.target.value)}
               >
                 {[2023, 2024, 2025].flatMap(year => 
                   ['Q1', 'Q2', 'Q3', 'Q4'].map(q => (
                     <option key={`${q}-${year}`} value={`${q}-${year}`}>{q} / {year}</option>
                   ))
                 )}
               </select>
             </div>
          </div>
        </div>

        {/* --- Main Content --- */}
        {!selectedEmpId ? (
           <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-200">
             <p className="text-gray-400">กรุณาเลือกพนักงานเพื่อเริ่มการประเมิน</p>
           </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
             
             {/* Header */}
             <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-brand-green to-[#005a35] text-white flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">Competency Assessment Form</h3>
                  <p className="text-green-100 text-sm">แบบประเมินสมรรถนะหลัก (Core Competency)</p>
                </div>
                <div className="text-right">
                   <div className="text-sm opacity-80">คะแนนรวม (Total Score)</div>
                   <div className="text-3xl font-black">{totalScore.toFixed(2)} <span className="text-base font-normal opacity-70">/ {COMPETENCY_SCORES[EvaluationLevel.EP]}</span></div>
                </div>
             </div>

             {/* Evaluation Table */}
             <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider border-b border-gray-200">
                     <th className="p-4 w-12 text-center">#</th>
                     <th className="p-4 w-1/4">ทักษะ (Competency)</th>
                     <th className="p-4 w-1/4">ตัวชี้วัดพฤติกรรม</th>
                     <th className="p-4 w-16 text-center">Weight</th>
                     <th className="p-4 w-40 text-center">ระดับประเมิน</th>
                     <th className="p-4 w-24 text-center">Raw Score</th>
                     <th className="p-4 w-24 text-center">Weighted Score</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100">
                   {competencies.map((comp, idx) => {
                     const currentLevel = localRecords[comp.id] || '';
                     const rawScore = currentLevel ? COMPETENCY_SCORES[currentLevel as EvaluationLevel] : 0;
                     const weighted = (rawScore * comp.weight) / 100;
                     
                     return (
                       <tr key={comp.id} className="hover:bg-green-50/30 transition-colors">
                         <td className="p-4 text-center font-bold text-gray-400">{idx + 1}</td>
                         <td className="p-4 align-top">
                            <div className="font-bold text-gray-800 mb-1">{comp.topic}</div>
                            <div className="text-xs text-gray-500 leading-relaxed">{comp.definition}</div>
                         </td>
                         <td className="p-4 align-top text-sm text-gray-600 leading-relaxed">
                            {comp.behaviorIndicator}
                         </td>
                         <td className="p-4 text-center font-bold text-gray-500">{comp.weight}%</td>
                         <td className="p-4 align-top">
                           <select 
                             className={`w-full p-2 rounded-lg border text-sm font-bold focus:ring-2 focus:ring-brand-green outline-none transition-all
                               ${currentLevel ? 'border-brand-green bg-green-50 text-brand-green' : 'border-gray-200 text-gray-500'}
                             `}
                             value={currentLevel}
                             onChange={(e) => handleScoreChange(comp.id, e.target.value as EvaluationLevel)}
                           >
                             <option value="">-- Select --</option>
                             <option value={EvaluationLevel.EP}>EP - Role Model (130)</option>
                             <option value={EvaluationLevel.CP}>CP - Coach (115)</option>
                             <option value={EvaluationLevel.GP}>GP - Standard (100)</option>
                             <option value={EvaluationLevel.PP}>PP - Partial (85)</option>
                             <option value={EvaluationLevel.UP}>UP - Under (60)</option>
                             <option value={EvaluationLevel.F}>F - Fail (0)</option>
                           </select>
                         </td>
                         <td className="p-4 text-center font-medium text-gray-500">
                            {rawScore}
                         </td>
                         <td className="p-4 text-center">
                            <span className={`px-3 py-1 rounded-full font-bold text-sm ${currentLevel ? 'bg-green-100 text-brand-green' : 'bg-gray-100 text-gray-400'}`}>
                              {weighted.toFixed(2)}
                            </span>
                         </td>
                       </tr>
                     );
                   })}
                 </tbody>
                 <tfoot className="bg-gray-50 font-bold text-gray-700">
                    <tr>
                      <td colSpan={3} className="p-4 text-right">รวม (Total)</td>
                      <td className="p-4 text-center">{totalWeight}%</td>
                      <td colSpan={2}></td>
                      <td className="p-4 text-center text-brand-green text-lg">{totalScore.toFixed(2)}</td>
                    </tr>
                 </tfoot>
               </table>
             </div>

             {/* Footer Actions */}
             <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                   <AlertCircle className="w-4 h-4" />
                   <span>คะแนนจะถูกคำนวณตามน้ำหนัก (Weight) ของแต่ละหัวข้อ</span>
                </div>
                <button 
                  onClick={handleSaveAll}
                  disabled={isSaving}
                  className="px-6 py-3 bg-brand-green text-white rounded-xl font-bold shadow-lg shadow-brand-green/20 hover:bg-brand-green/90 active:scale-95 transition-all flex items-center gap-2 disabled:bg-gray-400"
                >
                  <Save className="w-5 h-5" />
                  {isSaving ? 'กำลังบันทึก...' : 'บันทึกผลการประเมิน'}
                </button>
             </div>
          </div>
        )}

      </div>
    </Layout>
  );
};

export default CompetencyAssessment;
