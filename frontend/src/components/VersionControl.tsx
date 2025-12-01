import { useState, useEffect } from 'react';
import { GitBranch, History, RotateCcw, Eye, ChevronDown, ChevronRight, Clock, FileCode } from 'lucide-react';
import {
  getFileSnapshots,
  getProjectVersions,
  getSnapshot,
  restoreSnapshot,
  compareSnapshots,
  formatRelativeTime,
  Snapshot,
  FileVersionInfo,
  DiffLine,
} from '../services/versionService';

interface VersionControlProps {
  theme: string;
  projectId: string | null;
  currentFileId: string | null;
  currentFileName: string | null;
  onRestore: (content: string, fileId: string, fileName: string) => void;
}

export function VersionControl({
  theme,
  projectId,
  currentFileId,
  currentFileName,
  onRestore,
}: VersionControlProps) {
  const [activeTab, setActiveTab] = useState<'history' | 'diff'>('history');
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [projectFiles, setProjectFiles] = useState<FileVersionInfo[]>([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(null);
  const [compareSnapshot1, setCompareSnapshot1] = useState<string | null>(null);
  const [compareSnapshot2, setCompareSnapshot2] = useState<string | null>(null);
  const [diffResult, setDiffResult] = useState<DiffLine[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [previewContent, setPreviewContent] = useState<string | null>(null);

  // Load snapshots when file changes
  useEffect(() => {
    if (projectId && currentFileId) {
      loadFileSnapshots();
    } else if (projectId) {
      loadProjectVersions();
    }
  }, [projectId, currentFileId]);

  const loadFileSnapshots = async () => {
    if (!projectId || !currentFileId) return;
    setLoading(true);
    try {
      const data = await getFileSnapshots(projectId, currentFileId);
      setSnapshots(data);
    } catch (error) {
      console.error('Failed to load snapshots:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProjectVersions = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const data = await getProjectVersions(projectId);
      setProjectFiles(data);
    } catch (error) {
      console.error('Failed to load project versions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async (snapshotId: string) => {
    try {
      const snapshot = await getSnapshot(snapshotId);
      setSelectedSnapshot(snapshot);
      setPreviewContent(snapshot.content || null);
    } catch (error) {
      console.error('Failed to load snapshot:', error);
    }
  };

  const handleRestore = async (snapshotId: string) => {
    try {
      const { content, fileId, fileName } = await restoreSnapshot(snapshotId);
      onRestore(content, fileId, fileName);
      setPreviewContent(null);
      setSelectedSnapshot(null);
    } catch (error) {
      console.error('Failed to restore snapshot:', error);
    }
  };

  const handleCompare = async () => {
    if (!compareSnapshot1 || !compareSnapshot2) return;
    try {
      const result = await compareSnapshots(compareSnapshot1, compareSnapshot2);
      setDiffResult(result.diff);
    } catch (error) {
      console.error('Failed to compare snapshots:', error);
    }
  };

  const toggleFileExpand = (fileId: string) => {
    setExpandedFiles(prev => {
      const next = new Set(prev);
      if (next.has(fileId)) {
        next.delete(fileId);
      } else {
        next.add(fileId);
      }
      return next;
    });
  };

  const isDark = theme === 'dark';

  if (!projectId) {
    return (
      <div className={`h-full flex items-center justify-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
        <div className="text-center">
          <GitBranch className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Open a project to view version history</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col ${isDark ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-900'}`}>
      {/* Header */}
      <div className={`flex items-center gap-2 px-3 py-2 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
        <GitBranch className="w-4 h-4 text-purple-400" />
        <span className="text-sm font-medium">Version Control</span>
        {currentFileName && (
          <span className={`text-xs px-2 py-0.5 rounded ${isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
            {currentFileName}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className={`flex border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 px-3 py-2 text-xs font-medium flex items-center justify-center gap-1 ${
            activeTab === 'history'
              ? isDark ? 'text-purple-400 border-b-2 border-purple-400' : 'text-purple-600 border-b-2 border-purple-600'
              : isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <History className="w-3 h-3" /> History
        </button>
        <button
          onClick={() => setActiveTab('diff')}
          className={`flex-1 px-3 py-2 text-xs font-medium flex items-center justify-center gap-1 ${
            activeTab === 'diff'
              ? isDark ? 'text-purple-400 border-b-2 border-purple-400' : 'text-purple-600 border-b-2 border-purple-600'
              : isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Eye className="w-3 h-3" /> Compare
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full" />
          </div>
        ) : activeTab === 'history' ? (
          <div className="p-2">
            {currentFileId ? (
              // File-specific history
              snapshots.length === 0 ? (
                <div className={`text-center py-8 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  <Clock className="w-6 h-6 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">No snapshots yet</p>
                  <p className="text-xs opacity-75">Save the file to create a snapshot</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {snapshots.map((snapshot, index) => (
                    <div
                      key={snapshot._id}
                      className={`p-2 rounded-lg ${isDark ? 'bg-gray-800 hover:bg-gray-750' : 'bg-gray-50 hover:bg-gray-100'} transition-colors`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                              index === 0
                                ? 'bg-green-500/20 text-green-400'
                                : isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-600'
                            }`}>
                              {index === 0 ? 'latest' : `v${snapshots.length - index}`}
                            </span>
                            <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                              {formatRelativeTime(snapshot.createdAt)}
                            </span>
                          </div>
                          <p className={`text-xs mt-1 truncate ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                            {snapshot.message}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <button
                            onClick={() => handlePreview(snapshot._id)}
                            className={`p-1 rounded ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
                            title="Preview"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-400" />
                          </button>
                          <button
                            onClick={() => handleRestore(snapshot._id)}
                            className={`p-1 rounded ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
                            title="Restore"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-orange-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              // Project overview
              projectFiles.length === 0 ? (
                <div className={`text-center py-8 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  <FileCode className="w-6 h-6 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">No version history</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {projectFiles.map((file) => (
                    <div
                      key={file.fileId}
                      className={`rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}
                    >
                      <button
                        onClick={() => toggleFileExpand(file.fileId)}
                        className={`w-full p-2 flex items-center gap-2 text-left ${isDark ? 'hover:bg-gray-750' : 'hover:bg-gray-100'}`}
                      >
                        {expandedFiles.has(file.fileId) ? (
                          <ChevronDown className="w-3 h-3" />
                        ) : (
                          <ChevronRight className="w-3 h-3" />
                        )}
                        <FileCode className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-xs flex-1 truncate">{file.fileName}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-600'}`}>
                          {file.snapshotCount} versions
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        ) : (
          // Diff tab
          <div className="p-2">
            <div className="space-y-2 mb-3">
              <select
                value={compareSnapshot1 || ''}
                onChange={(e) => setCompareSnapshot1(e.target.value || null)}
                className={`w-full text-xs p-2 rounded ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} border`}
              >
                <option value="">Select older version...</option>
                {snapshots.map((s, i) => (
                  <option key={s._id} value={s._id}>
                    v{snapshots.length - i} - {formatRelativeTime(s.createdAt)}
                  </option>
                ))}
              </select>
              <select
                value={compareSnapshot2 || ''}
                onChange={(e) => setCompareSnapshot2(e.target.value || null)}
                className={`w-full text-xs p-2 rounded ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} border`}
              >
                <option value="">Select newer version...</option>
                {snapshots.map((s, i) => (
                  <option key={s._id} value={s._id}>
                    v{snapshots.length - i} - {formatRelativeTime(s.createdAt)}
                  </option>
                ))}
              </select>
              <button
                onClick={handleCompare}
                disabled={!compareSnapshot1 || !compareSnapshot2}
                className={`w-full text-xs py-2 rounded font-medium ${
                  compareSnapshot1 && compareSnapshot2
                    ? 'bg-purple-500 hover:bg-purple-600 text-white'
                    : isDark ? 'bg-gray-800 text-gray-500' : 'bg-gray-100 text-gray-400'
                }`}
              >
                Compare Versions
              </button>
            </div>

            {diffResult && (
              <div className={`rounded-lg overflow-hidden border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className={`text-xs font-mono overflow-x-auto max-h-64 ${isDark ? 'bg-gray-950' : 'bg-gray-50'}`}>
                  {diffResult.map((line, i) => (
                    <div
                      key={i}
                      className={`px-2 py-0.5 ${
                        line.type === 'added'
                          ? 'bg-green-500/20 text-green-400'
                          : line.type === 'removed'
                          ? 'bg-red-500/20 text-red-400'
                          : isDark ? 'text-gray-400' : 'text-gray-600'
                      }`}
                    >
                      <span className="inline-block w-6 text-right mr-2 opacity-50">{line.lineNum}</span>
                      <span className="mr-2">{line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}</span>
                      {line.line}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewContent !== null && selectedSnapshot && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`w-[90%] max-w-2xl max-h-[80%] rounded-xl overflow-hidden ${isDark ? 'bg-gray-900' : 'bg-white'} shadow-2xl flex flex-col`}>
            <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <div>
                <h3 className="font-medium text-sm">Preview: {selectedSnapshot.fileName}</h3>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {formatRelativeTime(selectedSnapshot.createdAt)} - {selectedSnapshot.message}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleRestore(selectedSnapshot._id)}
                  className="px-3 py-1.5 text-xs bg-orange-500 hover:bg-orange-600 text-white rounded-lg flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Restore
                </button>
                <button
                  onClick={() => { setPreviewContent(null); setSelectedSnapshot(null); }}
                  className={`px-3 py-1.5 text-xs rounded-lg ${isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}
                >
                  Close
                </button>
              </div>
            </div>
            <div className={`flex-1 overflow-auto p-4 font-mono text-xs ${isDark ? 'bg-gray-950' : 'bg-gray-50'}`}>
              <pre className="whitespace-pre-wrap">{previewContent}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
