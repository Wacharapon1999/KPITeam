import React, { useState } from 'react';
import Layout from '../components/Layout';
import { GenericTable } from '../components/GenericTable';
import { useAppStore } from '../services/storage';
import { Employee, UserRole } from '../types';
import { v4 as uuidv4 } from 'uuid';

const ManageEmployees = () => {
  const { employees, saveEmployee, deleteEmployee, departments } = useAppStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Employee>>({});
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // SAFE UPDATE LOGIC: Find existing item to preserve data not in form
      const existingItem = editingId ? employees.find(e => e.id === editingId) : null;
      
      const data: Employee = {
        ...(existingItem || {}), // Merge existing fields (like created_at, etc.)
        ...formData,             // Overwrite with form changes
        id: editingId || uuidv4(),
        role: (formData.role || existingItem?.role || UserRole.EMPLOYEE) as UserRole,
        password: formData.password || existingItem?.password || '123',
        // Ensure required fields are present
        code: formData.code || existingItem?.code || '',
        name: formData.name || existingItem?.name || '',
        departmentId: formData.departmentId || existingItem?.departmentId || '',
        position: formData.position || existingItem?.position || '',
        email: formData.email || existingItem?.email || ''
      };

      await saveEmployee(data);
      setIsModalOpen(false);
      setEditingId(null);
      setFormData({});
    } catch(e) {
      console.error(e);
      alert("Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const openAdd = () => { setEditingId(null); setFormData({ role: UserRole.EMPLOYEE, password: '123' }); setIsModalOpen(true); };
  const openEdit = (item: Employee) => { setEditingId(item.id); setFormData(item); setIsModalOpen(true); };
  const handleDelete = async (item: Employee) => {
    if(confirm(`Delete ${item.name}?`)) {
      await deleteEmployee(item.id);
    }
  };

  return (
    <Layout title="จัดการพนักงาน">
      <GenericTable
        title="รายชื่อพนักงาน"
        data={employees}
        onAdd={openAdd}
        onEdit={openEdit}
        onDelete={handleDelete}
        columns={[
          { header: 'ID', accessor: (i) => i.code },
          { header: 'Name', accessor: (i) => <div className="font-medium">{i.name}</div> },
          { header: 'Role', accessor: (i) => <span className={`text-xs px-2 py-1 rounded ${i.role === UserRole.MANAGER ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>{i.role}</span>},
          { header: 'Department', accessor: (i) => departments.find(d => d.id === i.departmentId)?.name || '-' },
          { header: 'Position', accessor: (i) => i.position },
          { header: 'Email', accessor: (i) => i.email },
        ]}
      />

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-4">{editingId ? 'แก้ไขพนักงาน' : 'เพิ่มพนักงาน'}</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <input required placeholder="รหัสพนักงาน" className="w-full border p-2 rounded" value={formData.code || ''} onChange={e => setFormData({...formData, code: e.target.value})} />
              <input required placeholder="ชื่อ-นามสกุล" className="w-full border p-2 rounded" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
              <select required className="w-full border p-2 rounded" value={formData.departmentId || ''} onChange={e => setFormData({...formData, departmentId: e.target.value})}>
                <option value="">เลือกแผนก</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-4">
                 <input required placeholder="ตำแหน่ง" className="w-full border p-2 rounded" value={formData.position || ''} onChange={e => setFormData({...formData, position: e.target.value})} />
                 <select className="w-full border p-2 rounded" value={formData.role || UserRole.EMPLOYEE} onChange={e => setFormData({...formData, role: e.target.value as UserRole})}>
                   <option value={UserRole.EMPLOYEE}>Employee</option>
                   <option value={UserRole.MANAGER}>Manager</option>
                 </select>
              </div>
              <input type="email" placeholder="อีเมล" className="w-full border p-2 rounded" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} />
              <input type="text" placeholder="รหัสผ่าน (Default: 123)" className="w-full border p-2 rounded" value={formData.password || ''} onChange={e => setFormData({...formData, password: e.target.value})} />
              
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

export default ManageEmployees;