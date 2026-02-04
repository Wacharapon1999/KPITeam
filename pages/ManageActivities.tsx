import React, { useState } from 'react';
import Layout from '../components/Layout';
import { GenericTable } from '../components/GenericTable';
import { useAppStore } from '../services/storage';
import { Activity } from '../types';
import { v4 as uuidv4 } from 'uuid';

const ManageActivities = () => {
  const { activities, saveActivity, deleteActivity, kpis } = useAppStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Activity>>({});
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    // SAFE UPDATE
    const existingItem = editingId ? activities.find(a => a.id === editingId) : null;
    const dataToSave: Activity = { 
      ...(existingItem || {}),
      ...formData, 
      id: editingId || uuidv4(),
      active: formData.active ?? existingItem?.active ?? true,
      code: formData.code || existingItem?.code || '',
      name: formData.name || existingItem?.name || '',
      kpiId: formData.kpiId || existingItem?.kpiId || '',
      description: formData.description || existingItem?.description || ''
    };
    
    await saveActivity(dataToSave);
    setIsSaving(false);
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({});
  };

  const openAdd = () => { setEditingId(null); setFormData({ active: true }); setIsModalOpen(true); };
  const openEdit = (item: Activity) => { setEditingId(item.id); setFormData(item); setIsModalOpen(true); };
  const handleDelete = async (item: Activity) => {
    if(confirm(`Delete ${item.name}?`)) await deleteActivity(item.id);
  };

  return (
    <Layout title="จัดการกิจกรรม">
      <GenericTable
        title="รายการกิจกรรม"
        data={activities}
        onAdd={openAdd}
        onEdit={openEdit}
        onDelete={handleDelete}
        columns={[
          { header: 'KPI', accessor: (i) => kpis.find(k => k.id === i.kpiId)?.name || '-' },
          { header: 'Code', accessor: (i) => i.code },
          { header: 'Name', accessor: (i) => <div className="font-medium">{i.name}</div> },
          { header: 'Status', accessor: (i) => i.active ? <span className="text-green-600">Active</span> : <span className="text-gray-400">Inactive</span> },
        ]}
      />

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-4">{editingId ? 'แก้ไขกิจกรรม' : 'เพิ่มกิจกรรม'}</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <select required className="w-full border p-2 rounded" value={formData.kpiId || ''} onChange={e => setFormData({...formData, kpiId: e.target.value})}>
                <option value="">เลือก KPI</option>
                {kpis.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
              </select>
              <input required placeholder="รหัสกิจกรรม" className="w-full border p-2 rounded" value={formData.code || ''} onChange={e => setFormData({...formData, code: e.target.value})} />
              <input required placeholder="ชื่อกิจกรรม" className="w-full border p-2 rounded" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
              <textarea placeholder="คำอธิบาย" className="w-full border p-2 rounded" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} />
              
              <div className="flex items-center gap-2">
                <input type="checkbox" id="active" checked={formData.active ?? true} onChange={e => setFormData({...formData, active: e.target.checked})} />
                <label htmlFor="active">เปิดใช้งาน</label>
              </div>

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
export default ManageActivities;