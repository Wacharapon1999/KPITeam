
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
    password: '123',
    photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=200&auto=format&fit=crop'
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
  { 
    id: 'k1', 
    code: 'KPI-01', 
    name: 'Code Quality (Bug Rate)', 
    activity: 'Review', 
    weight: 50, 
    period: PeriodType.MONTHLY, 
    description: 'Bugs per line of code',
    evaluationRules: {
      [EvaluationLevel.F]: ["พบคะแนน Bug Critical มากกว่า 5 จุด", "Code ไม่ผ่าน Unit Test"],
      [EvaluationLevel.UP]: ["พบ Bug Critical 3-4 จุด", "แก้ไขงานล่าช้ากว่ากำหนด"],
      [EvaluationLevel.PP]: ["พบ Bug เล็กน้อยจำนวนมาก", "Coverage ต่ำกว่า 60%"],
      [EvaluationLevel.GP]: ["ไม่มี Bug Critical หลุดไป Production", "Unit Test Coverage > 80%"],
      [EvaluationLevel.CP]: ["Code สะอาด อ่านง่าย ตามมาตรฐาน", "ส่งมอบงานก่อนกำหนด 10%"],
      [EvaluationLevel.EP]: ["Zero Bug ใน Production ต่อเนื่อง", "ช่วยปรับปรุง Architecture ของระบบให้ดีขึ้น"]
    }
  },
  { 
    id: 'k2', 
    code: 'KPI-02', 
    name: 'Recruitment Success', 
    activity: 'Hiring', 
    weight: 40, 
    period: PeriodType.MONTHLY, 
    description: 'Positions filled within SLA',
    evaluationRules: {
      [EvaluationLevel.F]: ["หาคนไม่ได้เลยตามกำหนด", "ผู้สมัครไม่ผ่านเกณฑ์เบื้องต้น"],
      [EvaluationLevel.UP]: ["หาคนได้ต่ำกว่า 50% ของเป้าหมาย", "เอกสารสัญญาจ้างผิดพลาด"],
      [EvaluationLevel.PP]: ["หาคนได้ 70% ของเป้าหมาย", "ใช้เวลาปิดรับสมัครนานกว่า SLA"],
      [EvaluationLevel.GP]: ["หาคนได้ครบ 100% ตามเป้าหมาย", "ปิดรับสมัครภายใน SLA 45 วัน"],
      [EvaluationLevel.CP]: ["หาคนได้ครบและเริ่มงานได้ทันที", "ได้รับ Feedback ดีจาก Hiring Manager"],
      [EvaluationLevel.EP]: ["หาคนได้เกินเป้าหมาย (Talent Pool)", "ลดระยะเวลา Time-to-hire ได้ 20%"]
    }
  },
  {
    id: 'k3',
    code: 'KPI-03',
    name: 'Risk Management (ISO31000)',
    activity: 'Risk Assessment',
    weight: 10,
    period: PeriodType.QUARTERLY,
    description: 'Quarterly Risk Assessment',
    // evaluationRules not defined here, will be loaded from LevelRules below
  }
];

export const initialAssignments: Assignment[] = [
  { id: 'a1', employeeId: 'e1', kpiId: 'k1', weight: 50, assignedDate: '2023-01-01' },
  { id: 'a2', employeeId: 'e2', kpiId: 'k2', weight: 40, assignedDate: '2023-01-01' },
  { id: 'a3', employeeId: 'e1', kpiId: 'k3', weight: 10, assignedDate: '2023-01-01' },
];

export const initialActivities: Activity[] = [
  { id: 'ac1', kpiId: 'k1', code: 'ACT-01', name: 'Pull Request Review', description: 'Reviewing PRs', active: true },
  { id: 'ac2', kpiId: 'k2', code: 'ACT-02', name: 'Interviewing', description: 'Conducting interviews', active: true },
  { id: 'ac3', kpiId: 'k3', code: 'ACT-03', name: 'Risk Identification', description: 'Identify risks', active: true },
];

