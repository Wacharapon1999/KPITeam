import { Department, Employee, KPI, PeriodType, Assignment, Activity, KPIRecord, EvaluationLevel, LevelRule, UserRole } from '../types';

export const initialDepartments: Department[] = [
  { id: 'd1', code: 'IT', name: 'Information Technology', manager: 'John Doe' },
  { id: 'd2', code: 'HR', name: 'Human Resources', manager: 'Jane Smith' },
];

export const initialEmployees: Employee[] = [
  { 
    id: 'e1', 
    code: '001', 
    name: 'Alice Tech', 
    departmentId: 'd1', 
    position: 'Manager', 
    email: 'alice@example.com',
    role: UserRole.MANAGER,
    password: '123' 
  },
  { 
    id: 'e2', 
    code: '002', 
    name: 'Bob Human', 
    departmentId: 'd2', 
    position: 'Recruiter', 
    email: 'bob@example.com',
    role: UserRole.EMPLOYEE,
    password: '123'
  },
];

export const initialKPIs: KPI[] = [
  { id: 'k1', code: 'KPI-01', name: 'Code Quality', activity: 'Review', weight: 50, period: PeriodType.MONTHLY, description: 'Bugs per line of code' },
  { id: 'k2', code: 'KPI-02', name: 'Recruitment', activity: 'Hiring', weight: 40, period: PeriodType.MONTHLY, description: 'Positions filled' },
];

export const initialAssignments: Assignment[] = [
  { id: 'a1', employeeId: 'e1', kpiId: 'k1', weight: 50, assignedDate: '2023-01-01' },
  { id: 'a2', employeeId: 'e2', kpiId: 'k2', weight: 40, assignedDate: '2023-01-01' },
];

export const initialActivities: Activity[] = [
  { id: 'ac1', kpiId: 'k1', code: 'ACT-01', name: 'Pull Request Review', description: 'Reviewing PRs', active: true },
  { id: 'ac2', kpiId: 'k2', code: 'ACT-02', name: 'Interviewing', description: 'Conducting interviews', active: true },
];

export const initialRecords: KPIRecord[] = [
  { id: 'r1', date: '2023-10-01', employeeId: 'e1', kpiId: 'k1', activityId: 'ac1', activityName: 'Pull Request Review', period: 'monthly', periodDetail: 'month-10-2023', level: EvaluationLevel.CP, score: 4, weight: 50, weightedScore: 2.0, note: 'Good job' },
  { id: 'r2', date: '2023-10-01', employeeId: 'e2', kpiId: 'k2', activityId: 'ac2', activityName: 'Interviewing', period: 'monthly', periodDetail: 'month-10-2023', level: EvaluationLevel.GP, score: 3, weight: 40, weightedScore: 1.2, note: 'Met target' },
];

export const initialLevelRules: LevelRule[] = [
  { id: 'lr1', level: EvaluationLevel.CP, description: 'Meets all requirements with high quality', employeeId: '', employeeName: '', kpiId: '', kpiName: '' },
];