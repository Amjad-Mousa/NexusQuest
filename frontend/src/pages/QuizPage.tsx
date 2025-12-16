import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Play, CheckCircle2, XCircle, Loader2, AlertTriangle, Trophy, RefreshCw, Maximize, ShieldAlert, Terminal } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useTheme } from '../context/ThemeContext';
import { Quiz, getQuiz, startQuiz, submitQuiz, QuizSubmitResponse, runTests, RunTestsResponse } from '../services/quizService';
import { usePageTitle } from '../hooks/usePageTitle';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:9876';

export default function QuizPage() {
  usePageTitle('Quiz');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [started, setStarted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuizSubmitResponse | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [violations, setViolations] = useState(0);
  const [showViolationWarning, setShowViolationWarning] = useState(false);
  const [violationMessage, setViolationMessage] = useState('');
  const [forceSubmitted, setForceSubmitted] = useState(false);
  const [runningTests, setRunningTests] = useState(false);
  const [testResults, setTestResults] = useState<RunTestsResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'problem' | 'testcases' | 'runconsole'>('problem');
  const [terminalLines, setTerminalLines] = useState<Array<{type: 'output' | 'error', content: string}>>([]);
  const [terminalInput, setTerminalInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isCodeRunning, setIsCodeRunning] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const isSubmittingRef = useRef(false);
  const quizContainerRef = useRef<HTMLDivElement>(null);
  
  // Refs to hold current values for event handlers
  const codeRef = useRef(code);
  const violationsRef = useRef(violations);
  const resultRef = useRef(result);
  const forceSubmittedRef = useRef(forceSubmitted);
  const startedRef = useRef(started);
  
  // Keep refs in sync with state
  useEffect(() => { codeRef.current = code; }, [code]);
  useEffect(() => { violationsRef.current = violations; }, [violations]);
  useEffect(() => { resultRef.current = result; }, [result]);
  useEffect(() => { forceSubmittedRef.current = forceSubmitted; }, [forceSubmitted]);
  useEffect(() => { startedRef.current = started; }, [started]);

  // Load quiz data
  const loadQuiz = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await getQuiz(id);
      setQuiz(data);
      setCode(data.starterCode || '');

      // Check if already started
      if (data.submission) {
        setStarted(true);
        // Only show final result if passed OR quiz has ended
        const quizEnded = new Date(data.endTime) < new Date();
        if (data.submission.status === 'passed' || quizEnded) {
          setResult({
            total: data.submission.totalTests,
            passed: data.submission.score,
            results: [],
            allPassed: data.submission.status === 'passed',
            pointsAwarded: data.submission.pointsAwarded,
            submission: data.submission,
          });
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load quiz');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadQuiz();
  }, [loadQuiz]);

  // Timer countdown
  useEffect(() => {
    if (!quiz || !started || result) return;

    const endTime = new Date(quiz.endTime).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
      setTimeRemaining(remaining);

      if (remaining === 0) {
        // Auto-submit when time runs out
        handleSubmit();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [quiz, started, result]);

  // Fullscreen functions
  const enterFullscreen = useCallback(async () => {
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if ((elem as any).webkitRequestFullscreen) {
        await (elem as any).webkitRequestFullscreen();
      } else if ((elem as any).msRequestFullscreen) {
        await (elem as any).msRequestFullscreen();
      }
      setIsFullscreen(true);
    } catch (err) {
      console.error('Failed to enter fullscreen:', err);
    }
  }, []);

  const exitFullscreen = useCallback(() => {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if ((document as any).webkitExitFullscreen) {
      (document as any).webkitExitFullscreen();
    } else if ((document as any).msExitFullscreen) {
      (document as any).msExitFullscreen();
    }
    setIsFullscreen(false);
  }, []);

  // Monitor fullscreen changes
  useEffect(() => {
    if (!started || result) return;

    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isCurrentlyFullscreen);
      
      if (!isCurrentlyFullscreen && started && !result) {
        // User exited fullscreen - count as violation
        setViolations(prev => prev + 1);
        setViolationMessage('⚠️ You exited fullscreen mode! You must return to continue.');
        setShowViolationWarning(true);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, [started, result]);

  // Force submit quiz and redirect - called when student tries to leave
  const forceSubmitAndRedirect = useCallback(async () => {
    // Use refs to get current values
    if (!id || isSubmittingRef.current || resultRef.current || forceSubmittedRef.current) return;
    
    console.log('🚨 FORCE SUBMIT TRIGGERED!');
    isSubmittingRef.current = true;
    forceSubmittedRef.current = true;
    setForceSubmitted(true);
    
    // Exit fullscreen first
    if (document.fullscreenElement) {
      try { document.exitFullscreen(); } catch (e) { /* ignore */ }
    }
    
    // Submit the quiz with forceSubmit flag (don't await - do it in background)
    submitQuiz(id, codeRef.current || '', true, violationsRef.current || 0)
      .then(() => console.log('✅ Quiz force submitted successfully'))
      .catch((err) => console.error('❌ Force submit failed:', err));
    
    // Redirect immediately using window.location for guaranteed redirect
    window.location.href = '/quizzes';
  }, [id]);

  // Monitor tab/window visibility changes - AUTO SUBMIT on tab switch
  useEffect(() => {
    if (!started) return;

    const handleVisibilityChange = () => {
      console.log('👁️ Visibility changed, hidden:', document.hidden);
      console.log('States - started:', startedRef.current, 'result:', resultRef.current, 'forceSubmitted:', forceSubmittedRef.current);
      
      if (document.hidden && startedRef.current && !resultRef.current && !forceSubmittedRef.current) {
        console.log('🚨 Tab switch detected! Force submitting and redirecting...');
        forceSubmitAndRedirect();
      }
    };

    const handleBlur = () => {
      console.log('👁️ Window blur detected');
      console.log('States - started:', startedRef.current, 'result:', resultRef.current, 'forceSubmitted:', forceSubmittedRef.current);
      
      if (startedRef.current && !resultRef.current && !forceSubmittedRef.current) {
        console.log('🚨 Window blur! Force submitting and redirecting...');
        forceSubmitAndRedirect();
      }
    };

    // Add listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    console.log('👂 Event listeners added for quiz protection');

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      console.log('👂 Event listeners removed');
    };
  }, [started, forceSubmitAndRedirect]);

  // Prevent keyboard shortcuts - but still submit if they manage to switch
  useEffect(() => {
    if (!started || result || forceSubmitted) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Block Escape to prevent exiting fullscreen
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setViolationMessage('⚠️ You cannot exit fullscreen mode!');
        setShowViolationWarning(true);
        setTimeout(() => setShowViolationWarning(false), 3000);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [started, result, forceSubmitted]);

  // Exit fullscreen when quiz ends or result is shown
  useEffect(() => {
    if (result && isFullscreen) {
      exitFullscreen();
    }
  }, [result, isFullscreen, exitFullscreen]);

  // Check if quiz was force submitted (prevent re-entry)
  useEffect(() => {
    if (quiz?.submission?.status === 'submitted' || quiz?.submission?.status === 'passed') {
      setForceSubmitted(true);
    }
  }, [quiz]);

  const handleStart = async () => {
    if (!id) return;
    try {
      // Enter fullscreen first
      await enterFullscreen();
      
      const { alreadyStarted } = await startQuiz(id);
      setStarted(true);
      if (!alreadyStarted) {
        // Reload to get fresh data
        await loadQuiz();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start quiz');
    }
  };

  const handleSubmit = async () => {
    if (!id || submitting) return;
    try {
      setSubmitting(true);
      const submitResult = await submitQuiz(id, code);
      
      // If all passed or canRetry is false, show final result
      if (submitResult.allPassed || !submitResult.canRetry) {
        setResult(submitResult);
      } else {
        // Show temporary result but allow retry
        setResult(submitResult);
        // Clear result after showing feedback so they can retry
        setTimeout(() => {
          setResult(null);
        }, 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit quiz');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRunTests = async () => {
    if (!id || runningTests) return;
    try {
      setRunningTests(true);
      setTestResults(null);
      const results = await runTests(id, code);
      setTestResults(results);
    } catch (err: any) {
      setError(err.message || 'Failed to run tests');
    } finally {
      setRunningTests(false);
    }
  };

  // Get visible test cases (non-hidden)
  const visibleTestCases = quiz?.testCases?.filter(tc => !tc.isHidden) || [];

  // Scroll terminal to bottom
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalLines]);

  // Run code with interactive input (like Playground)
  const handleRunCode = async () => {
    if (!quiz || isCodeRunning) return;
    
    const newSessionId = `${Date.now()}`;
    setSessionId(newSessionId);
    setIsCodeRunning(true);
    setTerminalLines([{ type: 'output', content: `▶️ Running ${quiz.language} code...\n` }]);
    setActiveTab('runconsole');

    try {
      const response = await fetch(`${API_URL}/api/playground/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language: quiz.language,
          sessionId: newSessionId
        })
      });

      if (!response.ok) throw new Error(`Request failed: ${response.statusText}`);
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts[parts.length - 1];

        for (let i = 0; i < parts.length - 1; i++) {
          const message = parts[i];
          if (message.startsWith('data: ')) {
            try {
              const data = JSON.parse(message.substring(6));
              if (data.type === 'stdout' || data.type === 'output') {
                setTerminalLines(prev => [...prev, { type: 'output', content: data.data || data.content }]);
              } else if (data.type === 'stderr' || data.type === 'error') {
                setTerminalLines(prev => [...prev, { type: 'error', content: data.data || data.content }]);
              } else if (data.type === 'end') {
                setTerminalLines(prev => [...prev, { type: 'output', content: '\n✓ Program finished\n' }]);
                setIsCodeRunning(false);
              }
            } catch (e) { /* ignore parse errors */ }
          }
        }
      }

      // Process remaining buffer
      if (buffer.startsWith('data: ')) {
        try {
          const data = JSON.parse(buffer.substring(6));
          if (data.type === 'stdout' || data.type === 'output') {
            setTerminalLines(prev => [...prev, { type: 'output', content: data.data || data.content }]);
          } else if (data.type === 'stderr' || data.type === 'error') {
            setTerminalLines(prev => [...prev, { type: 'error', content: data.data || data.content }]);
          } else if (data.type === 'end') {
            setTerminalLines(prev => [...prev, { type: 'output', content: '\n✓ Program finished\n' }]);
          }
        } catch (e) { /* ignore */ }
      }

      setIsCodeRunning(false);
    } catch (error: any) {
      setTerminalLines(prev => [...prev, { type: 'error', content: `Error: ${error.message}\n` }]);
      setIsCodeRunning(false);
    }
  };

  // Send input to running program
  const handleTerminalInputSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalInput.trim() || !sessionId) return;

    setTerminalLines(prev => [...prev, { type: 'output', content: terminalInput + '\n' }]);

    try {
      await fetch(`${API_URL}/api/playground/input`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, input: terminalInput })
      });
      setTerminalInput('');
    } catch (error: any) {
      setTerminalLines(prev => [...prev, { type: 'error', content: `Failed to send input: ${error.message}\n` }]);
    }
  };

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = (): string => {
    if (timeRemaining <= 60) return 'text-red-500 bg-red-500/20';
    if (timeRemaining <= 300) return 'text-yellow-500 bg-yellow-500/20';
    return 'text-green-500 bg-green-500/20';
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-gray-950' : 'bg-gray-50'}`}>
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-gray-950' : 'bg-gray-50'}`}>
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <p className="text-red-400 mb-4">{error || 'Quiz not found'}</p>
          <Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  const isScheduled = quiz.status === 'scheduled';
  const isEnded = quiz.status === 'ended';
  const isActive = quiz.status === 'active';

  return (
    <div ref={quizContainerRef} className={`min-h-screen ${theme === 'dark' ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Violation Warning Modal */}
      {showViolationWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className={`max-w-md w-full mx-4 p-6 rounded-2xl ${theme === 'dark' ? 'bg-red-900/90 border border-red-500' : 'bg-red-50 border border-red-300'}`}>
            <div className="text-center">
              <ShieldAlert className="w-16 h-16 mx-auto mb-4 text-red-500" />
              <h2 className="text-2xl font-bold mb-2 text-red-500">Warning!</h2>
              <p className="text-lg mb-4">{violationMessage}</p>
              <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-red-300' : 'text-red-600'}`}>
                Violations: {violations}
              </p>
              {!isFullscreen ? (
                <Button 
                  onClick={() => {
                    enterFullscreen();
                    setShowViolationWarning(false);
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <Maximize className="w-4 h-4 mr-2" />
                  Return to Fullscreen
                </Button>
              ) : (
                <Button 
                  onClick={() => setShowViolationWarning(false)}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  I understand, Continue
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Violations Counter Badge */}
      {started && !result && violations > 0 && (
        <div className="fixed top-4 right-4 z-50">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${theme === 'dark' ? 'bg-red-900/80 border border-red-500' : 'bg-red-100 border border-red-300'}`}>
            <ShieldAlert className="w-4 h-4 text-red-500" />
            <span className="text-sm font-medium text-red-500">Violations: {violations}</span>
          </div>
        </div>
      )}
      {/* Header */}
      <header className={`border-b sticky top-0 z-50 ${theme === 'dark' ? 'border-gray-800 bg-gray-900/95' : 'border-gray-200 bg-white/95'} backdrop-blur-sm`}>
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/quizzes')}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <div>
                <h1 className="font-bold text-lg">{quiz.title}</h1>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    quiz.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' :
                    quiz.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {quiz.difficulty}
                  </span>
                  <span>{quiz.points} pts</span>
                  <span>{quiz.language}</span>
                </div>
              </div>
            </div>

            {/* Timer */}
            {started && !result && isActive && (
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg font-bold ${getTimerColor()}`}>
                <Clock className="w-5 h-5" />
                {formatTime(timeRemaining)}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Quiz Status Messages */}
        {isScheduled && (
          <div className={`rounded-xl p-8 text-center mb-6 ${theme === 'dark' ? 'bg-blue-900/20 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'}`}>
            <Clock className="w-16 h-16 mx-auto mb-4 text-blue-400" />
            <h2 className="text-2xl font-bold mb-2">Quiz Not Started Yet</h2>
            <p className="text-gray-400 mb-4">
              This quiz will start on {new Date(quiz.startTime).toLocaleString()}
            </p>
            <p className="text-sm text-gray-500">
              Duration: {quiz.duration} minutes
            </p>
          </div>
        )}

        {isEnded && !result && (
          <div className={`rounded-xl p-8 text-center mb-6 ${theme === 'dark' ? 'bg-gray-800/50 border border-gray-700' : 'bg-gray-100 border border-gray-200'}`}>
            <XCircle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h2 className="text-2xl font-bold mb-2">Quiz Has Ended</h2>
            <p className="text-gray-400">
              This quiz ended on {new Date(quiz.endTime).toLocaleString()}
            </p>
          </div>
        )}

        {/* Result Display */}
        {result && (
          <div className={`rounded-xl p-8 text-center mb-6 ${
            result.allPassed
              ? theme === 'dark' ? 'bg-green-900/20 border border-green-500/30' : 'bg-green-50 border border-green-200'
              : theme === 'dark' ? 'bg-orange-900/20 border border-orange-500/30' : 'bg-orange-50 border border-orange-200'
          }`}>
            {result.allPassed ? (
              <Trophy className="w-16 h-16 mx-auto mb-4 text-yellow-400" />
            ) : (
              <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-orange-400" />
            )}
            <h2 className="text-2xl font-bold mb-2">
              {result.allPassed ? 'Perfect Score! 🎉' : result.canRetry ? 'Keep Trying!' : 'Quiz Submitted'}
            </h2>
            <p className="text-lg mb-4">
              You passed {result.passed} out of {result.total} test cases
            </p>
            
            {/* Show retry message if can retry */}
            {result.canRetry && isActive && (
              <div className={`mb-4 p-3 rounded-lg ${theme === 'dark' ? 'bg-blue-900/30 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'}`}>
                <p className="text-blue-400 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  You can try again! Fix your code and resubmit.
                </p>
              </div>
            )}

            {/* Show grade status for ended quizzes or when submission has grade */}
            {(isEnded || quiz?.submission?.teacherGrade !== undefined) && (
              <div className={`mb-4 p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-100'}`}>
                {quiz?.submission?.teacherGrade !== undefined ? (
                  <div>
                    <p className="text-xl font-bold text-green-400 mb-2">
                      📊 Teacher Grade: {quiz.submission.teacherGrade}%
                    </p>
                    <p className={`text-lg ${quiz.submission.pointsAwarded > 0 ? 'text-green-400' : 'text-gray-400'}`}>
                      +{quiz.submission.pointsAwarded} points earned
                    </p>
                    {quiz.submission.teacherFeedback && (
                      <div className={`mt-4 p-3 rounded-lg text-left ${theme === 'dark' ? 'bg-gray-900/50' : 'bg-white'}`}>
                        <p className={`text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                          💬 Teacher Feedback:
                        </p>
                        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          {quiz.submission.teacherFeedback}
                        </p>
                      </div>
                    )}
                  </div>
                ) : isEnded ? (
                  <div>
                    <p className="text-lg text-yellow-400 mb-1">⏳ Pending Teacher Review</p>
                    <p className="text-sm text-gray-400">Your submission is being reviewed by the teacher.</p>
                  </div>
                ) : null}
              </div>
            )}

            {/* Points for active quiz with all passed */}
            {!isEnded && result.allPassed && (
              <p className={`text-xl font-bold ${result.pointsAwarded > 0 ? 'text-green-400' : 'text-gray-400'}`}>
                +{result.pointsAwarded} points earned
              </p>
            )}

            {/* Test Results */}
            {result.results.length > 0 && (
              <div className="mt-6 text-left max-w-2xl mx-auto">
                <h3 className="font-semibold mb-3">Test Results:</h3>
                <div className="space-y-2">
                  {result.results.map((r, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-lg flex items-center gap-3 ${
                        r.passed
                          ? theme === 'dark' ? 'bg-green-900/30' : 'bg-green-100'
                          : theme === 'dark' ? 'bg-red-900/30' : 'bg-red-100'
                      }`}
                    >
                      {r.passed ? (
                        <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="font-medium">Test {i + 1}</span>
                        {r.error && (
                          <p className="text-sm text-red-400 truncate">{r.error}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={() => navigate('/quizzes')} className="mt-6">
              Back to Quizzes
            </Button>
          </div>
        )}

        {/* Start Quiz Button */}
        {isActive && !started && !result && (
          <div className={`rounded-xl p-8 text-center mb-6 ${theme === 'dark' ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            <Play className="w-16 h-16 mx-auto mb-4 text-blue-400" />
            <h2 className="text-2xl font-bold mb-2">Ready to Start?</h2>
            <p className="text-gray-400 mb-2">{quiz.description}</p>
            <p className="text-sm text-gray-500 mb-6">
              Duration: {quiz.duration} minutes • Ends at {new Date(quiz.endTime).toLocaleTimeString()}
            </p>
            <div className={`mb-4 p-3 rounded-lg ${theme === 'dark' ? 'bg-yellow-900/30 border border-yellow-500/30' : 'bg-yellow-50 border border-yellow-200'}`}>
              <p className="text-yellow-500 text-sm flex items-center justify-center gap-2">
                <Maximize className="w-4 h-4" />
                Fullscreen mode will be activated when you start
              </p>
            </div>
            <Button onClick={handleStart} className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-3">
              <Play className="w-5 h-5 mr-2" /> Start Quiz
            </Button>
          </div>
        )}

        {/* Code Editor */}
        {started && !result && isActive && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Panel - Problem & Test Cases */}
            <div className="space-y-4">
              {/* Tabs */}
              <div className={`flex rounded-lg p-1 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'}`}>
                <button
                  onClick={() => setActiveTab('problem')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'problem'
                      ? theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-white text-gray-900 shadow'
                      : theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Problem
                </button>
                <button
                  onClick={() => setActiveTab('testcases')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'testcases'
                      ? theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-white text-gray-900 shadow'
                      : theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Test Cases ({visibleTestCases.length})
                </button>
                <button
                  onClick={() => setActiveTab('runconsole')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-1 ${
                    activeTab === 'runconsole'
                      ? theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-white text-gray-900 shadow'
                      : theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Terminal className="w-4 h-4" />
                  Console
                </button>
              </div>

              {/* Problem Tab */}
              {activeTab === 'problem' && (
                <div className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'}`}>
                  <h2 className="text-xl font-bold mb-4">Problem</h2>
                  <div className={`prose max-w-none ${theme === 'dark' ? 'prose-invert' : ''}`}>
                    <p className="whitespace-pre-wrap">{quiz.description}</p>
                  </div>
                </div>
              )}

              {/* Test Cases Tab */}
              {activeTab === 'testcases' && (
                <div className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold">Test Cases</h2>
                    {quiz.testCases && quiz.testCases.some(tc => tc.isHidden) && (
                      <span className={`text-xs px-2 py-1 rounded ${theme === 'dark' ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-700'}`}>
                        + Hidden tests
                      </span>
                    )}
                  </div>
                  
                  {visibleTestCases.length === 0 ? (
                    <p className="text-gray-400 text-center py-4">All test cases are hidden</p>
                  ) : (
                    <div className="space-y-4">
                      {visibleTestCases.map((tc, idx) => {
                        const testResult = testResults?.results?.[idx];
                        return (
                          <div
                            key={idx}
                            className={`rounded-lg border ${
                              testResult
                                ? testResult.passed
                                  ? theme === 'dark' ? 'border-green-500/50 bg-green-900/20' : 'border-green-300 bg-green-50'
                                  : theme === 'dark' ? 'border-red-500/50 bg-red-900/20' : 'border-red-300 bg-red-50'
                                : theme === 'dark' ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
                            }`}
                          >
                            <div className={`px-4 py-2 border-b flex items-center justify-between ${
                              theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
                            }`}>
                              <span className="font-medium text-sm">Test Case {idx + 1}</span>
                              {testResult && (
                                testResult.passed
                                  ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                                  : <XCircle className="w-4 h-4 text-red-500" />
                              )}
                            </div>
                            <div className="p-4 space-y-3">
                              <div>
                                <label className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Input:</label>
                                <pre className={`mt-1 p-2 rounded text-sm font-mono overflow-x-auto ${
                                  theme === 'dark' ? 'bg-gray-900' : 'bg-white'
                                }`}>{tc.input || '(no input)'}</pre>
                              </div>
                              <div>
                                <label className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Expected Output:</label>
                                <pre className={`mt-1 p-2 rounded text-sm font-mono overflow-x-auto ${
                                  theme === 'dark' ? 'bg-gray-900' : 'bg-white'
                                }`}>{tc.expectedOutput}</pre>
                              </div>
                              {testResult && (
                                <div>
                                  <label className={`text-xs font-medium ${testResult.passed ? 'text-green-400' : 'text-red-400'}`}>
                                    Your Output:
                                  </label>
                                  <pre className={`mt-1 p-2 rounded text-sm font-mono overflow-x-auto ${
                                    theme === 'dark' ? 'bg-gray-900' : 'bg-white'
                                  } ${testResult.passed ? 'text-green-400' : 'text-red-400'}`}>
                                    {testResult.error || testResult.actualOutput || '(no output)'}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Test Results Summary */}
                  {testResults && (
                    <div className={`mt-4 p-3 rounded-lg ${
                      testResults.passed === testResults.total
                        ? theme === 'dark' ? 'bg-green-900/30 border border-green-500/30' : 'bg-green-100 border border-green-300'
                        : theme === 'dark' ? 'bg-orange-900/30 border border-orange-500/30' : 'bg-orange-100 border border-orange-300'
                    }`}>
                      <p className="text-center font-medium">
                        {testResults.passed === testResults.total
                          ? `✅ All ${testResults.total} visible tests passed!`
                          : `⚠️ ${testResults.passed}/${testResults.total} visible tests passed`
                        }
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Console Tab */}
              {activeTab === 'runconsole' && (
                <div className={`rounded-xl overflow-hidden h-[400px] flex flex-col ${theme === 'dark' ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'}`}>
                  <div className={`px-4 py-2 border-b flex items-center justify-between ${theme === 'dark' ? 'border-gray-800 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
                    <h3 className="font-semibold flex items-center gap-2">
                      <Terminal className="w-4 h-4" />
                      Console
                    </h3>
                    {isCodeRunning && (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-sm text-green-500">Running...</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Terminal Output */}
                  <div className="flex-1 overflow-y-auto p-4 font-mono text-sm">
                    {terminalLines.length === 0 ? (
                      <p className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                        Click "Run Code" to execute your code with input support...
                      </p>
                    ) : (
                      terminalLines.map((line, index) => (
                        <div
                          key={index}
                          className={line.type === 'error' ? 'text-red-400' : 'whitespace-pre-wrap'}
                        >
                          {line.content}
                        </div>
                      ))
                    )}
                    <div ref={terminalEndRef} />
                  </div>

                  {/* Terminal Input */}
                  {isCodeRunning && (
                    <form onSubmit={handleTerminalInputSubmit} className={`border-t ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'} p-2`}>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={terminalInput}
                          onChange={(e) => setTerminalInput(e.target.value)}
                          placeholder="Enter input..."
                          className={`flex-1 px-3 py-2 rounded font-mono text-sm ${
                            theme === 'dark'
                              ? 'bg-gray-800 text-white placeholder-gray-500 border-gray-700'
                              : 'bg-white text-gray-900 placeholder-gray-400 border-gray-300'
                          } border focus:outline-none focus:ring-2 focus:ring-blue-500`}
                          autoFocus
                        />
                        <button
                          type="submit"
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
                        >
                          Send
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>

            {/* Code Editor */}
            <div className={`rounded-xl overflow-hidden ${theme === 'dark' ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'}`}>
              <div className={`px-4 py-3 border-b ${theme === 'dark' ? 'border-gray-800 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Your Solution ({quiz.language})</span>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handleRunCode}
                      disabled={isCodeRunning || !code.trim()}
                      variant="outline"
                      className={theme === 'dark' ? 'border-blue-600 text-blue-400 hover:bg-blue-900/30' : 'border-blue-500 text-blue-600'}
                    >
                      {isCodeRunning ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Running...
                        </>
                      ) : (
                        <>
                          <Terminal className="w-4 h-4 mr-2" />
                          Run Code
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleRunTests}
                      disabled={runningTests || !code.trim()}
                      variant="outline"
                      className={theme === 'dark' ? 'border-gray-600 hover:bg-gray-700' : ''}
                    >
                      {runningTests ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Run Tests
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={submitting || !code.trim()}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Submit
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onPaste={(e) => e.preventDefault()}
                onContextMenu={(e) => e.preventDefault()}
                className={`w-full h-[500px] p-4 font-mono text-sm resize-none outline-none ${
                  theme === 'dark'
                    ? 'bg-gray-950 text-white'
                    : 'bg-white text-gray-900'
                }`}
                placeholder="Write your code here..."
                disabled={submitting || runningTests}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
