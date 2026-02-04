import React, { useState } from 'react';
import Layout from '../components/Layout';
import { GenericTable } from '../components/GenericTable';
import { useAppStore } from '../services/storage';
import { KPI, PeriodType } from '../types';
import { v4 as uuidv4 } from 'uuid';

const ManageKPIs = () => {
  const { kpis, saveKPI, deleteKPI } = useAppStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<KPI>>({});
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    // SAFE UPDATE
    const existingItem = editingId ? kpis.find(k => k.id === editingId) : null;
    const data: KPI = { 
        ...(existingItem || {}),
        ...formData, 
        id: editingId || uuidv4(),
        period: formData.period || existingItem?.period || PeriodType.MONTHLY,
        weight: formData.weight || existingItem?.weight || 0,
        code: formData.code || existingItem?.code || '',
        name: formData.name || existingItem?.name || '',
        activity: formData.activity || existingItem?.activity || '',
        description: formData.description || existingItem?.description || ''
    };

    await saveKPI(data);
    setIsSaving(false);
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({});
  };

  const openAdd = () => { setEditingId(null); setFormData({ period: PeriodType.MONTHLY }); setIsModalOpen(true); };
  const openEdit = (item: KPI) => { setEditingId(item.id); setFormData(item); setIsModalOpen(true); };
  const handleDelete = async (item: KPI) => {
    if(confirm(`Delete ${item.name}?`)) await deleteKPI(item.id);
  };

  return (
    <Layout title="จัดการ KPI">
      <GenericTable
        title="รายการ KPI"
        data={kpis}
        onAdd={openAdd}
        onEdit={openEdit}
        onDelete={handleDelete}
        columns={[
          { header: 'Code', accessor: (i) => i.code },
          { header: 'Name', accessor: (i) => <div className="font-medium">{i.name}</div> },
          { header: 'Weight', accessor: (i) => `${i.weight}%` },
          { header: 'Period', accessor: (i) => i.period },
        ]}
      />

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-4">{editingId ? 'แก้ไข KPI' : 'เพิ่ม KPI'}</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <input required placeholder="รหัส KPI" className="w-full border p-2 rounded" value={formData.code || ''} onChange={e => setFormData({...formData, code: e.target.value})} />
              <input required placeholder="ชื่อ KPI" className="w-full border p-2 rounded" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
              <input placeholder="Activity (Group)" className="w-full border p-2 rounded" value={formData.activity || ''} onChange={e => setFormData({...formData, activity: e.target.value})} />
              <input required type="number" placeholder="น้ำหนัก (%)" className="w-full border p-2 rounded" value={formData.weight || ''} onChange={e => setFormData({...formData, weight: parseInt(e.target.value) || 0})} />
              <select className="w-full border p-2 rounded" value={formData.period || PeriodType.MONTHLY} onChange={e => setFormData({...formData, period: e.target.value as PeriodType})}>
                <option value={PeriodType.WEEKLY}>Weekly</option>
                <option value={PeriodType.MONTHLY}>Monthly</option>
                <option value={PeriodType.QUARTERLY}>Quarterly</option>
              </select>
              <textarea placeholder="คำอธิบาย" className="w-full border p-2 rounded" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} />

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
export default ManageKPIs;