import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import React from 'react';

// TypeScript interfaces
interface Field {
  _id: string;
  name: string;
  type: 'text' | 'number' | 'email' | 'time' | 'multiple_choice' | 'website' | 'date';
  options?: string[]; // For multiple_choice field type
}

interface Entry {
  _id: string;
  tableId: string;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface EntryManagerProps {
  tableId: string;
  fields: Field[];
  entries: Entry[];
  onEntryAdded: (newEntry: Entry) => void;
  onEntryUpdated?: (updatedEntry: Entry) => void;
  onEntryDeleted?: (entryId: string) => void;
}

interface CellPosition {
  entryId: string;
  fieldId: string;
  rowIndex: number;
  colIndex: number;
}

export default function EntryManager({ 
  tableId, 
  fields, 
  entries, 
  onEntryAdded,
  onEntryUpdated,
  onEntryDeleted 
}: EntryManagerProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [adding, setAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [editingCell, setEditingCell] = useState<CellPosition | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<CellPosition | null>(null);
  const [dragEnd, setDragEnd] = useState<CellPosition | null>(null);
  
  const cellRefs = useRef<Record<string, HTMLTableCellElement | null>>({});
  const editInputRef = useRef<HTMLInputElement | null>(null);
  const editSelectRef = useRef<HTMLSelectElement | null>(null);

  // Initialize form data when fields change
  useEffect(() => {
    const newFormData: Record<string, unknown> = {};
    fields.forEach(field => {
      newFormData[field.name] = '';
    });
    setFormData(newFormData);
  }, [fields]);

  // Focus the appropriate input when a cell is being edited
  useEffect(() => {
    if (editingCell) {
      const field = fields.find(f => f._id === editingCell.fieldId);
      if (field && field.type === 'multiple_choice') {
        if (editSelectRef.current) {
          editSelectRef.current.focus();
        }
      } else if (editInputRef.current) {
        editInputRef.current.focus();
      }
    }
  }, [editingCell, fields]);

  // Reset form when fields change
  const resetForm = () => {
    const newFormData: Record<string, unknown> = {};
    fields.forEach(field => {
      newFormData[field.name] = '';
    });
    setFormData(newFormData);
    setValidationErrors({});
  };

  // Handle field change in the add form
  const handleFieldChange = (fieldName: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
    
    // Clear validation error for this field when user types
    if (validationErrors[fieldName]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  // Handle form submission for adding a new entry
  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Client-side validation (optional enhancement)
    const errors: Record<string, string> = {};
    let isValid = true;
    
    fields.forEach(field => {
      const value = formData[field.name] as string | undefined;
      
      if (field.type === 'email' && value && typeof value === 'string') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          errors[field.name] = 'Must be a valid email address';
          isValid = false;
        }
      }
      
      if (field.type === 'number' && value && typeof value === 'string') {
        if (isNaN(Number(value))) {
          errors[field.name] = 'Must be a valid number';
          isValid = false;
        }
      }
      
      if (field.type === 'time' && value && typeof value === 'string') {
        const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
        if (!timeRegex.test(value)) {
          errors[field.name] = 'Must be in format HH:MM (24-hour)';
          isValid = false;
        }
      }
      
      // Add basic validation for website (optional)
      if (field.type === 'website' && value) {
        try {
          new URL(value);
        } catch {
          errors[field.name] = 'Must be a valid URL';
          isValid = false;
        }
      }
      
      // Add basic validation for date (optional)
      if (field.type === 'date' && value) {
         if (isNaN(Date.parse(value))) {
           errors[field.name] = 'Must be a valid date';
           isValid = false;
         }
      }
    });
    
    if (!isValid) {
      setValidationErrors(errors);
      return;
    }
    
    setAdding(true);
    setError(null);
    setValidationErrors({});
    
    // API call handles primary validation
    try {
       const response = await fetch(`/api/tables/${tableId}/entries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: formData }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        onEntryAdded(result.data);
        resetForm();
        setShowAddForm(false);
      } else if (result.errors) {
        // Handle validation errors from the server
        setValidationErrors(result.errors);
      } else {
        throw new Error(result.message || 'Failed to add entry');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setAdding(false);
    }
  };

  // Handle entry deletion
  const handleDeleteEntry = async (entryId: string) => {
    setDeleting(entryId);
    setDeleteError(null);
    
    try {
      const response = await fetch(`/api/tables/${tableId}/entries?entryId=${entryId}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Call the callback to update the parent component
        if (onEntryDeleted) {
          onEntryDeleted(entryId);
        }
        setShowDeleteConfirm(null);
        // Remove from selected rows if it was selected
        if (selectedRows.has(entryId)) {
          const newSelected = new Set(selectedRows);
          newSelected.delete(entryId);
          setSelectedRows(newSelected);
        }
      } else {
        throw new Error(result.message || 'Failed to delete entry');
      }
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setDeleting(null);
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedRows.size === 0) return;
    
    const confirmDelete = window.confirm(`Are you sure you want to delete ${selectedRows.size} selected rows?`);
    if (!confirmDelete) return;
    
    const deletePromises = Array.from(selectedRows).map(entryId => handleDeleteEntry(entryId));
    
    try {
      await Promise.all(deletePromises);
      setSelectedRows(new Set());
    } catch (err) {
      console.error('Error during bulk delete:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete some entries');
    }
  };

  // Handle row selection
  const handleRowSelect = (entryId: string, isSelected: boolean) => {
    const newSelected = new Set(selectedRows);
    
    if (isSelected) {
      newSelected.add(entryId);
    } else {
      newSelected.delete(entryId);
    }
    
    setSelectedRows(newSelected);
  };

  // Toggle all rows selection
  const handleSelectAll = (isSelected: boolean) => {
    if (isSelected) {
      const allIds = entries.map(entry => entry._id);
      setSelectedRows(new Set(allIds));
    } else {
      setSelectedRows(new Set());
    }
  };

  // Start editing a cell
  const startEditing = (entry: Entry, field: Field, rowIndex: number, colIndex: number) => {
    const value = entry.data[field.name];
    setEditingCell({
      entryId: entry._id,
      fieldId: field._id,
      rowIndex,
      colIndex
    });
    // Format date for input type="date"
    if (field.type === 'date' && value) {
      try {
        // Assuming value is stored as ISO string or Date object
        const dateObj = new Date(value as string);
        if (!isNaN(dateObj.getTime())) {
          // Format as YYYY-MM-DD
          const year = dateObj.getFullYear();
          const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
          const day = dateObj.getDate().toString().padStart(2, '0');
          setEditValue(`${year}-${month}-${day}`);
        } else {
           setEditValue(''); // Handle invalid date from data
        }
      } catch {
         setEditValue(''); // Handle parsing error
      }
    } else {
      setEditValue(value === null || value === undefined ? '' : String(value));
    }
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingCell(null);
    setEditValue('');
    setUpdateError(null);
  };

  // Save the edited cell value
  const saveEditedCell = async () => {
    if (!editingCell) return;
    
    setUpdating(true);
    setUpdateError(null);
    
    const entry = entries.find(e => e._id === editingCell.entryId);
    const field = fields.find(f => f._id === editingCell.fieldId);
    
    if (!entry || !field) {
      setUpdateError('Entry or Field not found');
      setUpdating(false);
      return;
    }
    
    // Client-side validation before sending to API
    let isValid = true;
    let validationError = '';
    let valueToSave: unknown = editValue; // Use unknown for flexibility
    
    // Existing validations...
    if (field.type === 'email' && editValue) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(editValue)) {
        validationError = 'Must be a valid email address';
        isValid = false;
      }
    }
    
