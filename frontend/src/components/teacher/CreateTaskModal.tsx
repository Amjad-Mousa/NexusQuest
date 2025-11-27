import { useState, useEffect } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import { Button } from '../ui/button';
import { Task, TaskDifficulty, TaskLanguage, createTask, updateTask } from '../../services/taskService';

interface CreateTaskModalProps {
  task: Task | null;
  onClose: () => void;
  onSave: () => void;
  theme: 'dark' | 'light';
}

export default function CreateTaskModal({ task, onClose, onSave, theme }: CreateTaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState(10);
  const [difficulty, setDifficulty] = useState<TaskDifficulty>('easy');
  const [language, setLanguage] = useState<TaskLanguage>('python');
  const [starterCode, setStarterCode] = useState('');
  const [solution, setSolution] = useState('');
  const [showSolution, setShowSolution] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description);
      setPoints(task.points);
      setDifficulty(task.difficulty);
      setLanguage(task.language);
      setStarterCode(task.starterCode || '');
      setSolution(task.solution || '');
    }
  }, [task]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      if (task) {
        await updateTask(task._id, { title, description, points, difficulty, language, starterCode, solution });
      } else {
        await createTask({ title, description, points, difficulty, language, starterCode, solution });
      }
      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = `w-full px-3 py-2 rounded-lg border ${
    theme === 'dark'
      ? 'bg-gray-800 border-gray-700 text-white focus:border-blue-500'
      : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
  } outline-none transition-colors`;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`w-full max-w-2xl rounded-xl ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'} shadow-2xl`}>
        <div className={`flex items-center justify-between p-4 border-b ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
          <h2 className="text-xl font-semibold">{task ? 'Edit Task' : 'Create New Task'}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-800"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">{error}</div>}

          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} className={inputClass} placeholder="Task title" required minLength={3} maxLength={100} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} className={`${inputClass} min-h-[100px]`} placeholder="Describe the task..." required minLength={10} maxLength={5000} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Points</label>
              <input type="number" value={points} onChange={e => setPoints(Number(e.target.value))} className={inputClass} min={1} max={1000} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Difficulty</label>
              <select value={difficulty} onChange={e => setDifficulty(e.target.value as TaskDifficulty)} className={inputClass}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Language</label>
              <select value={language} onChange={e => setLanguage(e.target.value as TaskLanguage)} className={inputClass}>
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Starter Code (optional)</label>
            <textarea value={starterCode} onChange={e => setStarterCode(e.target.value)} className={`${inputClass} font-mono text-sm min-h-[120px]`} placeholder="# Starter code for the task..." />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium">
                Correct Solution <span className="text-gray-500">(hidden from students)</span>
              </label>
              <button
                type="button"
                onClick={() => setShowSolution(!showSolution)}
                className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${
                  theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700 text-gray-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}
              >
                {showSolution ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                {showSolution ? 'Hide' : 'Show'}
              </button>
            </div>
            {showSolution && (
              <textarea
                value={solution}
                onChange={e => setSolution(e.target.value)}
                className={`${inputClass} font-mono text-sm min-h-[150px]`}
                placeholder="# Write the correct solution here..."
              />
            )}
            {!showSolution && solution && (
              <div className={`px-3 py-2 rounded-lg text-sm ${theme === 'dark' ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                ✓ Solution saved ({solution.split('\n').length} lines)
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={saving}>
              {saving ? 'Saving...' : task ? 'Update Task' : 'Create Task'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