export const initialRecords: KPIRecord[] = [
  { id: 'r1', date: '2023-10-01', employeeId: 'e1', kpiId: 'k1', activityId: 'ac1', activityName: 'Pull Request Review', period: 'monthly', periodDetail: 'month-10-2023', level: EvaluationLevel.CP, score: 4, weight: 50, weightedScore: 2.0, note: 'Code สะอาด อ่านง่าย ตามมาตรฐาน\nส่งมอบงานก่อนกำหนด 10%', userNote: 'Good job' },
  { id: 'r2', date: '2023-10-01', employeeId: 'e2', kpiId: 'k2', activityId: 'ac2', activityName: 'Interviewing', period: 'monthly', periodDetail: 'month-10-2023', level: EvaluationLevel.GP, score: 3, weight: 40, weightedScore: 1.2, note: 'หาคนได้ครบ 100% ตามเป้าหมาย\nปิดรับสมัครภายใน SLA 45 วัน', userNote: 'Met target' },
];

// Sample LevelRules simulating data from "LevelRules" Sheet
export const initialLevelRules: LevelRule[] = [
  // Rules for KPI-03: Risk Management
  { id: 'lr_k3_f', kpiId: 'k3', level: EvaluationLevel.F, description: 'ไม่จัดทำการประเมินความเสี่ยงระดับหน่วยงาน\nไม่จัดทำหรือไม่ส่งแผนควบคุมความเสี่ยงภายในไตรมาส\nการประสานงานกับ Risk Owner มีปัญหา', employeeId: '', employeeName: '', kpiName: '' },
  { id: 'lr_k3_up', kpiId: 'k3', level: EvaluationLevel.UP, description: 'รวบรวมความเสี่ยงได้ต่ำกว่า 70% ของหน่วยงานที่รับผิดชอบ\nแผนควบคุมความเสี่ยงไม่ครบถ้วน หรือไม่เป็นไปตามรูปแบบที่กำหนด\nการประสานงานกับ Risk Owner มีปัญหา', employeeId: '', employeeName: '', kpiName: '' },
  { id: 'lr_k3_pp', kpiId: 'k3', level: EvaluationLevel.PP, description: 'รวบรวมความเสี่ยงได้ไม่ถึง 90%\nแผนควบคุมความเสี่ยงยังขาดความชัดเจนในบางส่วน\nการประสานงานกับ Risk Owner ไม่มีปัญหา', employeeId: '', employeeName: '', kpiName: '' },
  { id: 'lr_k3_gp', kpiId: 'k3', level: EvaluationLevel.GP, description: 'รวบรวมความเสี่ยงระดับหน่วยงานครบ 100% ภายในไตรมาส\nแผนควบคุมความเสี่ยงครบถ้วน ถูกต้องตามแบบฟอร์มที่กำหนด\nการประสานงานกับ Risk Owner ไม่มีปัญหา', employeeId: '', employeeName: '', kpiName: '' },
  { id: 'lr_k3_cp', kpiId: 'k3', level: EvaluationLevel.CP, description: 'รวบรวมความเสี่ยงครบ 100% ก่อนถึงกำหนดของแต่ละไตรมาส อย่างน้อย 2 ไตรมาส\nแผนควบคุมความเสี่ยงมีความเชื่อมโยงกับแนวโน้มความเสี่ยงของหน่วยงาน\nข้อมูลมีคุณภาพ พร้อมใช้ในการติดตามระดับองค์กร\nการประสานงานกับ Risk Owner ไม่มีปัญหา', employeeId: '', employeeName: '', kpiName: '' },
  { id: 'lr_k3_ep', kpiId: 'k3', level: EvaluationLevel.EP, description: 'รวบรวมและจัดทำความเสี่ยงครบ 100% ก่อนถึงกำหนดของแต่ละไตรมาส ทุกไตรมาส\nแผนควบคุมความเสี่ยงมีลักษณะเชิงป้องกันล่วงหน้า / เชิงปรับปรุง\nสนับสนุนข้อมูลเชิงลึกให้ผู้จัดการฝ่ายใช้ประกอบการตัดสินใจเชิงกลยุทธ์\nการประสานงานกับ Risk Owner ไม่มีปัญหา', employeeId: '', employeeName: '', kpiName: '' },
];
