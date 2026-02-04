export enum PeriodType {
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly'
}

export enum EvaluationLevel {
  F = 'F',
  UP = 'UP',
  PP = 'PP',
  GP = 'GP',
  CP = 'CP',
  EP = 'EP'
}

export enum UserRole {
  MANAGER = 'manager',
  EMPLOYEE = 'employee'
}

export interface Department {
  id: string;
  code: string;
  name: string;
  manager: string;
}

export interface Employee {
  id: string;
  code: string;
  name: string;
  departmentId: string;
  position: string;
  email: string;
  role: UserRole;
  password?: string; // For simple auth simulation
}

export interface KPI {
  id: string;
  code: string;
  name: string;
  activity: string;
  weight: number;
  period: PeriodType;
  description: string;
}

export interface Assignment {
  id: string;
  employeeId: string;
  kpiId: string;
  weight: number;
  assignedDate: string;
}

export interface Activity {
  id: string;
  kpiId: string;
  code: string;
  name: string;
  description: string;
  active: boolean;
}

export interface KPIRecord {
  id: string;
  date: string;
  employeeId: string;
  kpiId: string;
  activityId: string;
  activityName: string;
  period: string;
  periodDetail: string;
  level: EvaluationLevel;
  score: number;
  weight: number;
  weightedScore: number;
  note: string;
}

export interface LevelRule {
  id: string;
  level: EvaluationLevel;
  employeeId: string;
  employeeName: string;
  kpiId: string;
  kpiName: string;
  description: string;
}

export const LEVEL_SCORES: Record<EvaluationLevel, number> = {
  [EvaluationLevel.F]: 0,
  [EvaluationLevel.UP]: 1,
  [EvaluationLevel.PP]: 2,
  [EvaluationLevel.GP]: 3,
  [EvaluationLevel.CP]: 4,
  [EvaluationLevel.EP]: 5,
};

export const LEVEL_COLORS: Record<EvaluationLevel, string> = {
  [EvaluationLevel.F]: 'bg-red-500 text-white',
  [EvaluationLevel.UP]: 'bg-orange-400 text-white',
  [EvaluationLevel.PP]: 'bg-yellow-400 text-black',
  [EvaluationLevel.GP]: 'bg-lime-400 text-black',
  [EvaluationLevel.CP]: 'bg-teal-500 text-white',
  [EvaluationLevel.EP]: 'bg-purple-600 text-white',
};