import React, { useState } from 'react';
import Layout from '../components/Layout';
import { GenericTable } from '../components/GenericTable';
import { useAppStore } from '../services/storage';
import { Assignment } from '../types';
import { v4 as uuidv4 } from 'uuid';

const ManageAssignments = () => {
  const { assignments, saveAssignment, deleteAssignment, employees, kpis } = useAppStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Assignment>>({});
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    // SAFE UPDATE
    const existingItem = editingId ? assignments.find(a => a.id === editingId) : null;
    const dataToSave: Assignment = {
        ...(existingItem || {}),
        ...formData,
        id: editingId || uuidv4(),
        assignedDate: formData.assignedDate || existingItem?.assignedDate || new Date().toISOString().split('T')[0],
        employeeId: formData.employeeId || existingItem?.employeeId || '',
        kpiId: formData.kpiId || existingItem?.kpiId || '',
        weight: formData.weight || existingItem?.weight || 0
    };
    
    // Duplicate Check (only for new records or if changing employee/kpi)
    if (!editingId || (existingItem && (existingItem.employeeId !== dataToSave.employeeId || existingItem.kpiId !== dataToSave.kpiId))) {
      const exists = assignments.find(a => a.employeeId === dataToSave.employeeId && a.kpiId === dataToSave.kpiId && a.id !== editingId);
      if (exists) {
        alert('พนักงานคนนี้ได้รับมอบหมาย KPI นี้แล้ว');
        setIsSaving(false);
        return;
      }
    }
    
    await saveAssignment(dataToSave);
    setIsSaving(false);
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({});
  };

  const openAdd = () => { setEditingId(null); setFormData({}); setIsModalOpen(true); };
  const openEdit = (item: Assignment) => { setEditingId(item.id); setFormData(item); setIsModalOpen(true); };
  const handleDelete = async (item: Assignment) => {
    if(confirm(`Delete assignment?`)) await deleteAssignment(item.id);
  };

  return (
    <Layout title="มอบหมาย KPI">
      <GenericTable
        title="รายการการมอบหมาย"
        data={assignments}
        columns={[
          { header: 'Employee', accessor: (i) => employees.find(e => e.id === i.employeeId)?.name || '-' },
          { header: 'KPI', accessor: (i) => kpis.find(k => k.id === i.kpiId)?.name || '-' },
          { header: 'Weight', accessor: (i) => `${i.weight}%` },
          { header: 'Date', accessor: (i) => i.assignedDate },
        ]}
        onAdd={openAdd}
        onEdit={openEdit}
        onDelete={handleDelete}
      />

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-4">{editingId ? 'แก้ไขการมอบหมาย' : 'เพิ่มการมอบหมาย'}</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <select required className="w-full border p-2 rounded" value={formData.employeeId || ''} onChange={e => setFormData({...formData, employeeId: e.target.value})}>
                <option value="">เลือกพนักงาน</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <select required className="w-full border p-2 rounded" value={formData.kpiId || ''} onChange={e => setFormData({...formData, kpiId: e.target.value})}>
                <option value="">เลือก KPI</option>
                {kpis.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
              </select>
              <input required type="number" placeholder="น้ำหนัก (%)" className="w-full border p-2 rounded" value={formData.weight || ''} onChange={e => setFormData({...formData, weight: parseInt(e.target.value) || 0})} />
              
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">ยกเลิก</button>
                <button type="submit" disabled={isSaving} className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 disabled:bg-gray-400">
                  {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};
export default ManageAssignments;