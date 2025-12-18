import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { Button } from '../components/ui/button';
import {
  getProjectSnapshots,
  getProjectSnapshot,
  compareProjectSnapshots,
  deleteProjectSnapshot,
  restoreProjectSnapshot,
  formatRelativeTime,
  ProjectSnapshotInfo,
  ProjectSnapshotFull,
  FileDiff,
} from '../services/versionService';
import {
  ArrowLeft,
  Camera,
  Clock,
  FileCode,
  GitCompare,
  Trash2,
  RotateCcw,
  ChevronRight,
  Plus,
  Minus,
  File,
  FolderOpen,
  X,
  Eye,
  Loader2,
} from 'lucide-react';

export default function SnapshotsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();

  const [snapshots, setSnapshots] = useState<ProjectSnapshotInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSnapshot, setSelectedSnapshot] = useState<ProjectSnapshotFull | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareSnapshot1, setCompareSnapshot1] = useState<string | null>(null);
  const [compareSnapshot2, setCompareSnapshot2] = useState<string | null>(null);
  const [comparisonResult, setComparisonResult] = useState<{
    fileDiffs: FileDiff[];
    snapshot1: ProjectSnapshotInfo;
    snapshot2: ProjectSnapshotInfo;
  } | null>(null);
  const [selectedFileDiff, setSelectedFileDiff] = useState<FileDiff | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: 'restore' | 'delete';
    snapshotId: string;
    snapshotName: string;
  } | null>(null);

  useEffect(() => {
    if (projectId) {
      loadSnapshots();
    }
  }, [projectId]);

  const loadSnapshots = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const data = await getProjectSnapshots(projectId);
      setSnapshots(data);
    } catch (error) {
      console.error('Failed to load snapshots:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewSnapshot = async (snapshotId: string) => {
    setLoadingAction(snapshotId);
    try {
      const snapshot = await getProjectSnapshot(snapshotId);
      setSelectedSnapshot(snapshot);
    } catch (error) {
      console.error('Failed to load snapshot:', error);
    } finally {
      setLoadingAction(null);
    }
  };

  const openConfirmDialog = (type: 'restore' | 'delete', snapshotId: string, snapshotName: string) => {
    setConfirmDialog({ isOpen: true, type, snapshotId, snapshotName });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog(null);
  };

  const handleConfirmAction = async () => {
    if (!confirmDialog) return;
    
    const { type, snapshotId } = confirmDialog;
    setLoadingAction(snapshotId);
    closeConfirmDialog();
    
    try {
      if (type === 'delete') {
        await deleteProjectSnapshot(snapshotId);
        setSnapshots(prev => prev.filter(s => s._id !== snapshotId));
      } else if (type === 'restore') {
        const result = await restoreProjectSnapshot(snapshotId);
        navigate(`/playground/${projectId}`, { 
          state: { restoredFiles: result.files, snapshotName: result.name } 
        });
      }
    } catch (error) {
      console.error(`Failed to ${type} snapshot:`, error);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleCompare = async () => {
    if (!compareSnapshot1 || !compareSnapshot2) return;
    setLoadingAction('compare');
    try {
      const result = await compareProjectSnapshots(compareSnapshot1, compareSnapshot2);
      setComparisonResult(result);
    } catch (error) {
      console.error('Failed to compare snapshots:', error);
    } finally {
      setLoadingAction(null);
    }
  };

  const toggleCompareMode = () => {
    setCompareMode(!compareMode);
    setCompareSnapshot1(null);
    setCompareSnapshot2(null);
    setComparisonResult(null);
    setSelectedFileDiff(null);
  };

  const handleSelectForCompare = (snapshotId: string) => {
    if (!compareSnapshot1) {
      setCompareSnapshot1(snapshotId);
    } else if (!compareSnapshot2 && snapshotId !== compareSnapshot1) {
      setCompareSnapshot2(snapshotId);
    } else if (snapshotId === compareSnapshot1) {
      setCompareSnapshot1(compareSnapshot2);
      setCompareSnapshot2(null);
    } else if (snapshotId === compareSnapshot2) {
      setCompareSnapshot2(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'added': return 'text-green-500';
      case 'removed': return 'text-red-500';
      case 'modified': return 'text-yellow-500';
      default: return theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'added': return theme === 'dark' ? 'bg-green-500/10' : 'bg-green-50';
      case 'removed': return theme === 'dark' ? 'bg-red-500/10' : 'bg-red-50';
      case 'modified': return theme === 'dark' ? 'bg-yellow-500/10' : 'bg-yellow-50';
      default: return '';
    }
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <div className={`border-b ${theme === 'dark' ? 'bg-gray-900/80 border-gray-800' : 'bg-white border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/playground/${projectId}`)}
                className={theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Editor
              </Button>
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-orange-500" />
                <h1 className="text-xl font-bold">Project Snapshots</h1>
              </div>
            </div>
            <Button
              onClick={toggleCompareMode}
              variant={compareMode ? 'default' : 'outline'}
              className={compareMode 
                ? 'bg-gradient-to-r from-blue-600 to-purple-600' 
                : theme === 'dark' ? 'border-gray-700' : 'border-gray-300'
              }
            >
              <GitCompare className="w-4 h-4 mr-2" />
              {compareMode ? 'Exit Compare' : 'Compare Snapshots'}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Compare Mode Header */}
        {compareMode && (
          <div className={`mb-6 p-4 rounded-xl border ${
            theme === 'dark' ? 'bg-blue-500/10 border-blue-500/30' : 'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <GitCompare className="w-5 h-5 text-blue-500" />
                <span className="font-medium">Select two snapshots to compare</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-lg text-sm ${
                    compareSnapshot1 
                      ? theme === 'dark' ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'
                      : theme === 'dark' ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {compareSnapshot1 ? snapshots.find(s => s._id === compareSnapshot1)?.name || 'Selected' : 'First'}
                  </span>
                  <ChevronRight className="w-4 h-4" />
                  <span className={`px-3 py-1 rounded-lg text-sm ${
                    compareSnapshot2 
                      ? theme === 'dark' ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-700'
                      : theme === 'dark' ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {compareSnapshot2 ? snapshots.find(s => s._id === compareSnapshot2)?.name || 'Selected' : 'Second'}
                  </span>
                </div>
                <Button
                  onClick={handleCompare}
                  disabled={!compareSnapshot1 || !compareSnapshot2 || loadingAction === 'compare'}
                  className="bg-gradient-to-r from-blue-600 to-purple-600"
                  size="sm"
                >
                  {loadingAction === 'compare' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Compare'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Comparison Result */}
        {comparisonResult && (
          <div className={`mb-8 rounded-xl border overflow-hidden ${
            theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
          }`}>
            <div className={`px-6 py-4 border-b ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <GitCompare className="w-5 h-5 text-blue-500" />
                  Comparison: {comparisonResult.snapshot1.name} → {comparisonResult.snapshot2.name}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setComparisonResult(null);
                    setSelectedFileDiff(null);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex gap-4 mt-2 text-sm">
                <span className="text-green-500">+{comparisonResult.fileDiffs.filter(f => f.status === 'added').length} added</span>
                <span className="text-red-500">-{comparisonResult.fileDiffs.filter(f => f.status === 'removed').length} removed</span>
                <span className="text-yellow-500">~{comparisonResult.fileDiffs.filter(f => f.status === 'modified').length} modified</span>
                <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>
                  {comparisonResult.fileDiffs.filter(f => f.status === 'unchanged').length} unchanged
                </span>
              </div>
            </div>

            <div className="flex">
              {/* File List */}
              <div className={`w-1/3 border-r ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
                <div className="max-h-96 overflow-y-auto">
                  {comparisonResult.fileDiffs.map((file) => (
                    <div
                      key={file.fileId}
                      onClick={() => file.status !== 'unchanged' && setSelectedFileDiff(file)}
                      className={`px-4 py-3 flex items-center gap-3 cursor-pointer transition-colors ${
                        selectedFileDiff?.fileId === file.fileId
                          ? theme === 'dark' ? 'bg-blue-500/20' : 'bg-blue-50'
                          : theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
                      } ${getStatusBg(file.status)}`}
                    >
                      <FileCode className={`w-4 h-4 ${getStatusColor(file.status)}`} />
                      <span className="flex-1 truncate text-sm">{file.fileName}</span>
                      <span className={`text-xs font-medium ${getStatusColor(file.status)}`}>
                        {file.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Diff View */}
              <div className="flex-1 p-4">
                {selectedFileDiff ? (
                  <div>
                    <h3 className="font-medium mb-3 flex items-center gap-2">
                      <FileCode className="w-4 h-4" />
                      {selectedFileDiff.fileName}
                    </h3>
                    {selectedFileDiff.diff ? (
                      <div className={`rounded-lg overflow-hidden border ${
                        theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
                      }`}>
                        <div className="max-h-64 overflow-y-auto font-mono text-sm">
                          {selectedFileDiff.diff.map((line, idx) => (
                            <div
                              key={idx}
                              className={`px-3 py-0.5 flex ${
                                line.type === 'added'
                                  ? theme === 'dark' ? 'bg-green-500/20 text-green-300' : 'bg-green-50 text-green-800'
                                  : line.type === 'removed'
                                  ? theme === 'dark' ? 'bg-red-500/20 text-red-300' : 'bg-red-50 text-red-800'
                                  : ''
                              }`}
                            >
                              <span className={`w-8 text-right mr-3 ${
                                theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                              }`}>
                                {line.lineNum}
                              </span>
                              <span className="w-4">
                                {line.type === 'added' && <Plus className="w-3 h-3" />}
                                {line.type === 'removed' && <Minus className="w-3 h-3" />}
                              </span>
                              <span className="flex-1 whitespace-pre">{line.line}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>
                        File was {selectedFileDiff.status}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 text-center">
                    <File className={`w-12 h-12 mb-3 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-300'}`} />
                    <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>
                      Select a modified file to view changes
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Snapshots List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : snapshots.length === 0 ? (
          <div className={`text-center py-20 rounded-2xl border-2 border-dashed ${
            theme === 'dark' ? 'border-gray-800 bg-gray-900/30' : 'border-gray-200 bg-gray-50'
          }`}>
            <Camera className={`w-16 h-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-300'}`} />
            <h3 className="text-xl font-bold mb-2">No Snapshots Yet</h3>
            <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>
              Create a snapshot from the editor to save your project state
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {snapshots.map((snapshot) => {
              const isSelected1 = compareSnapshot1 === snapshot._id;
              const isSelected2 = compareSnapshot2 === snapshot._id;
              const isSelected = isSelected1 || isSelected2;

              return (
                <div
                  key={snapshot._id}
                  onClick={() => compareMode && handleSelectForCompare(snapshot._id)}
                  className={`p-5 rounded-xl border transition-all ${
                    compareMode ? 'cursor-pointer' : ''
                  } ${
                    isSelected
                      ? isSelected1
                        ? theme === 'dark' ? 'bg-green-500/10 border-green-500/50' : 'bg-green-50 border-green-300'
                        : theme === 'dark' ? 'bg-purple-500/10 border-purple-500/50' : 'bg-purple-50 border-purple-300'
                      : theme === 'dark'
                      ? 'bg-gray-900 border-gray-800 hover:border-gray-700'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Camera className="w-5 h-5 text-orange-500" />
                      <h3 className="font-bold">{snapshot.name}</h3>
                    </div>
                    {isSelected && (
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        isSelected1 
                          ? 'bg-green-500 text-white' 
                          : 'bg-purple-500 text-white'
                      }`}>
                        {isSelected1 ? '1st' : '2nd'}
                      </span>
                    )}
                  </div>

                  {snapshot.description && (
                    <p className={`text-sm mb-3 line-clamp-2 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {snapshot.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-sm mb-4">
                    <div className={`flex items-center gap-1.5 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      <FolderOpen className="w-4 h-4" />
                      <span>{snapshot.filesCount} files</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      <Clock className="w-4 h-4" />
                      <span>{formatRelativeTime(snapshot.createdAt)}</span>
                    </div>
                  </div>

                  {!compareMode && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleViewSnapshot(snapshot._id)}
                        disabled={loadingAction === snapshot._id}
                        variant="outline"
                        size="sm"
                        className={`flex-1 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`}
                      >
                        {loadingAction === snapshot._id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => openConfirmDialog('restore', snapshot._id, snapshot.name)}
                        disabled={loadingAction === snapshot._id}
                        variant="outline"
                        size="sm"
                        className={`flex-1 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`}
                      >
                        <RotateCcw className="w-4 h-4 mr-1" />
                        Restore
                      </Button>
                      <Button
                        onClick={() => openConfirmDialog('delete', snapshot._id, snapshot.name)}
                        disabled={loadingAction === snapshot._id}
                        variant="outline"
                        size="sm"
                        className={`${
                          theme === 'dark'
                            ? 'border-gray-700 hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-400'
                            : 'border-gray-300 hover:bg-red-50 hover:border-red-300 hover:text-red-500'
                        }`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* View Snapshot Modal */}
      {selectedSnapshot && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-4xl max-h-[80vh] rounded-2xl overflow-hidden ${
            theme === 'dark' ? 'bg-gray-900' : 'bg-white'
          }`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between ${
              theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
            }`}>
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Camera className="w-5 h-5 text-orange-500" />
                  {selectedSnapshot.name}
                </h2>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  {selectedSnapshot.files.length} files • {formatRelativeTime(selectedSnapshot.createdAt)}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedSnapshot(null)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="overflow-y-auto max-h-[calc(80vh-80px)]">
              {selectedSnapshot.files.map((file) => (
                <div key={file.fileId} className={`border-b ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
                  <div className={`px-6 py-3 flex items-center gap-2 ${
                    theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-50'
                  }`}>
                    <FileCode className="w-4 h-4 text-orange-500" />
                    <span className="font-medium">{file.fileName}</span>
                  </div>
                  <pre className={`px-6 py-4 text-sm overflow-x-auto font-mono ${
                    theme === 'dark' ? 'bg-gray-950' : 'bg-gray-100'
                  }`}>
                    {file.content}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-md rounded-2xl overflow-hidden ${
            theme === 'dark' ? 'bg-gray-900' : 'bg-white'
          }`}>
            {/* Header */}
            <div className={`px-6 py-4 border-b ${
              theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${
                  confirmDialog.type === 'restore'
                    ? theme === 'dark' ? 'bg-orange-500/20' : 'bg-orange-100'
                    : theme === 'dark' ? 'bg-red-500/20' : 'bg-red-100'
                }`}>
                  {confirmDialog.type === 'restore' ? (
                    <RotateCcw className={`w-5 h-5 ${
                      theme === 'dark' ? 'text-orange-400' : 'text-orange-600'
                    }`} />
                  ) : (
                    <Trash2 className={`w-5 h-5 ${
                      theme === 'dark' ? 'text-red-400' : 'text-red-600'
                    }`} />
                  )}
                </div>
                <h2 className="text-lg font-bold">
                  {confirmDialog.type === 'restore' ? 'Restore Snapshot' : 'Delete Snapshot'}
                </h2>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-5">
              <p className={`mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                {confirmDialog.type === 'restore' ? (
                  <>
                    Are you sure you want to restore <span className="font-semibold text-orange-500">"{confirmDialog.snapshotName}"</span>?
                    <br />
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      This will replace all current files in your project with the files from this snapshot.
                    </span>
                  </>
                ) : (
                  <>
                    Are you sure you want to delete <span className="font-semibold text-red-500">"{confirmDialog.snapshotName}"</span>?
                    <br />
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      This action cannot be undone.
                    </span>
                  </>
                )}
              </p>

              {confirmDialog.type === 'restore' && (
                <div className={`p-3 rounded-lg mb-4 ${
                  theme === 'dark' ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-yellow-50 border border-yellow-200'
                }`}>
                  <p className={`text-sm flex items-start gap-2 ${
                    theme === 'dark' ? 'text-yellow-400' : 'text-yellow-700'
                  }`}>
                    <span className="text-lg">⚠️</span>
                    <span>Make sure to save your current work before restoring. Any unsaved changes will be lost.</span>
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className={`px-6 py-4 border-t flex justify-end gap-3 ${
              theme === 'dark' ? 'border-gray-800 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
            }`}>
              <Button
                variant="outline"
                onClick={closeConfirmDialog}
                className={theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmAction}
                className={
                  confirmDialog.type === 'restore'
                    ? 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500'
                    : 'bg-red-600 hover:bg-red-500'
                }
              >
                {confirmDialog.type === 'restore' ? (
                  <>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Restore Snapshot
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Snapshot
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