    if (field.type === 'number' && editValue) {
      if (isNaN(Number(editValue))) {
        validationError = 'Must be a valid number';
        isValid = false;
      }
    }
    
    if (field.type === 'time' && editValue) {
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
      if (!timeRegex.test(editValue)) {
        validationError = 'Must be in format HH:MM (24-hour)';
        isValid = false;
      }
    }

    // Add validation for website
    if (field.type === 'website' && editValue) {
      try {
        new URL(editValue); // Check if it's a valid URL format
        valueToSave = editValue.trim();
      } catch {
        validationError = 'Must be a valid URL (e.g., https://example.com)';
        isValid = false;
      }
    }
    
    // Add validation for date
    if (field.type === 'date' && editValue) {
      const date = new Date(editValue); // input type=date gives YYYY-MM-DD
      if (isNaN(date.getTime())) {
        validationError = 'Must be a valid date (e.g., YYYY-MM-DD).';
        isValid = false;
      } else {
        // Send ISO string or rely on API to parse correctly
        valueToSave = date.toISOString(); // More robust for API
      }
    }
    
    // Handle null/empty value clearing
    if (editValue === '') {
        valueToSave = null;
    }

    if (!isValid) {
      setUpdateError(validationError);
      setUpdating(false);
      return;
    }
    
    
    const updatedData = { ...entry.data, [field.name]: valueToSave };
    
