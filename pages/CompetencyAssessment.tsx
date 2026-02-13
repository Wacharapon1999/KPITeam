
import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import { useAppStore } from '../services/storage';
import { UserRole, CompetencyRecord, EvaluationLevel, COMPETENCY_SCORES, COMPETENCY_LEVEL_DESC } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { User, Calendar, Save, AlertCircle, Check } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

const CompetencyAssessment = () => {
  const { employees, competencies, competencyRecords, saveCompetencyRecord } = useAppStore();
  const { user } = useAuth();
  
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [localRecords, setLocalRecords] = useState<Record<string, EvaluationLevel>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Years starting from 2026
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const startYear = 2026;
    const endYear = Math.max(currentYear + 1, 2030); // Show at least up to 2030 or current+1
    const years = [];
    for (let y = startYear; y <= endYear; y++) {
      years.push(y);
    }
    return years;
  }, []);

  // Initialize Period (Yearly) & Employee
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const defaultYear = currentYear < 2026 ? 2026 : currentYear;
    
    // Use "Annual-Year" format for once-per-year assessment
    setSelectedPeriod(`Annual-${defaultYear}`);

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
      alert("กรุณาเลือกพนักงานและรอบการประเมิน");
      return;
    }
    
    if (Object.keys(localRecords).length === 0) {
      alert("กรุณาเลือกผลการประเมินอย่างน้อย 1 หัวข้อ");
      return;
    }

    setIsSaving(true);
    try {
      const promises = competencies.map(comp => {
        const level = localRecords[comp.id];
        if (!level) return Promise.resolve(); 

        const rawScore = COMPETENCY_SCORES[level];
        const weightedScore = (rawScore * comp.weight) / 100;

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
    <Layout title="ประเมิน Competency (รายปี)">
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
               <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">ผู้รับการประเมิน</label>
               {user?.role === UserRole.MANAGER ? (
                 <select 
                   className="font-bold text-gray-800 bg-transparent border-none p-0 focus:ring-0 cursor-pointer hover:text-brand-green transition-colors text-lg"
                   value={selectedEmpId}
                   onChange={e => setSelectedEmpId(e.target.value)}
                 >
                   <option value="">-- เลือกพนักงาน --</option>
                   {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.code})</option>)}
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
               <label className="block text-[10px] font-bold text-gray-400 uppercase">รอบการประเมิน (Annual)</label>
               <select 
                 className="bg-transparent border-none p-0 text-sm font-bold text-gray-700 focus:ring-0 cursor-pointer w-36"
                 value={selectedPeriod}
                 onChange={e => setSelectedPeriod(e.target.value)}
               >
                 {availableYears.map(year => (
                    <option key={year} value={`Annual-${year}`}>ประจำปี {year}</option>
                 ))}
               </select>
             </div>
          </div>
        </div>

        {/* --- Evaluation Table --- */}
        {!selectedEmpId ? (
           <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-gray-200">
             <User className="w-16 h-16 text-gray-200 mx-auto mb-4" />
             <p className="text-gray-400 font-medium">กรุณาเลือกพนักงานเพื่อเริ่มการประเมินสมรรถนะรายปี</p>
           </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
             <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="bg-gray-50/50 text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-100">
                     <th className="p-6 w-12 text-center">#</th>
                     <th className="p-6">ทักษะ (COMPETENCY)</th>
                     <th className="p-6">ตัวชี้วัดพฤติกรรม</th>
                     <th className="p-6 text-center">WEIGHT</th>
                     <th className="p-6 text-center w-48">ระดับประเมิน</th>
                     <th className="p-6 text-center">RAW SCORE</th>
                     <th className="p-6 text-center">WEIGHTED SCORE</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50">
                   {competencies.map((comp, idx) => {
                     const currentLevel = localRecords[comp.id] || '';
                     const rawScore = currentLevel ? COMPETENCY_SCORES[currentLevel as EvaluationLevel] : 0;
                     const weighted = (rawScore * comp.weight) / 100;
                     
                     return (
                       <tr key={comp.id} className="hover:bg-gray-50/50 transition-colors">
                         <td className="p-6 text-center font-bold text-gray-300 align-top">{idx + 1}</td>
                         <td className="p-6 align-top max-w-xs">
                            <div className="font-bold text-gray-800 text-sm mb-1.5 leading-snug">{comp.topic}</div>
                            <div className="text-xs text-gray-400 leading-relaxed font-light">{comp.definition}</div>
                         </td>
                         <td className="p-6 align-top text-xs text-gray-500 leading-relaxed max-w-sm">
                            {comp.behaviorIndicator}
                         </td>
                         <td className="p-6 text-center align-top">
                            <span className="text-sm font-black text-gray-600">{comp.weight}%</span>
                         </td>
                         <td className="p-6 align-top">
                           <select 
                             className={`w-full p-2.5 rounded-xl border text-xs font-bold focus:ring-4 focus:ring-brand-green/10 outline-none transition-all appearance-none
                               ${currentLevel ? 'border-brand-green bg-green-50 text-brand-green' : 'border-gray-200 text-gray-400'}
                             `}
                             value={currentLevel}
                             onChange={(e) => handleScoreChange(comp.id, e.target.value as EvaluationLevel)}
                           >
                             <option value="">-- Select --</option>
                             <option value={EvaluationLevel.EP}>EP (Role Model - 130)</option>
                             <option value={EvaluationLevel.CP}>CP (Coach - 115)</option>
                             <option value={EvaluationLevel.GP}>GP (Standard - 100)</option>
                             <option value={EvaluationLevel.PP}>PP (Partial - 85)</option>
                             <option value={EvaluationLevel.UP}>UP (Under - 60)</option>
                             <option value={EvaluationLevel.F}>F (Fail - 0)</option>
                           </select>
                         </td>
                         <td className="p-6 text-center align-top">
                            <span className={`text-lg font-black ${rawScore > 0 ? 'text-gray-800' : 'text-gray-300'}`}>
                              {rawScore}
                            </span>
                         </td>
                         <td className="p-6 text-center align-top">
                            <span className={`inline-block px-4 py-1.5 rounded-full font-black text-sm transition-all ${currentLevel ? 'bg-gray-100 text-gray-800' : 'bg-gray-50 text-gray-300'}`}>
                              {weighted.toFixed(2)}
                            </span>
                         </td>
                       </tr>
                     );
                   })}
                 </tbody>
                 <tfoot className="bg-gray-50/30 border-t border-gray-100">
                    <tr className="text-gray-800">
                      <td colSpan={3} className="p-6 text-right font-black text-xs uppercase tracking-widest">รวม (Total)</td>
                      <td className="p-6 text-center font-black text-sm">{totalWeight}%</td>
                      <td colSpan={2}></td>
                      <td className="p-6 text-center">
                         <span className="text-2xl font-black text-brand-green">{totalScore.toFixed(2)}</span>
                      </td>
                    </tr>
                 </tfoot>
               </table>
             </div>

             {/* Footer Actions */}
             <div className="p-8 border-t border-gray-50 bg-white flex flex-col sm:flex-row justify-between items-center gap-6">
                <div className="flex items-start gap-3 text-xs text-gray-400 bg-gray-50 p-4 rounded-2xl max-w-md border border-gray-100">
                   <AlertCircle className="w-4 h-4 shrink-0 text-brand-green" />
                   <div className="leading-relaxed">
                      <p className="font-bold text-gray-500 mb-1 underline decoration-brand-green underline-offset-4">เกณฑ์การคำนวณ</p>
                      คะแนนจะคำนวณจาก (คะแนนดิบ x น้ำหนัก) / 100 <br/>
                      โดยคะแนน GP คือมาตรฐาน (100) หากประเมินสูงกว่ามาตรฐานจะได้โบนัสคะแนนตามลำดับ
                   </div>
                </div>
                <button 
                  onClick={handleSaveAll}
                  disabled={isSaving}
                  className="w-full sm:w-auto px-10 py-4 bg-brand-green text-white rounded-2xl font-bold text-lg shadow-xl shadow-brand-green/20 hover:bg-brand-green/90 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:bg-gray-300 disabled:shadow-none"
                >
                  {isSaving ? (
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <Save className="w-5 h-5" />
                  )}
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
