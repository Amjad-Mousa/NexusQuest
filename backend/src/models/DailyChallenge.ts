import mongoose, { Document, Schema } from 'mongoose';

// Simple daily challenges - predefined set of easy coding challenges
export interface IDailyChallenge extends Document {
    _id: mongoose.Types.ObjectId;
    title: string;
    description: string;
    language: 'python' | 'javascript';
    starterCode: string;
    testInput: string;
    expectedOutput: string;
    points: number;
}

// User's daily challenge completion record
export interface IDailyChallengeCompletion extends Document {
    _id: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    challengeIndex: number; // Index of the challenge completed
    completedDate: string; // YYYY-MM-DD format
    completedAt: Date;
}

const dailyChallengeSchema = new Schema<IDailyChallenge>(
    {
        title: { type: String, required: true },
        description: { type: String, required: true },
        language: { type: String, enum: ['python', 'javascript'], required: true },
        starterCode: { type: String, required: true },
        testInput: { type: String, default: '' },
        expectedOutput: { type: String, required: true },
        points: { type: Number, default: 10 },
    },
    { timestamps: true }
);

const dailyChallengeCompletionSchema = new Schema<IDailyChallengeCompletion>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        challengeIndex: { type: Number, required: true },
        completedDate: { type: String, required: true }, // YYYY-MM-DD
        completedAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

// Compound index to ensure one completion per user per day
dailyChallengeCompletionSchema.index({ userId: 1, completedDate: 1 }, { unique: true });

export const DailyChallenge = mongoose.model<IDailyChallenge>('DailyChallenge', dailyChallengeSchema);
export const DailyChallengeCompletion = mongoose.model<IDailyChallengeCompletion>('DailyChallengeCompletion', dailyChallengeCompletionSchema);

// Predefined simple challenges (seeded into DB or used directly)
export const DAILY_CHALLENGES = [
    {
        title: 'Hello World',
        description: 'Print "Hello, World!" to the console.',
        language: 'python' as const,
        starterCode: '# Print Hello, World!\n',
        testInput: '',
        expectedOutput: 'Hello, World!',
        points: 10,
    },
    {
        title: 'Sum Two Numbers',
        description: 'Read two numbers from input and print their sum.',
        language: 'python' as const,
        starterCode: '# Read two numbers and print their sum\na = int(input())\nb = int(input())\n',
        testInput: '5\n3',
        expectedOutput: '8',
        points: 10,
    },
    {
        title: 'Even or Odd',
        description: 'Read a number and print "even" if it\'s even, "odd" if it\'s odd.',
        language: 'python' as const,
        starterCode: '# Check if number is even or odd\nn = int(input())\n',
        testInput: '4',
        expectedOutput: 'even',
        points: 10,
    },
    {
        title: 'Reverse a String',
        description: 'Read a string and print it reversed.',
        language: 'python' as const,
        starterCode: '# Reverse the input string\ns = input()\n',
        testInput: 'hello',
        expectedOutput: 'olleh',
        points: 10,
    },
    {
        title: 'Count Characters',
        description: 'Read a string and print the number of characters.',
        language: 'python' as const,
        starterCode: '# Count characters in the string\ns = input()\n',
        testInput: 'python',
        expectedOutput: '6',
        points: 10,
    },
    {
        title: 'Maximum of Three',
        description: 'Read three numbers and print the largest one.',
        language: 'python' as const,
        starterCode: '# Find the maximum of three numbers\na = int(input())\nb = int(input())\nc = int(input())\n',
        testInput: '5\n9\n3',
        expectedOutput: '9',
        points: 10,
    },
    {
        title: 'Square a Number',
        description: 'Read a number and print its square.',
        language: 'python' as const,
        starterCode: '# Print the square of the number\nn = int(input())\n',
        testInput: '7',
        expectedOutput: '49',
        points: 10,
    },
    {
        title: 'Is Positive?',
        description: 'Read a number and print "yes" if positive, "no" otherwise.',
        language: 'python' as const,
        starterCode: '# Check if number is positive\nn = int(input())\n',
        testInput: '10',
        expectedOutput: 'yes',
        points: 10,
    },
    {
        title: 'First Character',
        description: 'Read a string and print its first character.',
        language: 'python' as const,
        starterCode: '# Print the first character\ns = input()\n',
        testInput: 'coding',
        expectedOutput: 'c',
        points: 10,
    },
    {
        title: 'Double It',
        description: 'Read a number and print it doubled.',
        language: 'python' as const,
        starterCode: '# Double the number\nn = int(input())\n',
        testInput: '15',
        expectedOutput: '30',
        points: 10,
    },
    {
        title: 'Uppercase',
        description: 'Read a string and print it in uppercase.',
        language: 'python' as const,
        starterCode: '# Convert to uppercase\ns = input()\n',
        testInput: 'hello',
        expectedOutput: 'HELLO',
        points: 10,
    },
    {
        title: 'Subtract Numbers',
        description: 'Read two numbers and print the first minus the second.',
        language: 'python' as const,
        starterCode: '# Subtract b from a\na = int(input())\nb = int(input())\n',
        testInput: '10\n3',
        expectedOutput: '7',
        points: 10,
    },
    {
        title: 'Last Character',
        description: 'Read a string and print its last character.',
        language: 'python' as const,
        starterCode: '# Print the last character\ns = input()\n',
        testInput: 'world',
        expectedOutput: 'd',
        points: 10,
    },
    {
        title: 'Multiply Numbers',
        description: 'Read two numbers and print their product.',
        language: 'python' as const,
        starterCode: '# Multiply two numbers\na = int(input())\nb = int(input())\n',
        testInput: '4\n5',
        expectedOutput: '20',
        points: 10,
    },
    {
        title: 'Lowercase',
        description: 'Read a string and print it in lowercase.',
        language: 'python' as const,
        starterCode: '# Convert to lowercase\ns = input()\n',
        testInput: 'HELLO',
        expectedOutput: 'hello',
        points: 10,
    },
];
