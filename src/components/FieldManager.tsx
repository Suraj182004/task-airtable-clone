import { useState } from 'react';

interface Field {
  _id: string;
  name: string;
  type: 'text' | 'number' | 'email' | 'time';
}

interface FieldManagerProps {
  tableId: string;
  fields: Field[];
  onFieldAdded: (newField: Field) => void;
}

export default function FieldManager({ tableId, fields, onFieldAdded }: FieldManagerProps) {
  const [fieldName, setFieldName] = useState('');
  const [fieldType, setFieldType] = useState<'text' | 'number' | 'email' | 'time'>('text');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleAddField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fieldName.trim()) return;

    setAdding(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/tables/${tableId}/fields`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: fieldName, type: fieldType }),
      });
      
      const result = await response.json();
      
      if (result.success) {
      
        onFieldAdded(result.data);
       
        setFieldName('');
        setFieldType('text');
      } else {
        throw new Error(result.message || 'Failed to add field');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setAdding(false);
    }
  };
  
  return (
    <div>
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Add New Field</h3>
        <form onSubmit={handleAddField} className="max-w-md space-y-4">
          <div>
            <label htmlFor="fieldName" className="block text-sm font-medium text-gray-700">
              Field Name
            </label>
            <input
              type="text"
              id="fieldName"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="e.g., Title, Date, Email"
              value={fieldName}
              onChange={(e) => setFieldName(e.target.value)}
              disabled={adding}
              required
            />
          </div>
          
          <div>
            <label htmlFor="fieldType" className="block text-sm font-medium text-gray-700">
              Field Type
            </label>
            <select
              id="fieldType"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={fieldType}
              onChange={(e) => setFieldType(e.target.value as 'text' | 'number' | 'email' | 'time')}
              disabled={adding}
            >
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="email">Email</option>
              <option value="time">Time (HH:MM)</option>
            </select>
          </div>
          
          <div>
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              disabled={adding || !fieldName.trim()}
            >
              {adding ? 'Adding...' : 'Add Field'}
            </button>
          </div>
        </form>
        
        {error && (
          <div className="mt-4 rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error adding field</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Current Fields</h3>
        {fields.length === 0 ? (
          <p className="text-gray-500 italic">No fields defined yet. Add your first field above.</p>
        ) : (
          <div className="bg-white shadow overflow-hidden rounded-md">
            <ul className="divide-y divide-gray-200">
              {fields.map((field) => (
                <li key={field._id} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{field.name}</p>
                      <p className="text-sm text-gray-500">Type: {field.type}</p>
                    </div>
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getFieldTypeColor(field.type)}`}>
                      {field.type}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function getFieldTypeColor(type: string): string {
  switch (type) {
    case 'text':
      return 'bg-blue-100 text-blue-800';
    case 'number':
      return 'bg-green-100 text-green-800';
    case 'email':
      return 'bg-purple-100 text-purple-800';
    case 'time':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
} 