    // API Call (API validation is primary)
    try {
      const response = await fetch(`/api/tables/${tableId}/entries`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          entryId: entry._id,
          data: updatedData 
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        if (onEntryUpdated) {
          onEntryUpdated(result.data);
        } else {
          onEntryAdded(result.data); // Fallback if onEntryUpdated not provided
        }
        setEditingCell(null);
        setEditValue('');
      } else if (result.errors && result.errors[field.name]) {
        // Display specific field error from API
         setUpdateError(result.errors[field.name]);
      } else {
        throw new Error(result.message || 'Failed to update entry');
      }
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setUpdating(false);
    }
  };

  
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!editingCell) return;
    
    const { rowIndex, colIndex } = editingCell;
    
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        e.preventDefault();
        saveEditedCell();
        navigateToCell(rowIndex - 1, colIndex);
      } else {
        e.preventDefault();
        saveEditedCell();
        navigateToCell(rowIndex + 1, colIndex);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      saveEditedCell();
      if (e.shiftKey) {
        navigateToCell(rowIndex, colIndex - 1);
      } else {
        navigateToCell(rowIndex, colIndex + 1);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEditing();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (editingCell) {
        saveEditedCell();
        navigateToCell(rowIndex - 1, colIndex);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (editingCell) {
        saveEditedCell();
        navigateToCell(rowIndex + 1, colIndex);
      }
    } else if (e.key === 'ArrowLeft') {
      // Only handle for input elements with selectionStart
      if (e.currentTarget instanceof HTMLInputElement && e.currentTarget.selectionStart === 0) {
        e.preventDefault();
        saveEditedCell();
        navigateToCell(rowIndex, colIndex - 1);
      }
    } else if (e.key === 'ArrowRight') {
      // Only handle for input elements with selectionEnd
      if (e.currentTarget instanceof HTMLInputElement && 
          e.currentTarget.selectionEnd === e.currentTarget.value.length) {
        e.preventDefault();
        saveEditedCell();
        navigateToCell(rowIndex, colIndex + 1);
      }
    }
  };

  
  const handleMouseDown = (rowIndex: number, colIndex: number, entryId: string, fieldId: string) => {
    if (editingCell) return; 
    
    setIsDragging(true);
    setDragStart({
      entryId,
      fieldId,
      rowIndex,
      colIndex
    });
    setDragEnd({
      entryId,
      fieldId,
      rowIndex,
      colIndex
    });
  };

  const handleMouseMove = (rowIndex: number, colIndex: number, entryId: string, fieldId: string) => {
    if (!isDragging || !dragStart) return;
    
    setDragEnd({
      entryId,
      fieldId,
      rowIndex,
      colIndex
    });
  };

  const handleMouseUp = () => {
    if (!isDragging || !dragStart || !dragEnd) {
      setIsDragging(false);
      return;
    }
    
    
    
    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  };

  
  const isCellSelected = (rowIndex: number, colIndex: number) => {
    if (!isDragging || !dragStart || !dragEnd) return false;
    
    const minRow = Math.min(dragStart.rowIndex, dragEnd.rowIndex);
    const maxRow = Math.max(dragStart.rowIndex, dragEnd.rowIndex);
    const minCol = Math.min(dragStart.colIndex, dragEnd.colIndex);
    const maxCol = Math.max(dragStart.colIndex, dragEnd.colIndex);
    
    return rowIndex >= minRow && rowIndex <= maxRow && colIndex >= minCol && colIndex <= maxCol;
  };

  const navigateToCell = (rowIndex: number, colIndex: number) => {
    if (
      rowIndex < 0 || 
      rowIndex >= entries.length || 
      colIndex < 0 || 
      colIndex >= fields.length
    ) {
      return;
    }
    
    const entry = entries[rowIndex];
    const field = fields[colIndex];
    
    if (entry && field) {
      startEditing(entry, field, rowIndex, colIndex);
    }
  };
  
  
  const formatValue = (value: unknown, type: string): React.ReactNode => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-gray-400">-</span>;
    }
    
    if (type === 'number' && typeof value === 'number') {
      return value.toString();
    }
    
    if (type === 'website' && typeof value === 'string') {
      try {
        // Ensure URL starts with http:// or https:// for the link
        const url = value.startsWith('http') ? value : `http://${value}`;
        new URL(url); // Validate format before rendering link
        return <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">{value}</a>;
      } catch {
        return String(value); // Render as plain text if invalid URL
      }
    }
    
    if (type === 'date' && (typeof value === 'string' || value instanceof Date)) {
      try {
        const dateObj = new Date(value);
        if (!isNaN(dateObj.getTime())) {
           // Simple YYYY-MM-DD format, could use a library like date-fns for more options
          return dateObj.toLocaleDateString('en-CA'); // en-CA gives YYYY-MM-DD
        }
      } catch {
         // Fall through to default string conversion if parsing fails
      }
    }
    
    return String(value);
  };

  
  const getCellKey = (entryId: string, fieldId: string): string => {
    return `${entryId}_${fieldId}`;
  };
  
  return (
    <div className="spreadsheet-container">
      <div className="mb-4 flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Spreadsheet View</h3>
        
        <div className="flex space-x-2">
          {selectedRows.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Delete Selected ({selectedRows.size})
            </button>
          )}
          
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            {showAddForm ? 'Hide Form' : 'Add New Row'}
          </button>
        </div>
      </div>
      
      {showAddForm && (
        <div className="mb-8 bg-gray-50 p-4 rounded-lg">
          <h4 className="text-md font-medium text-gray-800 mb-4">Add New Entry</h4>
          
          {fields.length === 0 ? (
            <div className="rounded-md bg-yellow-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">No fields defined</h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>You need to define fields before you can add entries.</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleAddEntry} className="space-y-4 max-w-full">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {fields.map((field) => (
                  <div key={field._id}>
                    <label htmlFor={`field-${field._id}`} className="block text-sm font-medium text-gray-700">
                      {field.name}
                      <span className="ml-1 text-xs text-gray-500">({field.type})</span>
                    </label>
                    {field.type === 'text' && (
                      <input
                        type="text"
                        id={`field-${field._id}`}
                        className={`mt-1 block w-full rounded-md shadow-sm ${
                          validationErrors[field.name] 
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                        }`}
                        value={formData[field.name] as string || ''}
                        onChange={(e) => handleFieldChange(field.name, e.target.value)}
                        disabled={adding}
                      />
                    )}
                    {field.type === 'number' && (
                      <input
                        type="text"
                        id={`field-${field._id}`}
                        className={`mt-1 block w-full rounded-md shadow-sm ${
                          validationErrors[field.name] 
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                        }`}
                        value={formData[field.name] as string || ''}
                        onChange={(e) => handleFieldChange(field.name, e.target.value)}
                        disabled={adding}
                        inputMode="numeric"
                        pattern="[0-9]*\.?[0-9]*"
                      />
                    )}
                    {field.type === 'email' && (
                      <input
                        type="email"
                        id={`field-${field._id}`}
                        className={`mt-1 block w-full rounded-md shadow-sm ${
                          validationErrors[field.name] 
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                        }`}
                        value={formData[field.name] as string || ''}
                        onChange={(e) => handleFieldChange(field.name, e.target.value)}
                        disabled={adding}
                      />
                    )}
                    {field.type === 'time' && (
                      <input
                        type="text"
                        id={`field-${field._id}`}
                        className={`mt-1 block w-full rounded-md shadow-sm ${
                          validationErrors[field.name] 
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                        }`}
                        placeholder="HH:MM"
                        value={formData[field.name] as string || ''}
                        onChange={(e) => handleFieldChange(field.name, e.target.value)}
                        disabled={adding}
                      />
                    )}
                    {field.type === 'multiple_choice' && field.options && field.options.length > 0 && (
                      <select
                        id={`field-${field._id}`}
                        className={`mt-1 block w-full rounded-md shadow-sm ${
                          validationErrors[field.name] 
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                        }`}
                        value={formData[field.name] as string || ''}
                        onChange={(e) => handleFieldChange(field.name, e.target.value)}
                        disabled={adding}
                      >
                        <option value="">Select an option</option>
                        {field.options.map((option, idx) => (
                          <option key={idx} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    )}
                    {field.type === 'website' && (
                      <input
                        type="url"
                        id={`field-${field._id}`}
                        className={`mt-1 block w-full rounded-md shadow-sm ${
                          validationErrors[field.name] 
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                        }`}
                        placeholder="https://example.com"
                        value={formData[field.name] as string || ''}
                        onChange={(e) => handleFieldChange(field.name, e.target.value)}
                        disabled={adding}
                      />
                    )}
                    {field.type === 'date' && (
                      <input
                        type="date"
                        id={`field-${field._id}`}
                        className={`mt-1 block w-full rounded-md shadow-sm ${
                          validationErrors[field.name] 
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                        }`}
                        value={formData[field.name] as string || ''}
                        onChange={(e) => handleFieldChange(field.name, e.target.value)}
                        disabled={adding}
                      />
                    )}
                    {validationErrors[field.name] && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors[field.name]}</p>
                    )}
                  </div>
                ))}
              </div>
              
              <div>
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  disabled={adding || fields.length === 0}
                >
                  {adding ? 'Adding...' : 'Add Row'}
                </button>
              </div>
            </form>
          )}
          
          {error && (
            <div className="mt-4 rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error adding entry</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
    
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Deletion</h3>
            <p className="text-sm text-gray-500 mb-4">
              Are you sure you want to delete this entry? This action cannot be undone.
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
                onClick={() => handleDeleteEntry(showDeleteConfirm)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
                disabled={deleting !== null}
              >
                {deleting === showDeleteConfirm ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="spreadsheet" onMouseUp={handleMouseUp}>
        {fields.length === 0 ? (
          <div className="rounded-md bg-yellow-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">No fields defined</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>You need to define fields in the Fields tab before you can add data.</p>
                </div>
              </div>
            </div>
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-md bg-blue-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">No entries yet</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>Add your first entry using the &apos;Add New Row&apos; button above.</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto bg-white border border-gray-200 rounded-lg shadow-sm" style={{ maxWidth: '100%' }}>
            <div className="min-w-full" style={{ overflowX: 'auto', overflowY: 'visible', padding: '1px' }}>
              <table className="min-w-full divide-y divide-gray-200 spreadsheet-table">
                <thead className="bg-gray-50">
                  <tr>
                    {/* Checkbox column for row selection */}
                    <th className="w-10 px-3 py-3 text-left text-xs font-medium text-gray-500 bg-gray-100 sticky left-0 z-20 column-checkbox">
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        checked={selectedRows.size === entries.length && entries.length > 0}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                      />
                    </th>
                    {/* Row number column */}
                    <th 
                      className="w-8 px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-100 sticky column-row-number"
                      style={{ left: '50px', zIndex: 15 }}
                    >
                      <div className="text-center">#</div>
                    </th>
                    {fields.map((field) => (
                      <th
                        key={field._id}
                        scope="col"
                        className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider column-${field.type}`}
                      >
                        <div className="flex items-center">
                          <span>{field.name}</span>
                          <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            {field.type}
                          </span>
                        </div>
                      </th>
                    ))}
                    {/* Actions column */}
                    <th
                      scope="col"
                      className="w-20 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider column-actions"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {entries.map((entry, rowIndex) => (
                    <tr key={entry._id} className={`hover:bg-gray-50 ${selectedRows.has(entry._id) ? 'bg-blue-50' : ''}`}>
                      {/* Checkbox cell */}
                      <td className="w-10 px-3 py-4 whitespace-nowrap text-sm font-medium bg-gray-50 sticky left-0 z-20 column-checkbox">
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          checked={selectedRows.has(entry._id)}
                          onChange={(e) => handleRowSelect(entry._id, e.target.checked)}
                        />
                      </td>
                      {/* Row number */}
                      <td 
                        className="px-2 py-4 whitespace-nowrap text-sm font-medium text-gray-500 bg-gray-50 sticky column-row-number"
                        style={{ left: '50px', zIndex: 15 }}
                      >
                        <div className="text-center">{rowIndex + 1}</div>
                      </td>
                      {fields.map((field, colIndex) => {
                        const cellKey = getCellKey(entry._id, field._id);
                        const isEditing = editingCell && 
                                          editingCell.entryId === entry._id && 
                                          editingCell.fieldId === field._id;
                        const isInDragSelection = isCellSelected(rowIndex, colIndex);
                                          
                        return (
                          <td 
                            key={cellKey}
                            ref={(el) => { cellRefs.current[cellKey] = el; }}
                            className={`px-6 py-4 whitespace-nowrap text-sm text-gray-500 border-r border-gray-100 
                              column-${field.type}
                              ${isEditing ? 'bg-blue-50' : ''}
                              ${isInDragSelection ? 'bg-blue-100' : ''}
                              ${updating && isEditing ? 'opacity-50' : ''}`}
                            onClick={() => {
                              if (!isEditing && !updating) {
                                startEditing(entry, field, rowIndex, colIndex);
                              }
                            }}
                            onMouseDown={() => handleMouseDown(rowIndex, colIndex, entry._id, field._id)}
                            onMouseMove={() => handleMouseMove(rowIndex, colIndex, entry._id, field._id)}
                          >
                            {isEditing ? (
                              <div className="relative">
                                {/* Conditional Input Rendering based on Field Type */}
                                {field.type === 'multiple_choice' ? (
                                  <select
                                    ref={editSelectRef}
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    onBlur={saveEditedCell} // Save on blur
                                    className="block w-full rounded-md border-blue-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                  >
                                    <option value="">Select...</option>
                                    {field.options?.map((option, idx) => (
                                      <option key={idx} value={option}>{option}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    ref={editInputRef}
                                    type={field.type === 'number' ? 'text' : // Use text for number to allow intermediate states
                                          field.type === 'email' ? 'email' :
                                          field.type === 'time' ? 'time' :
                                          field.type === 'website' ? 'url' : // Use url type
                                          field.type === 'date' ? 'date' : // Use date type
                                          'text'} 
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    onBlur={saveEditedCell} // Save on blur
                                    className="block w-full rounded-md border-blue-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                    inputMode={field.type === 'number' ? 'numeric' : undefined}
                                    pattern={field.type === 'number' ? '[0-9]*\\.?.*' : // Looser pattern for input
                                             field.type === 'time' ? '([01]\\d|2[0-3]):([0-5]\\d)' : undefined}
                                    placeholder={field.type === 'time' ? 'HH:MM' :
                                                 field.type === 'date' ? 'YYYY-MM-DD' :
                                                 field.type === 'website' ? 'https://...' : ''}
                                    autoFocus // Autofocus the input
                                  />
                                )}
                                
                                {/* Update Error Display */}
                                {updateError && (
                                  <div className="absolute top-full left-0 mt-1 text-xs text-red-600 bg-white border border-red-300 rounded shadow-lg p-1 z-10 whitespace-normal">
                                    {updateError}
                                  </div>
                                )}
                              </div>
                            ) : (
                              // Display Mode: Use formatValue
                              formatValue(entry.data[field.name], field.type)
                            )}
                          </td>
                        );
                      })}
                      {/* Actions cell */}
                      <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium sticky right-0 bg-white z-10 column-actions">
                         <button 
                          onClick={() => setShowDeleteConfirm(entry._id)}
                          className={`text-red-600 hover:text-red-800 focus:outline-none ${deleting === entry._id ? 'opacity-50 cursor-not-allowed' : ''}`}
                          disabled={deleting === entry._id}
                          title="Delete row"
                        >
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-4 text-xs text-gray-500">
        <p>Click on any cell to edit. Use Tab, Enter, or Arrow keys to navigate between cells. Select rows with checkboxes for bulk actions.</p>
      </div>
    </div>
  );
}