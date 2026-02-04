import React from 'react';
import { Edit, Trash2, Plus } from 'lucide-react';

interface Column<T> {
  header: string;
  accessor: (item: T) => React.ReactNode;
}

interface GenericTableProps<T> {
  title: string;
  data: T[];
  columns: Column<T>[];
  onAdd: () => void;
  onEdit: (item: T) => void;
  onDelete: (item: T) => void;
}

export function GenericTable<T extends { id: string }>({ 
  title, 
  data, 
  columns, 
  onAdd, 
  onEdit, 
  onDelete 
}: GenericTableProps<T>) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-teal-500 to-teal-600 text-white">
        <h3 className="text-lg font-semibold">{title}</h3>
        <button 
          onClick={onAdd}
          className="flex items-center gap-2 bg-white text-teal-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          <Plus className="w-4 h-4" /> เพิ่มข้อมูล
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-600 font-medium uppercase tracking-wider border-b">
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} className="px-6 py-4">{col.header}</th>
              ))}
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.length === 0 ? (
               <tr><td colSpan={columns.length + 1} className="text-center py-8 text-gray-400">ไม่พบข้อมูล</td></tr>
            ) : (
              data.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  {columns.map((col, idx) => (
                    <td key={idx} className="px-6 py-4 text-gray-700">
                      {col.accessor(item)}
                    </td>
                  ))}
                  <td className="px-6 py-4 text-right space-x-2">
                    <button onClick={() => onEdit(item)} className="p-2 text-orange-400 hover:bg-orange-50 rounded-full transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => onDelete(item)} className="p-2 text-red-400 hover:bg-red-50 rounded-full transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}