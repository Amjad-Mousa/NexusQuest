import { useState, useEffect } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import { Button } from '../ui/button';
import { Task, TaskDifficulty, TaskLanguage, TestCase, createTask, updateTask } from '../../services/taskService';

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
  const [testCases, setTestCases] = useState<TestCase[]>([]);
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
      setTestCases(task.testCases || []);
    }
  }, [task]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const payload = { title, description, points, difficulty, language, starterCode, solution, testCases };
      if (task) {
        await updateTask(task._id, payload);
      } else {
        await createTask(payload);
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
      <div className={`w-full max-w-2xl max-h-[90vh] rounded-xl ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'} shadow-2xl flex flex-col`}>
        <div className={`flex items-center justify-between p-4 border-b flex-shrink-0 ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
          <h2 className="text-xl font-semibold">{task ? 'Edit Task' : 'Create New Task'}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-800"><X className="w-5 h-5" /></button>
        </div>
        {/* Scrollable content area */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto flex-1">
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

          {/* Test cases configuration */}
          <div>
            <label className="block text-sm font-medium mb-2">Test Cases</label>
            <p className={`text-xs mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Each test case is run against the student's solution. Hidden test cases are not shown to students.
              For the <span className="font-semibold">Input (stdin)</span> field you can:
              
              - Put <span className="font-semibold">multiple values</span> on separate lines (e.g. <code>5</code> then <code>3</code> on the next line).
              - Pass arrays or objects using <span className="font-semibold">JSON</span>, for example <code>[1, 2, 3]</code> or <code>{'{"a": 1, "b": 2}'}</code>.
              
              The student's program will receive exactly this text on standard input.
            </p>
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {testCases.map((tc, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border text-xs flex flex-col gap-2 ${
                    theme === 'dark' ? 'border-gray-700 bg-gray-900/60' : 'border-gray-300 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Test #{index + 1}</span>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={tc.isHidden}
                          onChange={e => {
                            const next = [...testCases];
                            next[index] = { ...next[index], isHidden: e.target.checked };
                            setTestCases(next);
                          }}
                        />
                        <span>Hidden</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setTestCases(prev => prev.filter((_, i) => i !== index));
                        }}
                        className={`text-xs px-2 py-1 rounded ${
                          theme === 'dark' ? 'bg-red-500/10 text-red-300 hover:bg-red-500/20' : 'bg-red-100 text-red-700 hover:bg-red-200'
                        }`}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="mb-1 font-medium">Input (stdin)</div>
                      <textarea
                        value={tc.input}
                        onChange={e => {
                          const next = [...testCases];
                          next[index] = { ...next[index], input: e.target.value };
                          setTestCases(next);
                        }}
                        className={`${inputClass} font-mono text-[11px] min-h-[60px]`}
                        placeholder={"Example: 5\\n3"}
                      />
                    </div>
                    <div>
                      <div className="mb-1 font-medium">Expected Output</div>
                      <textarea
                        value={tc.expectedOutput}
                        onChange={e => {
                          const next = [...testCases];
                          next[index] = { ...next[index], expectedOutput: e.target.value };
                          setTestCases(next);
                        }}
                        className={`${inputClass} font-mono text-[11px] min-h-[60px]`}
                        placeholder={"Example: 8"}
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}
              {testCases.length === 0 && (
                <div className={`text-xs italic ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                  No test cases yet. Add at least one to enable automatic checking.
                </div>
              )}
            </div>
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={() =>
                  setTestCases(prev => [...prev, { input: '', expectedOutput: '', isHidden: false }])
                }
                className={`text-xs px-3 py-1 rounded border ${
                  theme === 'dark'
                    ? 'border-gray-600 text-gray-200 hover:bg-gray-800'
                    : 'border-gray-300 text-gray-800 hover:bg-gray-100'
                }`}
              >
                + Add Test Case
              </button>
            </div>
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

