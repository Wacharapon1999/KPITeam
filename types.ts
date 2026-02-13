
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
  photoUrl?: string; // URL for profile picture
}

export interface KPI {
  id: string;
  code: string;
  name: string;
  activity: string;
  weight: number;
  period: PeriodType;
  description: string;
  evaluationRules?: Partial<Record<EvaluationLevel, string[]>>;
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
  userNote?: string;
  progress?: number; // 0-100
  detailProgress?: string; // Details about the progress
  managerComment?: string; // Feedback from manager
}

// --- Competency Types ---

export interface Competency {
  id: string;
  code: string; // e.g., C1, C2
  topic: string; // e.g., "จริยธรรม ซื่อสัตย์..."
  definition: string; // คำจำกัดความ
  behaviorIndicator: string; // ตัวชี้วัดพฤติกรรม
  weight: number; // e.g., 20
}

export interface CompetencyRecord {
  id: string;
  date: string;
  employeeId: string;
  competencyId: string;
  period: string; // e.g., "Q1-2024"
  level: EvaluationLevel;
  score: number; // Raw score (0, 60, 85...)
  weight: number;
  weightedScore: number; // (score * weight) / 100
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

// KPI Scores (0-5)
export const LEVEL_SCORES: Record<EvaluationLevel, number> = {
  [EvaluationLevel.F]: 0,
  [EvaluationLevel.UP]: 1,
  [EvaluationLevel.PP]: 2,
  [EvaluationLevel.GP]: 3,
  [EvaluationLevel.CP]: 4,
  [EvaluationLevel.EP]: 5,
};

// Competency Scores (0-130)
export const COMPETENCY_SCORES: Record<EvaluationLevel, number> = {
  [EvaluationLevel.F]: 0,
  [EvaluationLevel.UP]: 60,
  [EvaluationLevel.PP]: 85,
  [EvaluationLevel.GP]: 100,
  [EvaluationLevel.CP]: 115,
  [EvaluationLevel.EP]: 130,
};

export const COMPETENCY_LEVEL_DESC: Record<EvaluationLevel, string> = {
  [EvaluationLevel.F]: 'ไม่บรรลุผลสำเร็จ',
  [EvaluationLevel.UP]: 'ต่ำกว่าคาดหวัง',
  [EvaluationLevel.PP]: 'มีประสิทธิภาพบางส่วน',
  [EvaluationLevel.GP]: 'Standard (ตามเป้าหมาย)',
  [EvaluationLevel.CP]: 'Coach (สม่ำเสมอ)',
  [EvaluationLevel.EP]: 'Role Model (โดดเด่น)',
};

export const LEVEL_COLORS: Record<EvaluationLevel, string> = {
  [EvaluationLevel.F]: 'bg-brand-red text-white',
  [EvaluationLevel.UP]: 'bg-orange-500 text-white',
  [EvaluationLevel.PP]: 'bg-yellow-500 text-black',
  [EvaluationLevel.GP]: 'bg-lime-500 text-black',
  [EvaluationLevel.CP]: 'bg-brand-green/80 text-white',
  [EvaluationLevel.EP]: 'bg-brand-green text-white',
};
