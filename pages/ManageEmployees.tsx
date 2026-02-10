
import React, { useState, useRef, useEffect } from 'react';
import Layout from '../components/Layout';
import { GenericTable } from '../components/GenericTable';
import { useAppStore } from '../services/storage';
import { Employee, UserRole } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { Upload, X, User, Image as ImageIcon, Loader2, ZoomIn, ZoomOut, Move, Check } from 'lucide-react';

const ManageEmployees = () => {
  const { employees, saveEmployee, deleteEmployee, departments } = useAppStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Crop/Edit State
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [tempImgSrc, setTempImgSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize with default values
  const initialFormState: Partial<Employee> = {
    code: '',
    name: '',
    departmentId: '',
    position: '',
    role: UserRole.EMPLOYEE,
    email: '',
    photoUrl: '',
    password: '123'
  };
  
  const [formData, setFormData] = useState<Partial<Employee>>(initialFormState);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset form when modal closes
  useEffect(() => {
    if (!isModalOpen) {
      setFormData(initialFormState);
      setEditingId(null);
      resetCropState();
    }
  }, [isModalOpen]);

  const resetCropState = () => {
    setTempImgSrc(null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setIsCropModalOpen(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const existingItem = editingId ? employees.find(e => e.id === editingId) : null;
      
      const data: Employee = {
        id: editingId || uuidv4(),
        code: formData.code || existingItem?.code || '',
        name: formData.name || existingItem?.name || '',
        departmentId: formData.departmentId || existingItem?.departmentId || '',
        position: formData.position || existingItem?.position || '',
        email: formData.email || existingItem?.email || '',
        role: (formData.role || existingItem?.role || UserRole.EMPLOYEE) as UserRole,
        password: formData.password || existingItem?.password || '123',
        photoUrl: formData.photoUrl || existingItem?.photoUrl || ''
      };

      await saveEmployee(data);
      setIsModalOpen(false);
    } catch(e) {
      console.error(e);
      alert("Failed to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setTempImgSrc(event.target?.result as string);
        setZoom(1);
        setOffset({ x: 0, y: 0 });
        setIsCropModalOpen(true);
        // Clear input value so same file can be selected again if needed
        if (fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.readAsDataURL(file);
    }
  };

  // --- Image Manipulation Handlers ---

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      e.preventDefault();
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    // Optional: Zoom with scroll
    const newZoom = zoom - e.deltaY * 0.001;
    setZoom(Math.min(Math.max(0.5, newZoom), 3));
  };

  const confirmCrop = () => {
    if (!tempImgSrc || !imgRef.current) return;

    const canvas = document.createElement('canvas');
    const size = 250; // Final avatar size
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // Background white
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);

      const img = imgRef.current;
      
      // Calculate drawing logic:
      // The viewport is 'size' x 'size'.
      // The image is drawn centered + offset, scaled by zoom.
      
      const centerX = size / 2;
      const centerY = size / 2;
      
      const drawWidth = img.naturalWidth * zoom;
      const drawHeight = img.naturalHeight * zoom;
      
      const drawX = centerX - (drawWidth / 2) + offset.x;
      const drawY = centerY - (drawHeight / 2) + offset.y;

      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setFormData(prev => ({ ...prev, photoUrl: dataUrl }));
      resetCropState();
    }
  };

  // --- End Image Manipulation ---

  const openAdd = () => { 
    setEditingId(null); 
    setFormData({ ...initialFormState, role: UserRole.EMPLOYEE, password: '123' }); 
    setIsModalOpen(true); 
  };

  const openEdit = (item: Employee) => { 
    setEditingId(item.id); 
    setFormData({
      code: item.code || '',
      name: item.name || '',
      departmentId: item.departmentId || '',
      position: item.position || '',
      role: item.role || UserRole.EMPLOYEE,
      email: item.email || '',
      photoUrl: item.photoUrl || '',
      password: item.password || ''
    }); 
    setIsModalOpen(true); 
  };

  const handleDelete = async (item: Employee) => {
    if(confirm(`คุณต้องการลบพนักงาน ${item.name} ใช่หรือไม่?`)) {
      await deleteEmployee(item.id);
    }
  };

  const isBase64Image = formData.photoUrl?.startsWith('data:');

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
          { header: 'Name', accessor: (i) => (
             <div className="flex items-center gap-3">
               {i.photoUrl ? (
                 <img src={i.photoUrl} alt="" className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-sm" />
               ) : (
                 <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 border-2 border-white shadow-sm">
                   {i.name.charAt(0)}
                 </div>
               )}
               <div className="font-medium text-gray-900">{i.name}</div>
             </div>
          )},
          { header: 'Role', accessor: (i) => <span className={`text-xs px-2 py-1 rounded-full font-bold ${i.role === UserRole.MANAGER ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>{i.role}</span>},
          { header: 'Department', accessor: (i) => departments.find(d => d.id === i.departmentId)?.name || '-' },
          { header: 'Position', accessor: (i) => i.position },
          { header: 'Email', accessor: (i) => i.email },
        ]}
      />

      {/* Main Edit Modal */}
      {isModalOpen && !isCropModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 p-4 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-6 text-gray-800 border-b pb-2">{editingId ? 'แก้ไขข้อมูลพนักงาน' : 'เพิ่มพนักงานใหม่'}</h3>
            <form onSubmit={handleSave} className="space-y-5">
              
              {/* Photo Upload Section */}
              <div className="flex flex-col items-center justify-center mb-6 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <div className="w-24 h-24 rounded-full bg-white border-4 border-white shadow-md flex items-center justify-center overflow-hidden transition-all group-hover:border-brand-green/30">
                     {formData.photoUrl ? (
                      <img src={formData.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-10 h-10 text-gray-300" />
                    )}
                  </div>
                  <div className="absolute bottom-0 right-0 bg-brand-green text-white p-1.5 rounded-full shadow-sm hover:bg-brand-green/90 transition-colors">
                    <Upload className="w-4 h-4" />
                  </div>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleFileChange} 
                />
                
                <div className="flex flex-col items-center mt-3">
                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()}
                    className="text-sm text-brand-green font-bold hover:underline"
                  >
                    {formData.photoUrl ? 'เปลี่ยนรูปภาพ' : 'อัปโหลดรูปภาพ'}
                  </button>
                  
                  {formData.photoUrl && (
                    <button 
                      type="button" 
                      onClick={() => setFormData(prev => ({ ...prev, photoUrl: '' }))}
                      className="text-xs text-red-500 hover:text-red-700 mt-2 flex items-center gap-1 bg-white px-2 py-1 rounded-full shadow-sm border border-red-100"
                    >
                      <X className="w-3 h-3" /> ลบรูปภาพ
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-xs font-bold text-gray-500 mb-1">รหัสพนักงาน <span className="text-red-500">*</span></label>
                   <input required className="w-full border-gray-200 bg-gray-50 p-2.5 rounded-xl border focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all" value={formData.code || ''} onChange={e => setFormData({...formData, code: e.target.value})} placeholder="เช่น 001" />
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-gray-500 mb-1">ชื่อ-นามสกุล <span className="text-red-500">*</span></label>
                   <input required className="w-full border-gray-200 bg-gray-50 p-2.5 rounded-xl border focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="ชื่อจริง นามสกุล" />
                 </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">แผนก <span className="text-red-500">*</span></label>
                <select required className="w-full border-gray-200 bg-gray-50 p-2.5 rounded-xl border focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all" value={formData.departmentId || ''} onChange={e => setFormData({...formData, departmentId: e.target.value})}>
                  <option value="">เลือกแผนก</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-xs font-bold text-gray-500 mb-1">ตำแหน่ง <span className="text-red-500">*</span></label>
                   <input required className="w-full border-gray-200 bg-gray-50 p-2.5 rounded-xl border focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all" value={formData.position || ''} onChange={e => setFormData({...formData, position: e.target.value})} placeholder="เช่น Officer" />
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-gray-500 mb-1">สิทธิ์การใช้งาน</label>
                   <select className="w-full border-gray-200 bg-gray-50 p-2.5 rounded-xl border focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all" value={formData.role || UserRole.EMPLOYEE} onChange={e => setFormData({...formData, role: e.target.value as UserRole})}>
                     <option value={UserRole.EMPLOYEE}>Employee</option>
                     <option value={UserRole.MANAGER}>Manager</option>
                   </select>
                 </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">อีเมล หรือ ชื่อผู้ใช้งาน</label>
                <input 
                  type="text" 
                  className="w-full border-gray-200 bg-gray-50 p-2.5 rounded-xl border focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all" 
                  value={formData.email || ''} 
                  onChange={e => setFormData({...formData, email: e.target.value})} 
                  placeholder="user@company.com หรือ username" 
                />
              </div>
              
              <div className="pt-2 border-t border-dashed">
                 <label className="block text-xs font-bold text-gray-400 mb-1 flex items-center justify-between">
                    <span>หรือใส่ลิงก์รูปภาพ (Optional)</span>
                    {isBase64Image && <span className="text-[10px] text-green-600 font-normal">ใช้รูปที่อัปโหลดแล้ว</span>}
                 </label>
                 <div className="relative">
                   {isBase64Image && <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />}
                   <input 
                      type="text" 
                      placeholder={isBase64Image ? "(รูปภาพถูกอัปโหลดจากเครื่อง)" : "https://example.com/image.jpg"} 
                      className={`w-full border-gray-200 bg-white p-2 rounded-lg border text-xs ${isBase64Image ? 'pl-9 text-gray-400 bg-gray-50' : ''}`}
                      value={isBase64Image ? '' : (formData.photoUrl || '')} 
                      onChange={e => !isBase64Image && setFormData({...formData, photoUrl: e.target.value})} 
                      disabled={!!isBase64Image}
                    />
                 </div>
              </div>

              <div>
                 <label className="block text-xs font-bold text-gray-500 mb-1">รหัสผ่าน (เริ่มต้น: 123)</label>
                 <input type="text" className="w-full border-gray-200 bg-gray-50 p-2.5 rounded-xl border focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all" value={formData.password || ''} onChange={e => setFormData({...formData, password: e.target.value})} />
              </div>
              
              <div className="flex justify-end gap-3 mt-8 pt-4 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-bold transition-all">ยกเลิก</button>
                <button 
                  type="submit" 
                  disabled={isSaving} 
                  className="px-5 py-2.5 bg-brand-green text-white rounded-xl hover:bg-brand-green/90 shadow-lg shadow-brand-green/30 disabled:bg-gray-400 font-bold transition-all flex items-center gap-2"
                >
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Crop / Edit Image Modal */}
      {isCropModalOpen && tempImgSrc && (
        <div className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center z-50 p-4 animate-in fade-in duration-200">
           <div className="bg-white rounded-2xl p-4 w-full max-w-md shadow-2xl overflow-hidden flex flex-col items-center">
              <div className="w-full flex justify-between items-center mb-4 pb-2 border-b">
                 <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <Move className="w-4 h-4 text-brand-green" /> ปรับแต่งรูปโปรไฟล์
                 </h3>
                 <button onClick={resetCropState} className="p-1 hover:bg-gray-100 rounded-full text-gray-500"><X className="w-5 h-5"/></button>
              </div>
              
              <div className="relative w-64 h-64 bg-gray-100 rounded-full border-4 border-brand-green/30 overflow-hidden cursor-move touch-none mb-6 shadow-inner"
                   onMouseDown={handleMouseDown}
                   onMouseMove={handleMouseMove}
                   onMouseUp={handleMouseUp}
                   onMouseLeave={handleMouseUp}
                   onWheel={handleWheel}
              >
                  {/* Visual Guide Overlay */}
                  <div className="absolute inset-0 z-10 pointer-events-none rounded-full border border-white/20"></div>

                  <img 
                    ref={imgRef}
                    src={tempImgSrc} 
                    alt="Crop Preview" 
                    draggable={false}
                    className="absolute max-w-none origin-center"
                    style={{
                      left: '50%',
                      top: '50%',
                      transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                    }}
                  />
              </div>

              {/* Controls */}
              <div className="w-full px-6 space-y-4">
                 <div className="flex items-center gap-4">
                    <ZoomOut className="w-4 h-4 text-gray-400" />
                    <input 
                      type="range" 
                      min="0.5" 
                      max="3" 
                      step="0.05" 
                      value={zoom} 
                      onChange={(e) => setZoom(parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-green"
                    />
                    <ZoomIn className="w-4 h-4 text-gray-400" />
                 </div>
                 <p className="text-center text-xs text-gray-400">ลากรูปเพื่อจัดตำแหน่ง • เลื่อนแถบเพื่อซูม</p>
              </div>

              <div className="grid grid-cols-2 gap-3 w-full mt-6 pt-4 border-t">
                 <button onClick={resetCropState} className="py-2.5 rounded-xl text-gray-600 font-bold hover:bg-gray-100 transition-colors">
                    ยกเลิก
                 </button>
                 <button onClick={confirmCrop} className="py-2.5 rounded-xl bg-brand-green text-white font-bold hover:bg-brand-green/90 shadow-lg shadow-brand-green/20 flex items-center justify-center gap-2">
                    <Check className="w-4 h-4" /> ใช้รูปภาพนี้
                 </button>
              </div>
           </div>
        </div>
      )}
    </Layout>
  );
};

export default ManageEmployees;
