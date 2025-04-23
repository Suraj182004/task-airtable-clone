import { useState } from 'react';

interface Field {
  _id: string;
  name: string;
  type: 'text' | 'number' | 'email' | 'time' | 'multiple_choice' | 'website' | 'date';
  options?: string[]; // For multiple_choice field type
}

interface FieldManagerProps {
  tableId: string;
  fields: Field[];
  onFieldAdded: (newField: Field) => void;
  onFieldUpdated?: (updatedField: Field) => void;
  onFieldDeleted?: (fieldId: string, fieldName: string) => void;
}

export default function FieldManager({ 
  tableId, 
  fields, 
  onFieldAdded, 
  onFieldUpdated, 
  onFieldDeleted 
}: FieldManagerProps) {
  const [fieldName, setFieldName] = useState('');
  const [fieldType, setFieldType] = useState<'text' | 'number' | 'email' | 'time' | 'multiple_choice' | 'website' | 'date'>('text');
  const [fieldOptions, setFieldOptions] = useState<string[]>(['']);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Field editing state
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<'text' | 'number' | 'email' | 'time' | 'multiple_choice' | 'website' | 'date'>('text');
  const [editOptions, setEditOptions] = useState<string[]>(['']);
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  
  // Field deletion state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Reset field options when field type changes
  const handleFieldTypeChange = (type: 'text' | 'number' | 'email' | 'time' | 'multiple_choice' | 'website' | 'date') => {
    setFieldType(type);
    if (type === 'multiple_choice' && fieldOptions.length === 0) {
      setFieldOptions(['']);
    }
  };
  
  // Add a new empty option to the multiple choice field
  const addOption = () => {
    setFieldOptions([...fieldOptions, '']);
  };
  
  // Remove an option from the multiple choice field
  const removeOption = (index: number) => {
    if (fieldOptions.length > 1) {
      const newOptions = [...fieldOptions];
      newOptions.splice(index, 1);
      setFieldOptions(newOptions);
    }
  };
  
  // Update an option value
  const updateOption = (index: number, value: string) => {
    const newOptions = [...fieldOptions];
    newOptions[index] = value;
    setFieldOptions(newOptions);
  };
  
  // Add a new empty option to the multiple choice field in edit mode
  const addEditOption = () => {
    setEditOptions([...editOptions, '']);
  };
  
  // Remove an option from the multiple choice field in edit mode
  const removeEditOption = (index: number) => {
    if (editOptions.length > 1) {
      const newOptions = [...editOptions];
      newOptions.splice(index, 1);
      setEditOptions(newOptions);
    }
  };
  
  // Update an option value in edit mode
  const updateEditOption = (index: number, value: string) => {
    const newOptions = [...editOptions];
    newOptions[index] = value;
    setEditOptions(newOptions);
  };

  const handleAddField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fieldName.trim()) return;
    
    // Validate multiple choice options
    if (fieldType === 'multiple_choice') {
      const validOptions = fieldOptions.filter(option => option.trim() !== '');
      if (validOptions.length === 0) {
        setError('Multiple choice fields must have at least one option');
        return;
      }
      // Remove empty options
      setFieldOptions(validOptions);
    }

    setAdding(true);
    setError(null);
    
    try {
      interface FieldRequest {
        name: string;
        type: 'text' | 'number' | 'email' | 'time' | 'multiple_choice' | 'website' | 'date';
        options?: string[];
      }
      
      const requestBody: FieldRequest = { name: fieldName, type: fieldType };
      
      // Add options if it's a multiple choice field
      if (fieldType === 'multiple_choice') {
        requestBody.options = fieldOptions.filter(option => option.trim() !== '');
      }
      
      const response = await fetch(`/api/tables/${tableId}/fields`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      const result = await response.json();
      
      if (result.success) {
        onFieldAdded(result.data);
        setFieldName('');
        setFieldType('text');
        setFieldOptions(['']);
      } else {
        throw new Error(result.message || 'Failed to add field');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setAdding(false);
    }
  };
  
  const startEditingField = (field: Field) => {
    setEditingField(field._id);
    setEditName(field.name);
    setEditType(field.type);
    setUpdateError(null);
    
    // Set options if it's a multiple choice field
    if (field.type === 'multiple_choice' && field.options && field.options.length > 0) {
      setEditOptions(field.options);
    } else {
      setEditOptions(['']);
    }
  };
  
  const cancelEditingField = () => {
    setEditingField(null);
    setEditName('');
    setEditType('text');
    setEditOptions(['']);
    setUpdateError(null);
  };
  
  const handleUpdateField = async (e: React.FormEvent, fieldId: string) => {
    e.preventDefault();
    if (!editName.trim()) return;
    
    // Validate multiple choice options
    if (editType === 'multiple_choice') {
      const validOptions = editOptions.filter(option => option.trim() !== '');
      if (validOptions.length === 0) {
        setUpdateError('Multiple choice fields must have at least one option');
        return;
      }
      // Remove empty options
      setEditOptions(validOptions);
    }
    
    setUpdating(true);
    setUpdateError(null);
    
    try {
      interface FieldUpdateRequest {
        fieldId: string;
        name: string;
        type: 'text' | 'number' | 'email' | 'time' | 'multiple_choice' | 'website' | 'date';
        options?: string[];
      }
      
      const requestBody: FieldUpdateRequest = { 
        fieldId,
        name: editName, 
        type: editType 
      };
      
      // Add options if it's a multiple choice field
      if (editType === 'multiple_choice') {
        requestBody.options = editOptions.filter(option => option.trim() !== '');
      }
      
      const response = await fetch(`/api/tables/${tableId}/fields`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      const result = await response.json();
      
      if (result.success) {
        if (onFieldUpdated) {
          onFieldUpdated(result.data);
        }
        setEditingField(null);
      } else {
        throw new Error(result.message || 'Failed to update field');
      }
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setUpdating(false);
    }
  };
  
  const handleDeleteField = async (fieldId: string) => {
    setDeleting(fieldId);
    setDeleteError(null);
    
    try {
      const response = await fetch(`/api/tables/${tableId}/fields?fieldId=${fieldId}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (result.success) {
        if (onFieldDeleted) {
          onFieldDeleted(fieldId, result.data.fieldName);
        }
        setShowDeleteConfirm(null);
      } else {
        throw new Error(result.message || 'Failed to delete field');
      }
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setDeleting(null);
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
              onChange={(e) => handleFieldTypeChange(e.target.value as 'text' | 'number' | 'email' | 'time' | 'multiple_choice' | 'website' | 'date')}
              disabled={adding}
            >
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="email">Email</option>
              <option value="time">Time (HH:MM)</option>
              <option value="multiple_choice">Multiple Choice</option>
              <option value="website">Website Link</option>
              <option value="date">Date</option>
            </select>
          </div>
          
          {fieldType === 'multiple_choice' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Options
              </label>
              {fieldOptions.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder={`Option ${index + 1}`}
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    disabled={adding}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => removeOption(index)}
                    className="text-red-500 hover:text-red-700"
                    disabled={adding || fieldOptions.length <= 1}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addOption}
                className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={adding}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                </svg>
                Add Option
              </button>
            </div>
          )}
          
          <div>
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              disabled={adding || !fieldName.trim() || (fieldType === 'multiple_choice' && fieldOptions.filter(opt => opt.trim()).length === 0)}
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
                  {editingField === field._id ? (
                    <form onSubmit={(e) => handleUpdateField(e, field._id)} className="space-y-3">
                      <div>
                        <label htmlFor={`edit-name-${field._id}`} className="block text-sm font-medium text-gray-700">
                          Field Name
                        </label>
                        <input
                          type="text"
                          id={`edit-name-${field._id}`}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          disabled={updating}
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor={`edit-type-${field._id}`} className="block text-sm font-medium text-gray-700">
                          Field Type
                        </label>
                        <select
                          id={`edit-type-${field._id}`}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          value={editType}
                          onChange={(e) => setEditType(e.target.value as 'text' | 'number' | 'email' | 'time' | 'multiple_choice' | 'website' | 'date')}
                          disabled={updating}
                        >
                          <option value="text">Text</option>
                          <option value="number">Number</option>
                          <option value="email">Email</option>
                          <option value="time">Time (HH:MM)</option>
                          <option value="multiple_choice">Multiple Choice</option>
                          <option value="website">Website Link</option>
                          <option value="date">Date</option>
                        </select>
                      </div>
                      
                      {editType === 'multiple_choice' && (
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Options
                          </label>
                          {editOptions.map((option, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <input
                                type="text"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                placeholder={`Option ${index + 1}`}
                                value={option}
                                onChange={(e) => updateEditOption(index, e.target.value)}
                                disabled={updating}
                                required
                              />
                              <button
                                type="button"
                                onClick={() => removeEditOption(index)}
                                className="text-red-500 hover:text-red-700"
                                disabled={updating || editOptions.length <= 1}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={addEditOption}
                            className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            disabled={updating}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                            </svg>
                            Add Option
                          </button>
                        </div>
                      )}
                      
                      {updateError && (
                        <div className="text-sm text-red-600">{updateError}</div>
                      )}
                      <div className="flex space-x-2">
                        <button
                          type="submit"
                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={updating || !editName.trim() || (editType === 'multiple_choice' && editOptions.filter(opt => opt.trim()).length === 0)}
                        >
                          {updating ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditingField}
                          className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={updating}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{field.name}</p>
                        <p className="text-sm text-gray-500">Type: {field.type.replace('_', ' ')}</p>
                        {field.type === 'multiple_choice' && field.options && field.options.length > 0 && (
                          <div className="mt-1">
                            <p className="text-xs text-gray-500">Options:</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {field.options.map((option, idx) => (
                                <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                  {option}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getFieldTypeColor(field.type)}`}>
                          {field.type.replace('_', ' ')}
                        </span>
                        <button
                          onClick={() => startEditingField(field)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit field"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(field._id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete field"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Field Deletion</h3>
            <p className="text-sm text-gray-500 mb-4">
              Are you sure you want to delete this field? This will remove the field and all associated data from entries. This action cannot be undone.
            </p>
            
            {deleteError && (
              <div className="mb-4 rounded-md bg-red-50 p-3">
                <p className="text-sm text-red-700">{deleteError}</p>
              </div>
            )}
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                disabled={deleting !== null}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteField(showDeleteConfirm)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
                disabled={deleting !== null}
              >
                {deleting === showDeleteConfirm ? 'Deleting...' : 'Delete Field'}
              </button>
            </div>
          </div>
        </div>
      )}
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
    case 'multiple_choice':
      return 'bg-pink-100 text-pink-800';
    case 'website':
      return 'bg-indigo-100 text-indigo-800';
    case 'date':
      return 'bg-teal-100 text-teal-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
} 