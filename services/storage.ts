
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Department, Employee, KPI, Assignment, Activity, KPIRecord, LevelRule, Competency, CompetencyRecord } from '../types';
import { GAS, API_URL } from './api';
import { initialDepartments, initialEmployees, initialKPIs, initialAssignments, initialActivities, initialRecords, initialLevelRules, initialCompetencies, initialCompetencyRecords } from './mockData';

interface AppState {
  departments: Department[];
  employees: Employee[];
  kpis: KPI[];
  assignments: Assignment[];
  activities: Activity[];
  records: KPIRecord[];
  levelRules: LevelRule[];
  competencies: Competency[];
  competencyRecords: CompetencyRecord[];

  loading: boolean;
  isDev: boolean; // Exposed to show status in UI
  
  // Actions
  refreshData: () => Promise<void>;
  saveDepartment: (data: Department) => Promise<void>;
  deleteDepartment: (id: string) => Promise<void>;
  saveEmployee: (data: Employee) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;
  saveKPI: (data: KPI) => Promise<void>;
  deleteKPI: (id: string) => Promise<void>;
  saveActivity: (data: Activity) => Promise<void>;
  deleteActivity: (id: string) => Promise<void>;
  saveAssignment: (data: Assignment) => Promise<void>;
  deleteAssignment: (id: string) => Promise<void>;
  saveRecord: (data: KPIRecord) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
  saveCompetencyRecord: (data: CompetencyRecord) => Promise<void>;
}

