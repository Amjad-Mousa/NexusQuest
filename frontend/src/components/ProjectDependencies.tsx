import React, { useState, useEffect } from 'react';
import { Upload, Trash2, Package, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import axios from 'axios';
import { getAuthHeaders, getApiUrl } from '../utils';

interface CustomLibrary {
  _id: string;
  fileName: string;
  originalName: string;
  fileType: string;
  size: number;
  uploadedAt: string;
}

interface ProjectDependenciesProps {
  projectId: string;
  language: string;
  dependencies?: Record<string, string>;
  theme?: 'dark' | 'light';
  onDependenciesChange?: (deps: Record<string, string>) => void;
}

const ProjectDependencies: React.FC<ProjectDependenciesProps> = ({
  projectId,
  language,
  dependencies = {},
  theme = 'dark',
  onDependenciesChange
}) => {
  const [libraries, setLibraries] = useState<CustomLibrary[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newDep, setNewDep] = useState({ name: '', version: '' });
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadLibraries();
  }, [projectId]);

  const loadLibraries = async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders() as Record<string, string>;
      const response = await axios.get(`${getApiUrl()}/api/projects/${projectId}/libraries`, {
        headers,
      });
      setLibraries(response.data.libraries || []);
    } catch (err: any) {
      console.error('Failed to load libraries:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedExtensions = ['.jar', '.whl', '.so', '.dll', '.dylib', '.a', '.lib', '.tar.gz', '.zip'];
    
    if (!allowedExtensions.some(allowed => file.name.toLowerCase().endsWith(allowed))) {
      setError(`File type not allowed. Allowed types: ${allowedExtensions.join(', ')}`);
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setError('File size must be less than 50MB');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setSuccess(null);

      const formData = new FormData();
      formData.append('library', file);

      const headers = getAuthHeaders() as Record<string, string>;
      headers['Content-Type'] = 'multipart/form-data';

      await axios.post(
        `${getApiUrl()}/api/projects/${projectId}/libraries`,
        formData,
        { headers }
      );

      setSuccess(`Successfully uploaded ${file.name}`);
      await loadLibraries();
      event.target.value = '';
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to upload library');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteLibrary = async (libraryId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;

    try {
      setError(null);
      const headers = getAuthHeaders() as Record<string, string>;
      await axios.delete(`${getApiUrl()}/api/projects/${projectId}/libraries/${libraryId}`, {
        headers,
      });
      setSuccess(`Successfully deleted ${name}`);
      await loadLibraries();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete library');
    }
  };

  const handleSyncInstall = async () => {
    try {
      setSyncing(true);
      setError(null);
      setSuccess(null);
      const resp = await fetch(`${getApiUrl()}/api/projects/${projectId}/dependencies/sync`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      let data: any;
      try {
        const ct = resp.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          data = await resp.json();
        } else {
          const text = await resp.text();
          throw new Error(text || 'Unexpected non-JSON response from server');
        }
      } catch (e: any) {
        throw new Error(e?.message || 'Failed to parse server response');
      }
      if (data.success) {
        setSuccess(data.usedCache ? 'Using cached dependencies' : 'Dependencies installed');
      } else {
        setError(data.error || 'Failed to sync dependencies');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sync dependencies');
    } finally {
      setSyncing(false);
    }
  };

  const handleClearCache = async () => {
    if (!confirm('This will force reinstallation of all dependencies on next run. Continue?')) return;

    try {
      setError(null);
      const headers = getAuthHeaders() as Record<string, string>;
      await axios.post(`${getApiUrl()}/api/projects/${projectId}/dependencies/clear-cache`, {}, {
        headers,
      });
      setSuccess('Dependency cache cleared successfully');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to clear cache');
    }
  };

  const handleAddDependency = () => {
    if (!newDep.name.trim()) return;

    const updated = {
      ...dependencies,
      [newDep.name.trim()]: newDep.version.trim() || '*'
    };

    onDependenciesChange?.(updated);
    setNewDep({ name: '', version: '' });
  };

  const handleRemoveDependency = (name: string) => {
    const updated = { ...dependencies };
    delete updated[name];
    onDependenciesChange?.(updated);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getPackageManagerName = () => {
    switch (language) {
      case 'python': return 'pip';
      case 'javascript': return 'npm';
      case 'java': return 'Maven';
      case 'cpp': return 'Conan';
      default: return 'Package Manager';
    }
  };

  const getLibraryTypeHelp = () => {
    switch (language) {
      case 'python': return '.whl (wheel files)';
      case 'javascript': return '.tar.gz (npm packages)';
      case 'java': return '.jar (Java archives)';
      case 'cpp': return '.so, .a (shared/static libraries)';
      default: return 'library files';
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className={`flex items-start gap-3 p-4 border rounded-lg mb-4 ${
          theme === 'dark'
            ? 'bg-red-900/20 border-red-800 text-red-400'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
            theme === 'dark' ? 'text-red-400' : 'text-red-600'
          }`} />
          <div className="flex-1">
            <p className="text-sm">{error}</p>
          </div>
          <button onClick={() => setError(null)} className={`${
            theme === 'dark' ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-800'
          }`}>
            ×
          </button>
        </div>
      )}

      {success && (
        <div className={`flex items-start gap-3 p-4 border rounded-lg mb-4 ${
          theme === 'dark'
            ? 'bg-green-900/20 border-green-800 text-green-400'
            : 'bg-green-50 border-green-200 text-green-800'
        }`}>
          <CheckCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
            theme === 'dark' ? 'text-green-400' : 'text-green-600'
          }`} />
          <div className="flex-1">
            <p className="text-sm">{success}</p>
          </div>
          <button onClick={() => setSuccess(null)} className={`${
            theme === 'dark' ? 'text-green-400 hover:text-green-300' : 'text-green-600 hover:text-green-800'
          }`}>
            ×
          </button>
        </div>
      )}

      <div className={`rounded-lg shadow-sm border p-6 ${
        theme === 'dark'
          ? 'bg-gray-800/50 border-gray-700'
          : 'bg-white border-gray-200'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Package className={`w-5 h-5 ${
              theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'
            }`} />
            <h3 className={`text-lg font-semibold ${
              theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
            }`}>Package Dependencies</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncInstall}
              disabled={language !== 'javascript' || syncing}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                language !== 'javascript' || syncing
                  ? 'opacity-50 cursor-not-allowed'
                  : ''
              } ${
                theme === 'dark'
                  ? 'text-emerald-300 hover:text-emerald-200 hover:bg-emerald-900/20'
                  : 'text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100'
              }`}
              title={language !== 'javascript' ? 'Only JavaScript projects support package syncing' : 'Install or use cache for declared dependencies'}
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing…' : 'Install/Sync'}
            </button>
            <button
              onClick={handleClearCache}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                theme === 'dark'
                  ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
              title="Clear dependency cache and force reinstall"
            >
              <RefreshCw className="w-4 h-4" />
              Clear Cache
            </button>
          </div>
        </div>

        <p className={`text-sm mb-4 ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
        }`}>
          Manage {getPackageManagerName()} dependencies for your project. Dependencies are cached after first installation.
        </p>

        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Package name"
              value={newDep.name}
              onChange={(e) => setNewDep({ ...newDep, name: e.target.value })}
              className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              onKeyPress={(e) => e.key === 'Enter' && handleAddDependency()}
            />
            <input
              type="text"
              placeholder="Version (optional)"
              value={newDep.version}
              onChange={(e) => setNewDep({ ...newDep, version: e.target.value })}
              className={`w-32 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              onKeyPress={(e) => e.key === 'Enter' && handleAddDependency()}
            />
            <button
              onClick={handleAddDependency}
              disabled={!newDep.name.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Add
            </button>
          </div>

          {Object.keys(dependencies).length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {Object.entries(dependencies).map(([name, version]) => (
                <div
                  key={name}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-gray-700/50 border-gray-600'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Package className={`w-4 h-4 ${
                      theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                    }`} />
                    <span className={`font-medium ${
                      theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                    }`}>{name}</span>
                    <span className={`text-sm ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`}>{version}</span>
                  </div>
                  <button
                    onClick={() => handleRemoveDependency(name)}
                    className={`p-1.5 rounded transition-colors ${
                      theme === 'dark'
                        ? 'text-red-400 hover:bg-red-900/20'
                        : 'text-red-600 hover:bg-red-50'
                    }`}
                    title="Remove dependency"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className={`text-sm text-center py-4 ${
              theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
            }`}>
              No dependencies added yet
            </p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Upload className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-semibold text-gray-900">Custom Libraries</h3>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Upload custom library files ({getLibraryTypeHelp()}) that aren't available in package managers.
        </p>

        <div className="mb-4">
          <label className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-colors">
            <div className="text-center">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <span className="text-sm text-gray-600">
                {uploading ? 'Uploading...' : 'Click to upload or drag and drop'}
              </span>
              <p className="text-xs text-gray-500 mt-1">
                JAR, WHL, SO, DLL, or other library files (max 50MB)
              </p>
            </div>
            <input
              type="file"
              className="hidden"
              onChange={handleFileUpload}
              disabled={uploading}
              accept=".jar,.whl,.so,.dll,.dylib,.a,.lib,.tar.gz,.zip"
            />
          </label>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="text-sm text-gray-500 mt-2">Loading libraries...</p>
          </div>
        ) : libraries.length > 0 ? (
          <div className="space-y-2">
            {libraries.map((lib) => (
              <div
                key={lib._id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-shrink-0 w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <span className="text-xs font-semibold text-indigo-600 uppercase">
                      {lib.fileType}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{lib.originalName}</p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(lib.size)} • Uploaded {new Date(lib.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteLibrary(lib._id, lib.originalName)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                  title="Delete library"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Upload className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No custom libraries uploaded yet</p>
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">How it works:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li>Dependencies are installed once and cached for future runs</li>
              <li>Custom libraries are automatically included in your project's classpath/path</li>
              <li>Clear cache if you need to force reinstallation</li>
              <li>Changes to dependencies will trigger automatic reinstallation</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDependencies;
