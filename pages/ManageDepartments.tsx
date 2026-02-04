import React, { useState } from 'react';
import Layout from '../components/Layout';
import { GenericTable } from '../components/GenericTable';
import { useAppStore } from '../services/storage';
import { Department } from '../types';
import { v4 as uuidv4 } from 'uuid';

const ManageDepartments = () => {
  const { departments, saveDepartment, deleteDepartment, employees } = useAppStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Department>>({});
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    // SAFE UPDATE
    const existingItem = editingId ? departments.find(d => d.id === editingId) : null;
    const data: Department = { 
        ...(existingItem || {}),
        ...formData, 
        id: editingId || uuidv4(),
        code: formData.code || existingItem?.code || '',
        name: formData.name || existingItem?.name || '',
        manager: formData.manager || existingItem?.manager || ''
    };

    await saveDepartment(data);
    setIsSaving(false);
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({});
  };

  const openAdd = () => { setEditingId(null); setFormData({}); setIsModalOpen(true); };
  const openEdit = (item: Department) => { setEditingId(item.id); setFormData(item); setIsModalOpen(true); };
  const handleDelete = async (item: Department) => {
    if(confirm(`Delete ${item.name}?`)) await deleteDepartment(item.id);
  };

  const getEmployeeCount = (deptId: string) => employees.filter(e => e.departmentId === deptId).length;

  return (
    <Layout title="จัดการแผนก">
      <GenericTable
        title="รายชื่อแผนก"
        data={departments}
        onAdd={openAdd}
        onEdit={openEdit}
        onDelete={handleDelete}
        columns={[
          { header: 'Code', accessor: (i) => i.code },
          { header: 'Name', accessor: (i) => <div className="font-medium">{i.name}</div> },
          { header: 'Manager', accessor: (i) => i.manager || '-' },
          { header: 'Employees', accessor: (i) => getEmployeeCount(i.id) },
        ]}
      />

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-4">{editingId ? 'แก้ไขแผนก' : 'เพิ่มแผนก'}</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <input required placeholder="รหัสแผนก" className="w-full border p-2 rounded" value={formData.code || ''} onChange={e => setFormData({...formData, code: e.target.value})} />
              <input required placeholder="ชื่อแผนก" className="w-full border p-2 rounded" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
              <input placeholder="หัวหน้าแผนก" className="w-full border p-2 rounded" value={formData.manager || ''} onChange={e => setFormData({...formData, manager: e.target.value})} />
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
export default ManageDepartments;