const AppContext = createContext<AppState | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [kpis, setKPIs] = useState<KPI[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [records, setRecords] = useState<KPIRecord[]>([]);
  const [levelRules, setLevelRules] = useState<LevelRule[]>([]);
  
  // Competency State
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [competencyRecords, setCompetencyRecords] = useState<CompetencyRecord[]>([]);

  const [loading, setLoading] = useState(true);

  // Check if we are in Google Apps Script environment OR have a valid API URL
  // If we have an API_URL, we are NOT in Dev mode (we are connected)
  const isGAS = !!(window as any).google?.script;
  const isConnected = isGAS || !!API_URL;
  const isDev = !isConnected;

  const refreshData = async () => {
    setLoading(true);
    try {
      // If we are connected (either embedded GAS or via API URL), try to fetch
      if (isConnected) {
        try {
            const data = await GAS.run('getAllData');
            if (data) {
              // Helper to normalize ID to string
              const normalize = (arr: any[]) => (arr || []).map(item => ({ ...item, id: String(item.id) }));

              setDepartments(normalize(data.departments));
              
              // Critical: Normalize Employee Data (Role case sensitivity & Fallback)
              const cleanEmployees = (data.employees || []).map((e: any) => {
                // 1. Handle Role: Normalize and Fallback
                let role = (e.role || '').toString().trim().toLowerCase();
                if (role !== 'manager' && role !== 'employee') {
                   role = 'employee';
                }

                return {
                  ...e,
                  id: String(e.id), // Ensure ID is string
                  role: role,
                  // 2. Handle Email: Lowercase
                  email: (e.email || '').toString().trim().toLowerCase(),
                  // 3. Handle Code/ID: Ensure String (fix for numeric IDs in Sheet)
                  code: (e.code || '').toString().trim(),
                  // 4. Handle Password: Ensure String (fix for numeric passwords '1234' in Sheet)
                  password: (e.password || '').toString().trim(),
                  // 5. Handle Photo URL
                  photoUrl: (e.photoUrl || '').toString().trim()
                };
              });
              setEmployees(cleanEmployees);

              setKPIs(normalize(data.kpis));
              setAssignments(normalize(data.assignments));
              setActivities(normalize(data.activities));
              
              // Normalize Records ensuring userNote exists
              const cleanRecords = normalize(data.records).map((r: any) => ({
                ...r,
                userNote: r.userNote || ''
              }));
              setRecords(cleanRecords);
              
              setLevelRules(data.levelRules || initialLevelRules);

              // Competency Data
              setCompetencies(data.competencies && data.competencies.length > 0 ? normalize(data.competencies) : initialCompetencies);
              setCompetencyRecords(normalize(data.competencyRecords));
            }
        } catch (e) {
            console.error("API Fetch failed, falling back to mock for safety", e);
            if (isDev) { 
                setDepartments(initialDepartments);
                setEmployees(initialEmployees);
                setKPIs(initialKPIs);
                setAssignments(initialAssignments);
                setActivities(initialActivities);
                setRecords(initialRecords);
                setLevelRules(initialLevelRules);
                setCompetencies(initialCompetencies);
                setCompetencyRecords(initialCompetencyRecords);
            }
        }
      } else {
        // Load Mock data in pure dev mode
        await new Promise(r => setTimeout(r, 600));
        setDepartments(initialDepartments);
        setEmployees(initialEmployees);
        setKPIs(initialKPIs);
        setAssignments(initialAssignments);
        setActivities(initialActivities);
        setRecords(initialRecords);
        setLevelRules(initialLevelRules);
        setCompetencies(initialCompetencies);
        setCompetencyRecords(initialCompetencyRecords);
      }
    } catch (error) {
      console.error("Failed to fetch data", error);
      alert("Failed to load data from Google Sheets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Generic helper to update local state immediately (Optimistic UI) then save to server
  const createSaver = <T extends { id: string }>(
    setter: React.Dispatch<React.SetStateAction<T[]>>,
    gasFuncName: string
  ) => async (item: T) => {
    // Optimistic Update
    setter(prev => {
      const idx = prev.findIndex(i => String(i.id) === String(item.id));
      if (idx >= 0) {
        const newArr = [...prev];
        newArr[idx] = item;
        return newArr;
      }
      return [...prev, item];
    });

    if (isConnected) {
      try {
        await GAS.run(gasFuncName, item);
      } catch (e) {
        console.error(`Error saving to ${gasFuncName}`, e);
        alert("Save failed. Please refresh.");
        refreshData(); // Revert on failure
      }
    }
  };

  const createDeleter = <T extends { id: string }>(
    setter: React.Dispatch<React.SetStateAction<T[]>>,
    gasFuncName: string
  ) => async (id: string) => {
    // Optimistic Update with strict String normalization
    setter(prev => prev.filter(i => String(i.id) !== String(id)));
    
    if (isConnected) {
      try {
        await GAS.run(gasFuncName, id);
      } catch (e) {
         console.error(`Error deleting via ${gasFuncName}`, e);
         alert(`ไม่สามารถลบข้อมูลได้ (Backend Error)\n\nสาเหตุที่เป็นไปได้:\n1. ยังไม่ได้สร้างฟังก์ชัน ${gasFuncName} ใน code.gs\n2. เกิดข้อผิดพลาดที่ Google Sheets\n\nระบบจะโหลดข้อมูลเดิมกลับมา`);
         refreshData(); // Revert to ensure consistency
      }
    }
  };

  const value: AppState = {
    departments, employees, kpis, assignments, activities, records, levelRules, competencies, competencyRecords, loading, isDev,
    refreshData,
    saveDepartment: createSaver(setDepartments, 'saveDepartment'),
    deleteDepartment: createDeleter(setDepartments, 'deleteDepartment'),
    saveEmployee: createSaver(setEmployees, 'saveEmployee'),
    deleteEmployee: createDeleter(setEmployees, 'deleteEmployee'),
    saveKPI: createSaver(setKPIs, 'saveKPI'),
    deleteKPI: createDeleter(setKPIs, 'deleteKPI'),
    saveActivity: createSaver(setActivities, 'saveActivity'),
    deleteActivity: createDeleter(setActivities, 'deleteActivity'),
    saveAssignment: createSaver(setAssignments, 'saveAssignment'),
    deleteAssignment: createDeleter(setAssignments, 'deleteAssignment'),
    saveRecord: createSaver(setRecords, 'saveRecord'),
    deleteRecord: createDeleter(setRecords, 'deleteRecord'),
    saveCompetencyRecord: createSaver(setCompetencyRecords, 'saveCompetencyRecord'),
  };

  return React.createElement(AppContext.Provider, { value }, children);
};

export const useAppStore = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppStore must be used within DataProvider');
  }
  return context;
};
