import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { DailyChallengeCompletion, DAILY_CHALLENGES } from '../models/DailyChallenge.js';
import { executeCode } from '../services/dockerService.js';
import Docker from 'dockerode';
import { logger } from '../utils/logger.js';
import { languageImages, getDefaultFileName } from '../utils/execution.js';

const router = Router();
const docker = new Docker();

// Execute code in temporary container (like playground)
async function executeCodeInTempContainer(code: string, language: string, input?: string): Promise<{ output: string; error: string }> {
    const sessionId = `daily-challenge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const containerName = `nexusquest-daily-${sessionId}`;

    logger.info(`Daily challenge execution: language=${language}, sessionId=${sessionId}`);

    try {
        // Check and remove existing container (shouldn't exist but safety check)
        try {
            const existingContainer = docker.getContainer(containerName);
            await existingContainer.inspect();
            logger.info(`Removing existing container: ${containerName}`);
            await existingContainer.remove({ force: true });
        } catch (error: any) {
            if (error.statusCode !== 404) {
                logger.warn(`Error checking existing container: ${error.message}`);
            }
        }

        // Create temporary container
        const container = await docker.createContainer({
            Image: languageImages[language],
            name: containerName,
            Cmd: ['sh', '-c', 'while true; do sleep 1; done'],
            Tty: true,
            OpenStdin: true,
            StdinOnce: false,
            AttachStdin: true,
            AttachStdout: true,
            AttachStderr: true,
            HostConfig: {
                Memory: 256 * 1024 * 1024,
                AutoRemove: false,
                NetworkMode: 'none',
                Tmpfs: {
                    '/tmp': 'rw,exec,nosuid,size=50m'
                }
            }
        });

        await container.start();
        logger.info(`Daily challenge container started: ${containerName}`);

        // Write code to file
        const fileName = getDefaultFileName(language, 'daily-challenge', code);
        const filePath = `/tmp/${fileName}`;

        // Write code using cat with heredoc to avoid issues with special characters
        const escapedCode = code.replace(/'/g, "'\\''");
        const writeCmd = [
            `cat > ${filePath} << 'EOFCODE'`,
            escapedCode,
            'EOFCODE'
        ].join('\n');

        const writeExec = await container.exec({
            Cmd: ['sh', '-c', writeCmd],
            AttachStdout: true,
            AttachStderr: true
        });
        await writeExec.start({});

        // Prepare execution command
        let execCommand: string;
        let className: string | undefined;

        if (language === 'python') {
            execCommand = `python3 -u ${filePath}`;
        } else if (language === 'javascript') {
            execCommand = `node ${filePath}`;
        } else if (language === 'cpp') {
            execCommand = `g++ -std=c++20 ${filePath} -o /tmp/a.out && /tmp/a.out`;
        } else if (language === 'java') {
            const classMatch = code.match(/public\s+class\s+(\w+)/);
            className = classMatch ? classMatch[1] : 'Main';
            execCommand = `cd /tmp && javac ${fileName} && java -cp /tmp ${className}`;
        } else {
            await container.remove({ force: true });
            return { output: '', error: 'Unsupported language' };
        }

        // Execute code
        const exec = await container.exec({
            Cmd: ['sh', '-c', execCommand],
            AttachStdin: true,
            AttachStdout: true,
            AttachStderr: true,
            Tty: false
        });

        const stream = await exec.start({
            hijack: true,
            stdin: true
        });

        // Send input if provided
        if (input) {
            stream.write(input + '\n');
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        stream.end();

        // Collect output
        const outputPromise = new Promise<{ stdout: string; stderr: string }>((resolve) => {
            let stdout = '';
            let stderr = '';

            stream.on('data', (chunk: Buffer) => {
                const data = chunk.toString('utf8');
                stdout += data;
            });

            stream.on('error', (error: Error) => {
                stderr += error.message;
            });

            stream.on('end', () => {
                resolve({ stdout, stderr });
            });
        });

        // Set timeout
        const timeoutPromise = new Promise<{ stdout: string; stderr: string }>((_, reject) => {
            setTimeout(() => {
                stream.destroy();
                reject(new Error('Execution timeout (10 seconds)'));
            }, 10000);
        });

        const { stdout, stderr } = await Promise.race([outputPromise, timeoutPromise]);

        // Clean up container
        try {
            await container.stop();
            await new Promise(resolve => setTimeout(resolve, 500));
            await container.remove({ force: true });
            logger.info(`Daily challenge container removed: ${containerName}`);
        } catch (err: any) {
            if (err.statusCode !== 404 && !err.message?.includes('No such container')) {
                logger.warn(`Error removing daily challenge container: ${err.message}`);
            }
        }

        return {
            output: stdout.trim() || 'Code executed successfully (no output)',
            error: stderr.trim()
        };

    } catch (error: any) {
        logger.error('Daily challenge execution failed:', error);

        // Try to clean up container if it still exists
        try {
            const container = docker.getContainer(containerName);
            await container.remove({ force: true });
        } catch (cleanupErr) {
            // Ignore cleanup errors
        }

        return {
            output: '',
            error: error.message || 'Execution failed'
        };
    }
}

// All routes require authentication
router.use(authMiddleware);

// Helper to get today's date string in YYYY-MM-DD format
function getTodayDateString(): string {
    const now = new Date();
    return now.toISOString().split('T')[0];
}

// Helper to get today's challenge index based on date
function getTodayChallengeIndex(): number {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - startOfYear.getTime();
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
    return dayOfYear % DAILY_CHALLENGES.length;
}

// Get today's daily challenge
router.get('/today', async (req: AuthRequest, res: Response) => {
    try {
        const todayDate = getTodayDateString();
        const challengeIndex = getTodayChallengeIndex();
        const challenge = DAILY_CHALLENGES[challengeIndex];

        // Check if user already completed today's challenge
        const completion = await DailyChallengeCompletion.findOne({
            userId: req.userId,
            completedDate: todayDate,
        });

        res.json({
            success: true,
            data: {
                challenge: {
                    ...challenge,
                    index: challengeIndex,
                },
                completed: !!completion,
                completedAt: completion?.completedAt || null,
                date: todayDate,
            },
        });
    } catch (error) {
        console.error('Failed to get daily challenge:', error);
        res.status(500).json({ success: false, error: 'Failed to get daily challenge' });
    }
});

// Submit solution for today's daily challenge
router.post('/submit', async (req: AuthRequest, res: Response) => {
    try {
        const { code } = req.body as { code?: string };

        if (!code || !code.trim()) {
            return res.status(400).json({ success: false, error: 'Code is required' });
        }

        const todayDate = getTodayDateString();
        const challengeIndex = getTodayChallengeIndex();
        const challenge = DAILY_CHALLENGES[challengeIndex];

        // Check if already completed today
        const existingCompletion = await DailyChallengeCompletion.findOne({
            userId: req.userId,
            completedDate: todayDate,
        });

        if (existingCompletion) {
            return res.status(400).json({
                success: false,
                error: 'You have already completed today\'s challenge!',
            });
        }

        // Execute the code in temporary container (like playground)
        const result = await executeCodeInTempContainer(code, challenge.language, challenge.testInput);

        const normalize = (value: string): string => {
            return value.replace(/\r\n/g, '\n').trim();
        };

        const actualOutput = result.error ? result.error : result.output;
        const passed = !result.error && normalize(actualOutput) === normalize(challenge.expectedOutput);

        if (passed) {
            // Mark as completed
            await DailyChallengeCompletion.create({
                userId: req.userId,
                challengeIndex,
                completedDate: todayDate,
            });

            // Award points
            await User.findByIdAndUpdate(req.userId, {
                $inc: { totalPoints: challenge.points },
            });

            res.json({
                success: true,
                data: {
                    passed: true,
                    output: actualOutput,
                    pointsAwarded: challenge.points,
                    message: `Congratulations! You earned ${challenge.points} points!`,
                },
            });
        } else {
            res.json({
                success: true,
                data: {
                    passed: false,
                    output: actualOutput,
                    expected: challenge.expectedOutput,
                    error: result.error || null,
                    message: 'Not quite right. Try again!',
                },
            });
        }
    } catch (error: any) {
        console.error('Failed to submit daily challenge:', error);
        res.status(500).json({
            success: false,
            error: error?.message || 'Failed to submit solution',
        });
    }
});

// Get current user's daily challenge history/stats
router.get('/stats', async (req: AuthRequest, res: Response) => {
    try {
        const completions = await DailyChallengeCompletion.find({ userId: req.userId })
            .sort({ completedDate: -1 })
            .limit(30);

        // Calculate streak
        let streak = 0;
        const today = new Date();

        for (let i = 0; i < 30; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(checkDate.getDate() - i);
            const dateStr = checkDate.toISOString().split('T')[0];

            const found = completions.find(c => c.completedDate === dateStr);
            if (found) {
                streak++;
            } else if (i > 0) {
                // Allow today to be incomplete, but break streak if yesterday is missing
                break;
            }
        }

        res.json({
            success: true,
            data: {
                totalCompleted: completions.length,
                currentStreak: streak,
                recentCompletions: completions.slice(0, 7).map(c => ({
                    date: c.completedDate,
                    challengeIndex: c.challengeIndex,
                })),
            },
        });
    } catch (error) {
        console.error('Failed to get daily challenge stats:', error);
        res.status(500).json({ success: false, error: 'Failed to get stats' });
    }
});

// Get any user's daily challenge history/stats by id
router.get('/stats/:userId', async (req: AuthRequest, res: Response) => {
    try {
        const { userId } = req.params;

        const completions = await DailyChallengeCompletion.find({ userId })
            .sort({ completedDate: -1 })
            .limit(30);

        let streak = 0;
        const today = new Date();

        for (let i = 0; i < 30; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(checkDate.getDate() - i);
            const dateStr = checkDate.toISOString().split('T')[0];

            const found = completions.find(c => c.completedDate === dateStr);
            if (found) {
                streak++;
            } else if (i > 0) {
                break;
            }
        }

        res.json({
            success: true,
            data: {
                totalCompleted: completions.length,
                currentStreak: streak,
                recentCompletions: completions.slice(0, 7).map(c => ({
                    date: c.completedDate,
                    challengeIndex: c.challengeIndex,
                })),
            },
        });
    } catch (error) {
        console.error('Failed to get user daily challenge stats:', error);
        res.status(500).json({ success: false, error: 'Failed to get stats' });
    }
});

export default router;
