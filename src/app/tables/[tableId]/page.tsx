"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import FieldManager from '@/components/FieldManager';
import EntryManager from '@/components/EntryManager';

// Interface definitions
interface Field {
  _id: string;
  name: string;
  type: 'text' | 'number' | 'email' | 'time';
}

interface Table {
  _id: string;
  name: string;
  fields: Field[];
  createdAt: string;
  updatedAt: string;
}

interface Entry {
  _id: string;
  tableId: string;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export default function TablePage() {
  const params = useParams();
  const tableId = params.tableId as string;
  
  // State hooks
  const [table, setTable] = useState<Table | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'data' | 'fields'>('data');

  // Fetch table data and entries on component mount
  useEffect(() => {
    const fetchTableData = async () => {
      try {
        setLoading(true);
        
        // Fetch table details
        const tableResponse = await fetch(`/api/tables/${tableId}`);
        if (!tableResponse.ok) {
          throw new Error('Failed to fetch table data');
        }
        const tableResult = await tableResponse.json();
        
        if (!tableResult.success) {
          throw new Error(tableResult.message || 'Failed to fetch table data');
        }
        
        // Fetch table fields
        const fieldsResponse = await fetch(`/api/tables/${tableId}/fields`);
        if (!fieldsResponse.ok) {
          throw new Error('Failed to fetch table fields');
        }
        const fieldsResult = await fieldsResponse.json();
        
        if (!fieldsResult.success) {
          throw new Error(fieldsResult.message || 'Failed to fetch table fields');
        }
        
        // Fetch table entries
        const entriesResponse = await fetch(`/api/tables/${tableId}/entries`);
        if (!entriesResponse.ok) {
          throw new Error('Failed to fetch table entries');
        }
        const entriesResult = await entriesResponse.json();
        
        if (!entriesResult.success) {
          throw new Error(entriesResult.message || 'Failed to fetch table entries');
        }

        // Set state with fetched data
        setTable(tableResult.data);
        setFields(fieldsResult.data);
        setEntries(entriesResult.data);
        
      } catch (err) {
        console.error('Error fetching table data:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (tableId) {
      fetchTableData();
    }
  }, [tableId]);

  const handleFieldAdded = (newField: Field) => {
    setFields(prevFields => [...prevFields, newField]);
  };

  const handleEntryAdded = (newEntry: Entry) => {
    // First check if the entry already exists (for updates)
    const existingIndex = entries.findIndex(entry => entry._id === newEntry._id);
    
    if (existingIndex >= 0) {
      // Update existing entry
      setEntries(prevEntries => {
        const updatedEntries = [...prevEntries];
        updatedEntries[existingIndex] = newEntry;
        return updatedEntries;
      });
    } else {
      // Add new entry
      setEntries(prevEntries => [...prevEntries, newEntry]);
    }
  };

  const handleEntryUpdated = (updatedEntry: Entry) => {
    setEntries(prevEntries => 
      prevEntries.map(entry => 
        entry._id === updatedEntry._id ? updatedEntry : entry
      )
    );
  };

  const handleEntryDeleted = (entryId: string) => {
    setEntries(prevEntries => 
      prevEntries.filter(entry => entry._id !== entryId)
    );
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="text-center py-10">Loading table data...</div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="text-center py-10 text-red-500">
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p>{error}</p>
        </div>
      </AppLayout>
    );
  }

  if (!table) {
    return (
      <AppLayout>
        <div className="text-center py-10 text-yellow-600">
          <h2 className="text-xl font-bold mb-2">Table Not Found</h2>
          <p>The requested table could not be found.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        {/* Table Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">{table.name}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Created {new Date(table.createdAt).toLocaleDateString()}
          </p>
        </div>
        
        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('data')}
              className={`px-6 py-3 border-b-2 text-sm font-medium ${
                activeTab === 'data'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Data
            </button>
            <button
              onClick={() => setActiveTab('fields')}
              className={`px-6 py-3 border-b-2 text-sm font-medium ${
                activeTab === 'fields'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Fields
            </button>
          </nav>
        </div>
        
        {/* Tab Content */}
        <div className="px-6 py-4">
          {activeTab === 'data' ? (
            <EntryManager 
              tableId={tableId} 
              fields={fields} 
              entries={entries} 
              onEntryAdded={handleEntryAdded}
              onEntryUpdated={handleEntryUpdated}
              onEntryDeleted={handleEntryDeleted} 
            />
          ) : (
            <FieldManager 
              tableId={tableId} 
              fields={fields} 
              onFieldAdded={handleFieldAdded} 
            />
          )}
        </div>
      </div>
    </AppLayout>
  );
} 