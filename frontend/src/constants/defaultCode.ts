export const defaultPythonCode = `# Welcome to NexusQuest IDE!
# Write your Python code here and click Run

def greet(name):
    return f"Hello, {name}! Welcome to the IDE."

print(greet("Developer"))

# Example: Basic calculations
x = 10
y = 20
result = x + y
print(f"The sum of {x} and {y} is {result}")
`;

export const defaultJavaCode = `// Welcome to NexusQuest IDE!
// Write your Java code here and click Run
// TIP: Use the Input field above to provide values for Scanner

import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        
        // Example: Read input
        // Input field: 10, 20
        System.out.print("Enter first number: ");
        int num1 = scanner.nextInt();
        
        System.out.print("Enter second number: ");
        int num2 = scanner.nextInt();
        
        int sum = num1 + num2;
        System.out.println("The sum is: " + sum);
        
        scanner.close();
    }
}
`;

export const defaultJavaScriptCode = `// Welcome to NexusQuest IDE!
// Write your JavaScript code here and click Run
// Popular frameworks: express, axios, lodash, moment available
// NOTE: Browser functions (prompt, alert, document) are not available
// This runs in Node.js environment

console.log("Hello from JavaScript!");

// Example: Using lodash
const _ = require('lodash');
const numbers = [1, 2, 3, 4, 5];
const doubled = _.map(numbers, n => n * 2);
console.log("Doubled:", doubled);

// Example: Calculate sum
function calculateSum(arr) {
    return arr.reduce((sum, num) => sum + num, 0);
}
console.log("Sum of numbers:", calculateSum([10, 20, 30]));

// Example: Date formatting with moment
const moment = require('moment');
console.log("Current time:", moment().format('MMMM Do YYYY, h:mm:ss a'));
`;

export const defaultCppCode = `// Welcome to NexusQuest IDE!
// Write your C++ code here and click Run
// Available: STL, Boost, C++20 features

#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    cout << "Hello from C++!" << endl;
    
    // Example: Vector and algorithms
    vector<int> numbers = {5, 2, 8, 1, 9};
    sort(numbers.begin(), numbers.end());
    
    cout << "Sorted numbers: ";
    for(int num : numbers) {
        cout << num << " ";
    }
    cout << endl;
    
    return 0;
}
`;

export const defaultCode = defaultPythonCode;

export type Language = 'python' | 'java' | 'javascript' | 'cpp';

export const getDefaultCodeForLanguage = (language: Language): string => {
  switch (language) {
    case 'python':
      return defaultPythonCode;
    case 'java':
      return defaultJavaCode;
    case 'javascript':
      return defaultJavaScriptCode;
    case 'cpp':
      return defaultCppCode;
    default:
      return defaultPythonCode;
  }
};

export const languageExtensions: Record<Language, string> = {
  python: '.py',
  javascript: '.js',
  java: '.java',
  cpp: '.cpp'
};

