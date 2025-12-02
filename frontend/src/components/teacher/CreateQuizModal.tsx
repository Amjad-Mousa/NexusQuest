import { useState, useEffect } from 'react';
import { X, Eye, EyeOff, Calendar, Clock } from 'lucide-react';
import { Button } from '../ui/button';
import { Quiz, QuizDifficulty, QuizLanguage, TestCase, createQuiz, updateQuiz } from '../../services/quizService';

interface CreateQuizModalProps {
  quiz: Quiz | null;
  onClose: () => void;
  onSave: () => void;
  theme: 'dark' | 'light';
}

export default function CreateQuizModal({ quiz, onClose, onSave, theme }: CreateQuizModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState(10);
  const [difficulty, setDifficulty] = useState<QuizDifficulty>('easy');
  const [language, setLanguage] = useState<QuizLanguage>('python');
  const [starterCode, setStarterCode] = useState('');
  const [solution, setSolution] = useState('');
  const [showSolution, setShowSolution] = useState(false);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [duration, setDuration] = useState(30);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (quiz) {
      setTitle(quiz.title);
      setDescription(quiz.description);
      setPoints(quiz.points);
      setDifficulty(quiz.difficulty);
      setLanguage(quiz.language);
      setStarterCode(quiz.starterCode || '');
      setSolution(quiz.solution || '');
      setTestCases(quiz.testCases || []);
      setStartTime(formatDateTimeLocal(quiz.startTime));
      setEndTime(formatDateTimeLocal(quiz.endTime));
      setDuration(quiz.duration);
    } else {
      // Default to starting in 1 hour, ending in 2 hours
      const now = new Date();
      const start = new Date(now.getTime() + 60 * 60 * 1000);
      const end = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      setStartTime(formatDateTimeLocal(start.toISOString()));
      setEndTime(formatDateTimeLocal(end.toISOString()));
    }
  }, [quiz]);

  function formatDateTimeLocal(isoString: string): string {
    const date = new Date(isoString);
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60 * 1000);
    return localDate.toISOString().slice(0, 16);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (testCases.length === 0) {
      setError('At least one test case is required');
      return;
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
      setError('End time must be after start time');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        title,
        description,
        points,
        difficulty,
        language,
        starterCode,
        solution,
        testCases,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        duration,
      };

      if (quiz) {
        await updateQuiz(quiz._id, payload);
      } else {
        await createQuiz(payload);
      }
      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save quiz');
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
          <h2 className="text-xl font-semibold">{quiz ? 'Edit Quiz' : 'Create New Quiz'}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-800"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto flex-1">
          {error && <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">{error}</div>}

          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} className={inputClass} placeholder="Quiz title" required minLength={3} maxLength={100} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} className={`${inputClass} min-h-[80px]`} placeholder="Describe the quiz..." required minLength={10} maxLength={5000} />
          </div>

          {/* Schedule Section */}
          <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-400" />
              Schedule
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Start Time</label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">End Time</label>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Duration (min)
                </label>
                <input
                  type="number"
                  value={duration}
                  onChange={e => setDuration(Number(e.target.value))}
                  className={inputClass}
                  min={1}
                  max={480}
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Points</label>
              <input type="number" value={points} onChange={e => setPoints(Number(e.target.value))} className={inputClass} min={1} max={1000} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Difficulty</label>
              <select value={difficulty} onChange={e => setDifficulty(e.target.value as QuizDifficulty)} className={inputClass}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Language</label>
              <select value={language} onChange={e => setLanguage(e.target.value as QuizLanguage)} className={inputClass}>
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Starter Code (optional)</label>
            <textarea value={starterCode} onChange={e => setStarterCode(e.target.value)} className={`${inputClass} font-mono text-sm min-h-[100px]`} placeholder="# Starter code for the quiz..." />
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
                className={`${inputClass} font-mono text-sm min-h-[120px]`}
                placeholder="# Write the correct solution here..."
              />
            )}
            {!showSolution && solution && (
              <div className={`px-3 py-2 rounded-lg text-sm ${theme === 'dark' ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                ✓ Solution saved ({solution.split('\n').length} lines)
              </div>
            )}
          </div>

          {/* Test Cases */}
          <div>
            <label className="block text-sm font-medium mb-2">Test Cases</label>
            <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
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
                        onClick={() => setTestCases(prev => prev.filter((_, i) => i !== index))}
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
                        className={`${inputClass} font-mono text-[11px] min-h-[50px]`}
                        placeholder="Example: 5\n3"
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
                        className={`${inputClass} font-mono text-[11px] min-h-[50px]`}
                        placeholder="Example: 8"
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}
              {testCases.length === 0 && (
                <div className={`text-xs italic ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                  No test cases yet. Add at least one.
                </div>
              )}
            </div>
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setTestCases(prev => [...prev, { input: '', expectedOutput: '', isHidden: false }])}
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
              {saving ? 'Saving...' : quiz ? 'Update Quiz' : 'Create Quiz'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
