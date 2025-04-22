import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Table {
  _id: string;
  name: string;
  createdAt: string;
}

export default function TableList() {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTableName, setNewTableName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTables = async () => {
      try {
        const response = await fetch('/api/tables');
        if (!response.ok) {
          throw new Error('Failed to fetch tables');
        }
        const result = await response.json();
        if (result.success) {
          setTables(result.data);
        } else {
          throw new Error(result.message || 'Failed to fetch tables');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchTables();
  }, []);

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableName.trim()) return;

    setCreating(true);
    setCreateError(null);
    
    try {
      const response = await fetch('/api/tables', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newTableName }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setTables([...tables, result.data]);
        setNewTableName(''); 
      } else {
        throw new Error(result.message || 'Failed to create table');
      }
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteTable = async (tableId: string) => {
    setDeleting(true);
    setDeleteError(null);
    
    try {
      const response = await fetch(`/api/tables/${tableId}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Remove the table from the state
        setTables(tables.filter(table => table._id !== tableId));
        setShowDeleteConfirm(null);
      } else {
        throw new Error(result.message || 'Failed to delete table');
      }
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-10">Loading tables...</div>;
  }

  if (error) {
    return <div className="text-center py-10 text-red-500">Error: {error}</div>;
  }

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Your Tables</h1>
        
        <form onSubmit={handleCreateTable} className="mt-4 sm:mt-0 sm:flex">
          <input
            type="text"
            placeholder="New table name"
            className="block w-full sm:w-64 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            value={newTableName}
            onChange={(e) => setNewTableName(e.target.value)}
            disabled={creating}
          />
          <button
            type="submit"
            className="mt-2 sm:mt-0 sm:ml-3 inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            disabled={creating || !newTableName.trim()}
          >
            {creating ? 'Creating...' : 'Create Table'}
          </button>
        </form>
      </div>
      
      {createError && (
        <div className="rounded-md bg-red-50 p-4 mb-6">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error creating table</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{createError}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {tables.length === 0 ? (
        <div className="rounded-md bg-yellow-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">No tables found</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>Create your first table to get started.</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {tables.map((table) => (
              <li key={table._id} className="hover:bg-gray-50">
                <div className="px-4 py-4 sm:px-6 flex items-center justify-between">
                  <Link href={`/tables/${table._id}`} className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-blue-600 truncate">
                        {table.name}
                      </div>
                      <div className="ml-2 flex-shrink-0 flex">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          View Table
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 flex justify-between">
                      <div className="sm:flex">
                        <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                          Created {new Date(table.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </Link>
                  <div className="ml-4">
                    <button
                      onClick={() => setShowDeleteConfirm(table._id)}
                      className="px-3 py-2 border border-transparent text-xs rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Deletion</h3>
            <p className="text-sm text-gray-500 mb-4">
              Are you sure you want to delete this table? This action will also delete all entries in this table and cannot be undone.
            </p>
            
            {deleteError && (
              <div className="mb-4 rounded-md bg-red-50 p-3">
                <p className="text-sm text-red-700">{deleteError}</p>
              </div>
            )}
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteTable(showDeleteConfirm)}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete Table'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 