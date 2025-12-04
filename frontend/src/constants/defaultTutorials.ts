export interface TutorialSection {
  id: string;
  title: string;
  content: string;
  codeExample?: string;
  language?: string;
}

export interface Tutorial {
  id: string;
  title: string;
  description: string;
  language: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  order: number;
  sections: TutorialSection[];
  nextTutorialId?: string; // ID of the next tutorial to take
}

export const defaultTutorials: Tutorial[] = [
  // JavaScript Variables
  {
    id: 'js-variables',
    title: "JavaScript Variables",
    description: "Learn about variables in JavaScript including let, const, var, scope, and data types",
    language: "javascript",
    difficulty: "beginner",
    order: 1,
    nextTutorialId: 'js-functions',
    sections: [
      {
        id: 'intro',
        title: "What is a Variable?",
        content: `A variable is a named storage location in memory that holds a value. Think of it as a labeled box where you can store and retrieve data.

Variables are fundamental to programming - they allow you to store information that can be used and changed throughout your program.`,
        codeExample: `let variableName = value;`,
        language: 'javascript'
      },
      {
        id: 'declaration',
        title: "Variable Declaration",
        content: `JavaScript uses three keywords to declare variables: let, const, and var.

**Using let (ES6)** - declares a block-scoped variable that can be reassigned
**Using const (ES6)** - declares a block-scoped constant that cannot be reassigned  
**Using var (Legacy)** - declares a function-scoped variable (not recommended)`,
        codeExample: `// Using let
let x = 10;
let name = "John";
let isActive = true;

// Using const
const PI = 3.14159;
const MAX_SIZE = 100;

// Using var (old way)
var age = 25;`,
        language: 'javascript'
      },
      {
        id: 'assignment',
        title: "Variable Assignment",
        content: `You can assign values to variables when you declare them, or later in your code.

With let, you can reassign values.
With const, you cannot reassign after initial assignment.`,
        codeExample: `let score = 10;
score = 20;              // ✅ Allowed with let
score = score + 5;       // Now score is 25

const MAX = 100;
// MAX = 200;            // ❌ Error: Cannot reassign const`,
        language: 'javascript'
      },
      {
        id: 'scope',
        title: "Variable Scope",
        content: `Scope determines where variables are accessible in your code.

**Global Scope** - accessible everywhere
**Function Scope** - accessible only inside the function
**Block Scope** - accessible only inside the block {}`,
        codeExample: `// Global scope
let globalVar = "I am global";

function test() {
    // Function scope
    let localVar = "I am local";
    console.log(globalVar); // ✅ Accessible
}

if (true) {
    // Block scope
    let blockVar = "Block scoped";
    console.log(blockVar); // ✅ Accessible here
}
// console.log(blockVar); // ❌ Not accessible outside`,
        language: 'javascript'
      },
      {
        id: 'datatypes',
        title: "Data Types",
        content: `JavaScript variables can hold different types of data:

**String** - text data
**Number** - numeric data (integers and decimals)
**Boolean** - true or false values`,
        codeExample: `// String
let firstName = "Ahmed";
let message = \`Hello \${firstName}\`;

// Number
let age = 25;
let price = 99.99;

// Boolean
let isStudent = true;
let hasLicense = false;`,
        language: 'javascript'
      },
      {
        id: 'practice',
        title: "Practice Exercise",
        content: `Try this exercise to practice what you learned:

**Exercise:** Create variables for a student profile
1. Create a constant for the student's name
2. Create a variable for their age
3. Create a variable for their GPA
4. Print all information using template literals`,
        codeExample: `// Your solution here:
const studentName = "Ali";
let studentAge = 20;
let studentGPA = 3.5;

console.log(\`Student: \${studentName}\`);
console.log(\`Age: \${studentAge}\`);
console.log(\`GPA: \${studentGPA}\`);`,
        language: 'javascript'
      }
    ]
  },

  // JavaScript Functions
  {
    id: 'js-functions',
    title: "JavaScript Functions",
    description: "Master JavaScript functions including declarations, expressions, arrow functions, and callbacks",
    language: "javascript",
    difficulty: "beginner",
    order: 2,
    nextTutorialId: 'js-arrays',
    sections: [
      {
        id: 'intro',
        title: "What is a Function?",
        content: `Functions are reusable blocks of code that perform specific tasks. They are one of the fundamental building blocks in JavaScript.

Functions help organize code, make it reusable, and easier to maintain.`,
        codeExample: `function functionName(parameters) {
    // code to be executed
    return value;
}`,
        language: 'javascript'
      },
      {
        id: 'declaration',
        title: "Function Declaration",
        content: `The traditional way to create a function in JavaScript is using the function keyword.

Function declarations are hoisted, meaning they can be called before they are defined in the code.`,
        codeExample: `function greet(name) {
    return "Hello, " + name + "!";
}

console.log(greet("Ali")); // Hello, Ali!

function add(a, b) {
    return a + b;
}

console.log(add(5, 3)); // 8`,
        language: 'javascript'
      },
      {
        id: 'arrow',
        title: "Arrow Functions",
        content: `Arrow functions provide a shorter syntax for writing functions. They were introduced in ES6.

Arrow functions are especially useful for short, simple functions.`,
        codeExample: `// Traditional function
function add(a, b) {
    return a + b;
}

// Arrow function
const add = (a, b) => a + b;

// No parameters
const greet = () => "Hello!";

// One parameter (parentheses optional)
const square = x => x * x;

// Multiple statements
const calculate = (a, b) => {
    const sum = a + b;
    return sum * 2;
};`,
        language: 'javascript'
      },
      {
        id: 'parameters',
        title: "Function Parameters",
        content: `Functions can accept parameters (inputs) and return values (outputs).

You can also set default values for parameters.`,
        codeExample: `// Default parameters
function greet(name = "Guest") {
    return \`Hello, \${name}!\`;
}

console.log(greet());        // Hello, Guest!
console.log(greet("Ahmed")); // Hello, Ahmed!

// Rest parameters
function sum(...numbers) {
    return numbers.reduce((total, num) => total + num, 0);
}

console.log(sum(1, 2, 3, 4)); // 10`,
        language: 'javascript'
      },
      {
        id: 'return',
        title: "Return Statement",
        content: `Functions can return values using the return statement. The return statement stops the execution of a function and sends a value back to the caller.`,
        codeExample: `function multiply(a, b) {
    return a * b;
}

let result = multiply(5, 3);
console.log(result); // 15

function isEven(num) {
    return num % 2 === 0;
}

console.log(isEven(4));  // true
console.log(isEven(7));  // false`,
        language: 'javascript'
      },
      {
        id: 'practice',
        title: "Practice Exercise",
        content: `**Exercise:** Create a function to calculate the area of a rectangle

1. Create a function called calculateArea
2. It should accept width and height as parameters
3. Return the calculated area
4. Test it with different values`,
        codeExample: `// Your solution here:
function calculateArea(width, height) {
    return width * height;
}

console.log(calculateArea(5, 10)); // 50
console.log(calculateArea(3, 7));  // 21

// Bonus: Use arrow function
const calcArea = (w, h) => w * h;
console.log(calcArea(4, 6)); // 24`,
        language: 'javascript'
      }
    ]
  },

  // JavaScript Arrays
  {
    id: 'js-arrays',
    title: "JavaScript Arrays",
    description: "Complete guide to JavaScript arrays including creation, manipulation, and array methods",
    language: "javascript",
    difficulty: "beginner",
    order: 3,
    nextTutorialId: 'js-objects',
    sections: [
      {
        id: 'intro',
        title: "What is an Array?",
        content: `Arrays are used to store multiple values in a single variable. They are one of the most commonly used data structures in JavaScript.

Arrays can hold values of any type, and you can mix different types in the same array.`,
        codeExample: `// Array literal
let fruits = ["apple", "banana", "orange"];

// Array constructor
let numbers = new Array(1, 2, 3, 4, 5);

// Empty array
let empty = [];`,
        language: 'javascript'
      },
      {
        id: 'access',
        title: "Accessing Elements",
        content: `Arrays use zero-based indexing, meaning the first element is at index 0.

You can access elements using square brackets with the index number.`,
        codeExample: `let fruits = ["apple", "banana", "orange"];

console.log(fruits[0]);  // apple
console.log(fruits[1]);  // banana
console.log(fruits[2]);  // orange

// Last element
console.log(fruits[fruits.length - 1]);  // orange

// Negative indexing (ES2022)
console.log(fruits.at(-1));  // orange`,
        language: 'javascript'
      },
      {
        id: 'methods',
        title: "Array Methods",
        content: `JavaScript provides many built-in methods to manipulate arrays.

The most common methods are push, pop, shift, and unshift for adding/removing elements.`,
        codeExample: `let fruits = ["apple", "banana"];

// Add to end
fruits.push("orange");
console.log(fruits);  // ["apple", "banana", "orange"]

// Remove from end
let last = fruits.pop();
console.log(last);    // orange

// Add to beginning
fruits.unshift("mango");
console.log(fruits);  // ["mango", "apple", "banana"]

// Remove from beginning
let first = fruits.shift();
console.log(first);   // mango`,
        language: 'javascript'
      },
      {
        id: 'iteration',
        title: "Array Iteration",
        content: `You can loop through arrays using several methods: forEach, map, filter, and for loops.

These methods make it easy to process each element in an array.`,
        codeExample: `let numbers = [1, 2, 3, 4, 5];

// forEach - execute function for each element
numbers.forEach((num) => {
    console.log(num * 2);
});

// map - creates new array
let doubled = numbers.map((num) => num * 2);
console.log(doubled);  // [2, 4, 6, 8, 10]

// filter - creates new array with elements that pass test
let evens = numbers.filter((num) => num % 2 === 0);
console.log(evens);  // [2, 4]`,
        language: 'javascript'
      },
      {
        id: 'advanced',
        title: "Advanced Methods",
        content: `JavaScript arrays have powerful methods like reduce for transforming arrays into single values.

The reduce method is particularly useful for calculating sums, averages, and other aggregate values.`,
        codeExample: `let numbers = [1, 2, 3, 4, 5];

// reduce - reduces array to single value
let sum = numbers.reduce((total, num) => total + num, 0);
console.log(sum);  // 15

// find - returns first element that matches
let found = numbers.find((num) => num > 3);
console.log(found);  // 4

// sort
let unsorted = [3, 1, 4, 1, 5, 9, 2];
unsorted.sort((a, b) => a - b);
console.log(unsorted);  // [1, 1, 2, 3, 4, 5, 9]`,
        language: 'javascript'
      },
      {
        id: 'practice',
        title: "Practice Exercise",
        content: `**Exercise:** Work with an array of student scores

1. Create an array of test scores
2. Calculate the average score using reduce
3. Filter to find scores above 80
4. Find the highest score`,
        codeExample: `// Your solution here:
let scores = [85, 90, 78, 92, 88, 75];

// Average
let average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
console.log("Average:", average);

// Scores above 80
let highScores = scores.filter(score => score > 80);
console.log("High scores:", highScores);

// Highest score
let max = Math.max(...scores);
console.log("Highest:", max);`,
        language: 'javascript'
      }
    ]
  },

  // JavaScript Objects
  {
    id: 'js-objects',
    title: "JavaScript Objects",
    description: "Understanding JavaScript objects, properties, methods, and object-oriented concepts",
    language: "javascript",
    difficulty: "intermediate",
    order: 4,
    nextTutorialId: 'js-loops',
    sections: [
      {
        id: 'intro',
        title: "What is an Object?",
        content: `Objects are collections of key-value pairs that allow you to store multiple related values together. They are one of JavaScript's fundamental data structures.

Objects can contain properties (data) and methods (functions that operate on that data).`,
        codeExample: `let person = {
  name: "John",
  age: 30,
  city: "New York"
};

console.log(person.name); // "John"`,
        language: 'javascript'
      },
      {
        id: 'creation',
        title: "Creating Objects",
        content: `There are multiple ways to create objects in JavaScript:

**Object Literal** - Most common way
**Constructor Function** - Using new keyword
**Object.create()** - Creating with prototype
**Class Syntax** - Modern ES6+ way`,
        codeExample: `// Object Literal
let car = {
  brand: "Toyota",
  model: "Camry",
  year: 2023
};

// Constructor Function
function Person(name, age) {
  this.name = name;
  this.age = age;
}
let john = new Person("John", 30);

// Class Syntax (ES6+)
class Animal {
  constructor(name) {
    this.name = name;
  }
}
let dog = new Animal("Rex");`,
        language: 'javascript'
      },
      {
        id: 'properties',
        title: "Object Properties",
        content: `You can access and modify object properties using dot notation or bracket notation.

Properties can be added, modified, or deleted dynamically.`,
        codeExample: `let user = {
  name: "Alice",
  age: 25
};

// Dot notation
console.log(user.name); // "Alice"
user.age = 26;

// Bracket notation
console.log(user["name"]); // "Alice"
user["email"] = "alice@example.com";

// Add new property
user.country = "USA";

// Delete property
delete user.age;`,
        language: 'javascript'
      },
      {
        id: 'methods',
        title: "Object Methods",
        content: `Methods are functions stored as object properties. They can access the object's data using the 'this' keyword.`,
        codeExample: `let calculator = {
  value: 0,
  add: function(num) {
    this.value += num;
    return this;
  },
  subtract: function(num) {
    this.value -= num;
    return this;
  },
  result: function() {
    return this.value;
  }
};

calculator.add(10).subtract(3);
console.log(calculator.result()); // 7`,
        language: 'javascript'
      },
      {
        id: 'iteration',
        title: "Iterating Objects",
        content: `You can loop through object properties using for...in, Object.keys(), Object.values(), or Object.entries().`,
        codeExample: `let student = {
  name: "Bob",
  grade: "A",
  score: 95
};

// for...in loop
for (let key in student) {
  console.log(key + ": " + student[key]);
}

// Object.keys()
Object.keys(student).forEach(key => {
  console.log(key);
});

// Object.entries()
Object.entries(student).forEach(([key, value]) => {
  console.log(\`\${key}: \${value}\`);
});`,
        language: 'javascript'
      },
      {
        id: 'practice',
        title: "Practice Exercise",
        content: `Create a book object with properties and methods to demonstrate your understanding.`,
        codeExample: `// Create a book object with:
// - title, author, pages, read (boolean)
// - method: info() returns string description
// - method: markAsRead() sets read to true

let book = {
  title: "The Great Gatsby",
  author: "F. Scott Fitzgerald",
  pages: 180,
  read: false,
  info: function() {
    return \`\${this.title} by \${this.author}, \${this.pages} pages\`;
  },
  markAsRead: function() {
    this.read = true;
  }
};

console.log(book.info());
book.markAsRead();`,
        language: 'javascript'
      }
    ]
  },

  // JavaScript Loops
  {
    id: 'js-loops',
    title: "JavaScript Loops and Iteration",
    description: "Master loops in JavaScript including for, while, do-while, and array iteration methods",
    language: "javascript",
    difficulty: "beginner",
    order: 5,
    nextTutorialId: 'js-conditionals',
    sections: [
      {
        id: 'intro',
        title: "What are Loops?",
        content: `Loops allow you to execute a block of code repeatedly. They are essential for iterating through arrays, processing data, and automating repetitive tasks.

JavaScript provides several types of loops, each suited for different scenarios.`,
        codeExample: `// Basic loop example
for (let i = 0; i < 5; i++) {
  console.log("Count: " + i);
}`,
        language: 'javascript'
      },
      {
        id: 'for-loop',
        title: "For Loop",
        content: `The for loop is the most common loop type. It has three parts: initialization, condition, and increment/decrement.

**Syntax:** for (initialization; condition; increment) { code }`,
        codeExample: `// Basic for loop
for (let i = 0; i < 5; i++) {
  console.log(i); // 0, 1, 2, 3, 4
}

// Looping backwards
for (let i = 5; i > 0; i--) {
  console.log(i); // 5, 4, 3, 2, 1
}

// Skip iteration with continue
for (let i = 0; i < 10; i++) {
  if (i % 2 === 0) continue; // Skip even numbers
  console.log(i); // 1, 3, 5, 7, 9
}

// Exit early with break
for (let i = 0; i < 10; i++) {
  if (i === 5) break;
  console.log(i); // 0, 1, 2, 3, 4
}`,
        language: 'javascript'
      },
      {
        id: 'while-loop',
        title: "While Loop",
        content: `The while loop continues executing as long as its condition is true. It checks the condition before each iteration.

Be careful to avoid infinite loops by ensuring the condition eventually becomes false.`,
        codeExample: `// Basic while loop
let count = 0;
while (count < 5) {
  console.log(count);
  count++;
}

// User input simulation
let password = "";
let attempts = 0;
while (password !== "secret" && attempts < 3) {
  password = getUserInput(); // Hypothetical function
  attempts++;
}`,
        language: 'javascript'
      },
      {
        id: 'do-while',
        title: "Do-While Loop",
        content: `The do-while loop executes the code block at least once before checking the condition. The condition is checked after each iteration.`,
        codeExample: `// Basic do-while loop
let num = 0;
do {
  console.log(num);
  num++;
} while (num < 5);

// Guaranteed to run at least once
let value = 10;
do {
  console.log("This runs once");
  value++;
} while (value < 5); // Condition is false, but code ran`,
        language: 'javascript'
      },
      {
        id: 'foreach',
        title: "Array Iteration",
        content: `Modern JavaScript provides several methods for iterating through arrays: forEach(), map(), filter(), and for...of.`,
        codeExample: `let fruits = ["apple", "banana", "orange"];

// forEach - execute function for each element
fruits.forEach(fruit => {
  console.log(fruit);
});

// for...of - iterate over values
for (let fruit of fruits) {
  console.log(fruit);
}

// map - transform array elements
let upper = fruits.map(f => f.toUpperCase());
console.log(upper); // ["APPLE", "BANANA", "ORANGE"]

// filter - select elements
let long = fruits.filter(f => f.length > 5);
console.log(long); // ["banana", "orange"]`,
        language: 'javascript'
      },
      {
        id: 'practice',
        title: "Practice Exercise",
        content: `Practice using different loop types to solve common programming challenges.`,
        codeExample: `// 1. Sum numbers from 1 to 100
let sum = 0;
for (let i = 1; i <= 100; i++) {
  sum += i;
}
console.log("Sum:", sum); // 5050

// 2. Find even numbers in array
let numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
let evens = numbers.filter(n => n % 2 === 0);
console.log(evens); // [2, 4, 6, 8, 10]

// 3. Multiplication table
for (let i = 1; i <= 10; i++) {
  console.log(\`5 x \${i} = \${5 * i}\`);
}`,
        language: 'javascript'
      }
    ]
  },

  // JavaScript Conditionals
  {
    id: 'js-conditionals',
    title: "JavaScript Conditionals",
    description: "Learn conditional statements: if, else, else if, switch, and ternary operators",
    language: "javascript",
    difficulty: "beginner",
    order: 6,
    sections: [
      {
        id: 'intro',
        title: "What are Conditionals?",
        content: `Conditional statements allow your code to make decisions and execute different blocks of code based on conditions.

They are fundamental to creating dynamic, responsive programs that can handle different scenarios.`,
        codeExample: `let age = 18;
if (age >= 18) {
  console.log("Adult");
} else {
  console.log("Minor");
}`,
        language: 'javascript'
      },
      {
        id: 'if-else',
        title: "If-Else Statements",
        content: `The if statement executes code when a condition is true. The else statement provides an alternative when the condition is false.

You can chain multiple conditions using else if.`,
        codeExample: `let score = 85;

if (score >= 90) {
  console.log("Grade: A");
} else if (score >= 80) {
  console.log("Grade: B");
} else if (score >= 70) {
  console.log("Grade: C");
} else if (score >= 60) {
  console.log("Grade: D");
} else {
  console.log("Grade: F");
}

// Single line if (no braces needed)
if (score >= 60) console.log("Passed");`,
        language: 'javascript'
      },
      {
        id: 'comparison',
        title: "Comparison Operators",
        content: `Comparison operators are used in conditionals to compare values.

**Operators:** == (equal), === (strict equal), != (not equal), !== (strict not equal), > (greater), < (less), >= (greater or equal), <= (less or equal)`,
        codeExample: `let x = 5;
let y = "5";

// Loose equality (converts types)
console.log(x == y);   // true

// Strict equality (no conversion)
console.log(x === y);  // false

// Other comparisons
console.log(x > 3);    // true
console.log(x <= 10);  // true
console.log(x !== y);  // true`,
        language: 'javascript'
      },
      {
        id: 'logical',
        title: "Logical Operators",
        content: `Logical operators combine multiple conditions: && (AND), || (OR), ! (NOT).

These allow you to create complex conditional logic.`,
        codeExample: `let age = 25;
let hasLicense = true;

// AND - both must be true
if (age >= 18 && hasLicense) {
  console.log("Can drive");
}

// OR - at least one must be true
let isWeekend = true;
let isHoliday = false;
if (isWeekend || isHoliday) {
  console.log("Day off!");
}

// NOT - inverts boolean
if (!hasLicense) {
  console.log("Cannot drive");
}`,
        language: 'javascript'
      },
      {
        id: 'switch',
        title: "Switch Statement",
        content: `The switch statement is useful when you have multiple conditions based on the same variable. It's often cleaner than multiple if-else statements.`,
        codeExample: `let day = "Monday";

switch (day) {
  case "Monday":
    console.log("Start of work week");
    break;
  case "Friday":
    console.log("TGIF!");
    break;
  case "Saturday":
  case "Sunday":
    console.log("Weekend!");
    break;
  default:
    console.log("Midweek day");
}`,
        language: 'javascript'
      },
      {
        id: 'ternary',
        title: "Ternary Operator",
        content: `The ternary operator is a shorthand for simple if-else statements. Syntax: condition ? valueIfTrue : valueIfFalse`,
        codeExample: `let age = 20;

// Traditional if-else
let status;
if (age >= 18) {
  status = "adult";
} else {
  status = "minor";
}

// Ternary operator (same result)
let status2 = age >= 18 ? "adult" : "minor";

// Can be nested (but be careful with readability)
let grade = score >= 90 ? "A" : score >= 80 ? "B" : "C";`,
        language: 'javascript'
      }
    ]
  },

  // Python Variables
  {
    id: 'python-variables',
    title: "Python Variables and Data Types",
    description: "Introduction to Python variables, data types, and type conversion",
    language: "python",
    difficulty: "beginner",
    order: 1,
    nextTutorialId: 'python-functions',
    sections: [
      {
        id: 'intro',
        title: "What are Variables?",
        content: `Variables in Python are containers for storing data values. Python is dynamically typed, meaning you don't need to declare variable types explicitly.

Variables are created the moment you assign a value to them.`,
        codeExample: `x = 5
name = "Ali"
is_student = True`,
        language: 'python'
      },
      {
        id: 'naming',
        title: "Variable Naming Rules",
        content: `Python has specific rules for naming variables:

1. Must start with a letter or underscore
2. Cannot start with a number
3. Can only contain alphanumeric characters and underscores (A-z, 0-9, _)
4. Case-sensitive (name ≠ Name)
5. Cannot use Python keywords`,
        codeExample: `# Valid names
my_var = 10
_private = 20
userName = "John"
age2 = 25

# Invalid names (will cause errors)
# 2age = 25      # Cannot start with number
# my-var = 10    # Cannot use hyphens
# class = "A"    # Cannot use keywords`,
        language: 'python'
      },
      {
        id: 'datatypes',
        title: "Data Types",
        content: `Python has several built-in data types:

**Numeric** - int, float, complex
**String** - text data
**Boolean** - True or False
**List** - ordered, mutable collection
**Tuple** - ordered, immutable collection
**Dictionary** - key-value pairs`,
        codeExample: `# Integer
age = 25

# Float
price = 99.99

# String
name = "Ahmed"

# Boolean
is_active = True

# List
fruits = ["apple", "banana", "orange"]

# Dictionary
person = {"name": "Sara", "age": 22}`,
        language: 'python'
      },
      {
        id: 'strings',
        title: "Working with Strings",
        content: `Strings in Python are sequences of characters. You can use single or double quotes.

f-strings (formatted strings) are the modern way to format text in Python.`,
        codeExample: `name = "Ahmed"
age = 20

# String concatenation
message = "Hello, " + name

# f-strings (recommended)
message = f"My name is {name} and I'm {age} years old"
print(message)

# Multiline strings
text = """This is
a multiline
string"""`,
        language: 'python'
      },
      {
        id: 'conversion',
        title: "Type Conversion",
        content: `You can convert between different data types using type conversion functions.

Common conversion functions: int(), float(), str(), bool()`,
        codeExample: `# String to Integer
age_str = "25"
age_int = int(age_str)
print(age_int + 5)  # 30

# Integer to String
num = 100
num_str = str(num)
print("The number is: " + num_str)

# String to Float
price_str = "99.99"
price_float = float(price_str)
print(price_float)  # 99.99`,
        language: 'python'
      },
      {
        id: 'practice',
        title: "Practice Exercise",
        content: `**Exercise:** Create a personal information program

1. Create variables for name, age, height
2. Use f-strings to display the information
3. Calculate BMI if given weight and height
4. Convert types as needed`,
        codeExample: `# Your solution here:
name = "Ali"
age = 20
height = 1.75  # meters
weight = 70    # kg

# Display information
print(f"Name: {name}")
print(f"Age: {age}")
print(f"Height: {height}m")

# Calculate BMI
bmi = weight / (height ** 2)
print(f"BMI: {bmi:.2f}")`,
        language: 'python'
      }
    ]
  },

  // Python Functions
  {
    id: 'python-functions',
    title: "Python Functions",
    description: "Learn about Python functions, parameters, return values, and lambda functions",
    language: "python",
    difficulty: "beginner",
    order: 2,
    nextTutorialId: 'python-lists',
    sections: [
      {
        id: 'intro',
        title: "What are Functions?",
        content: `Functions are reusable blocks of code that perform specific tasks. They help organize code and make it more maintainable.

In Python, functions are defined using the def keyword.`,
        codeExample: `def function_name(parameters):
    """Docstring describing the function"""
    # function body
    return value`,
        language: 'python'
      },
      {
        id: 'basic',
        title: "Creating Functions",
        content: `To create a function in Python:
1. Use the def keyword
2. Give it a name
3. Add parameters in parentheses
4. Write the function body (indented)
5. Optionally return a value`,
        codeExample: `def greet(name):
    return f"Hello, {name}!"

print(greet("Ali"))  # Hello, Ali!

def add(a, b):
    return a + b

result = add(5, 3)
print(result)  # 8`,
        language: 'python'
      },
      {
        id: 'parameters',
        title: "Function Parameters",
        content: `Python functions support several types of parameters:

**Default parameters** - provide default values
**Keyword arguments** - specify arguments by name
***args** - accept variable number of arguments
****kwargs** - accept variable number of keyword arguments`,
        codeExample: `# Default parameters
def greet(name="Guest"):
    return f"Hello, {name}!"

print(greet())        # Hello, Guest!
print(greet("Ahmed")) # Hello, Ahmed!

# Keyword arguments
def describe(name, age, city):
    return f"{name} is {age} from {city}"

print(describe(name="Ali", city="Nablus", age=20))

# *args
def sum_all(*numbers):
    return sum(numbers)

print(sum_all(1, 2, 3, 4))  # 10`,
        language: 'python'
      },
      {
        id: 'return',
        title: "Return Values",
        content: `Functions can return values using the return statement. You can even return multiple values using tuples.

If no return statement is used, the function returns None.`,
        codeExample: `def multiply(a, b):
    return a * b

result = multiply(5, 3)
print(result)  # 15

# Return multiple values
def get_stats(numbers):
    return min(numbers), max(numbers), sum(numbers)

min_val, max_val, total = get_stats([1, 2, 3, 4, 5])
print(f"Min: {min_val}, Max: {max_val}, Total: {total}")`,
        language: 'python'
      },
      {
        id: 'lambda',
        title: "Lambda Functions",
        content: `Lambda functions are small anonymous functions that can have any number of parameters but only one expression.

They are useful for short, simple operations.`,
        codeExample: `# Regular function
def square(x):
    return x ** 2

# Lambda function
square_lambda = lambda x: x ** 2

print(square(5))         # 25
print(square_lambda(5))  # 25

# Lambda with multiple parameters
add = lambda a, b: a + b
print(add(3, 4))  # 7

# Using lambda with map
numbers = [1, 2, 3, 4, 5]
doubled = list(map(lambda x: x * 2, numbers))
print(doubled)  # [2, 4, 6, 8, 10]`,
        language: 'python'
      },
      {
        id: 'practice',
        title: "Practice Exercise",
        content: `**Exercise:** Create a temperature converter

1. Create a function celsius_to_fahrenheit
2. Create a function fahrenheit_to_celsius
3. Test both functions with different values
4. Bonus: Create a lambda function to check if a number is even`,
        codeExample: `# Your solution here:
def celsius_to_fahrenheit(celsius):
    return (celsius * 9/5) + 32

def fahrenheit_to_celsius(fahrenheit):
    return (fahrenheit - 32) * 5/9

print(celsius_to_fahrenheit(25))   # 77.0
print(fahrenheit_to_celsius(77))   # 25.0

# Bonus: Lambda function
is_even = lambda x: x % 2 == 0
print(is_even(4))   # True
print(is_even(7))   # False`,
        language: 'python'
      }
    ]
  },

  // Python Lists
  {
    id: 'python-lists',
    title: "Python Lists and Collections",
    description: "Master Python lists, tuples, sets, and dictionaries",
    language: "python",
    difficulty: "beginner",
    order: 3,
    nextTutorialId: 'python-loops',
    sections: [
      {
        id: 'intro',
        title: "Python Lists",
        content: `Lists are ordered, mutable collections that can store multiple items. They are one of the most versatile data structures in Python.

Lists can contain different data types and can be modified after creation.`,
        codeExample: `# Creating lists
fruits = ["apple", "banana", "orange"]
numbers = [1, 2, 3, 4, 5]
mixed = [1, "hello", 3.14, True]

# Accessing elements
print(fruits[0])   # "apple"
print(fruits[-1])  # "orange" (last item)

# Slicing
print(numbers[1:4])  # [2, 3, 4]`,
        language: 'python'
      },
      {
        id: 'methods',
        title: "List Methods",
        content: `Python lists come with many built-in methods for adding, removing, and manipulating elements.`,
        codeExample: `fruits = ["apple", "banana"]

# Adding elements
fruits.append("orange")        # Add to end
fruits.insert(1, "mango")     # Insert at index
fruits.extend(["grape", "kiwi"])  # Add multiple

# Removing elements
fruits.remove("banana")        # Remove by value
popped = fruits.pop()         # Remove last item
fruits.pop(0)                 # Remove by index

# Other operations
fruits.sort()                 # Sort in place
fruits.reverse()              # Reverse in place
print(len(fruits))            # Length`,
        language: 'python'
      },
      {
        id: 'comprehension',
        title: "List Comprehension",
        content: `List comprehension provides a concise way to create lists based on existing lists or ranges.`,
        codeExample: `# Basic list comprehension
squares = [x**2 for x in range(10)]
print(squares)  # [0, 1, 4, 9, 16, 25, 36, 49, 64, 81]

# With condition
evens = [x for x in range(20) if x % 2 == 0]
print(evens)  # [0, 2, 4, 6, 8, 10, 12, 14, 16, 18]

# Transform strings
fruits = ["apple", "banana", "orange"]
upper = [fruit.upper() for fruit in fruits]
print(upper)  # ['APPLE', 'BANANA', 'ORANGE']`,
        language: 'python'
      },
      {
        id: 'tuples',
        title: "Tuples",
        content: `Tuples are immutable sequences. Once created, they cannot be modified. They're useful for data that shouldn't change.`,
        codeExample: `# Creating tuples
point = (10, 20)
rgb = (255, 0, 128)
person = ("John", 30, "Engineer")

# Accessing elements
print(point[0])   # 10

# Tuple unpacking
x, y = point
name, age, job = person
print(name)  # "John"

# Tuples are immutable
# point[0] = 15  # This would raise an error`,
        language: 'python'
      },
      {
        id: 'dictionaries',
        title: "Dictionaries",
        content: `Dictionaries store key-value pairs. They are unordered, mutable collections that allow fast lookup by key.`,
        codeExample: `# Creating dictionaries
student = {
    "name": "Alice",
    "age": 20,
    "grade": "A"
}

# Accessing values
print(student["name"])      # "Alice"
print(student.get("age"))   # 20

# Adding/modifying
student["email"] = "alice@example.com"
student["age"] = 21

# Iterating
for key, value in student.items():
    print(f"{key}: {value}")

# Dictionary methods
keys = student.keys()
values = student.values()`,
        language: 'python'
      },
      {
        id: 'practice',
        title: "Practice Exercise",
        content: `Practice working with different Python collection types.`,
        codeExample: `# 1. Create list of squares using comprehension
squares = [x**2 for x in range(1, 11)]
print(squares)

# 2. Dictionary for student grades
grades = {
    "Alice": 95,
    "Bob": 87,
    "Charlie": 92
}

# Calculate average
average = sum(grades.values()) / len(grades)
print(f"Average grade: {average}")

# 3. Filter and transform
numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
even_squares = [x**2 for x in numbers if x % 2 == 0]
print(even_squares)  # [4, 16, 36, 64, 100]`,
        language: 'python'
      }
    ]
  },

  // Python Loops
  {
    id: 'python-loops',
    title: "Python Loops and Iteration",
    description: "Learn Python for loops, while loops, and iteration techniques",
    language: "python",
    difficulty: "beginner",
    order: 4,
    nextTutorialId: 'python-conditionals',
    sections: [
      {
        id: 'intro',
        title: "Python Loops Overview",
        content: `Loops allow you to repeat code multiple times. Python provides for loops and while loops for different iteration scenarios.`,
        codeExample: `# Basic for loop
for i in range(5):
    print(i)  # 0, 1, 2, 3, 4

# Loop through list
fruits = ["apple", "banana", "orange"]
for fruit in fruits:
    print(fruit)`,
        language: 'python'
      },
      {
        id: 'for-loop',
        title: "For Loops",
        content: `Python's for loop iterates over sequences (lists, tuples, strings, ranges). It's the most commonly used loop type.`,
        codeExample: `# Range with start, stop, step
for i in range(0, 10, 2):
    print(i)  # 0, 2, 4, 6, 8

# Enumerate - get index and value
fruits = ["apple", "banana", "orange"]
for index, fruit in enumerate(fruits):
    print(f"{index}: {fruit}")

# Iterate string
for char in "Hello":
    print(char)

# Break and continue
for i in range(10):
    if i == 5:
        break  # Exit loop
    if i % 2 == 0:
        continue  # Skip even numbers
    print(i)  # 1, 3`,
        language: 'python'
      },
      {
        id: 'while-loop',
        title: "While Loops",
        content: `While loops continue executing as long as a condition is true. They're useful when you don't know how many iterations you need.`,
        codeExample: `# Basic while loop
count = 0
while count < 5:
    print(count)
    count += 1

# User input loop
password = ""
while password != "secret":
    password = input("Enter password: ")
    
# Infinite loop with break
while True:
    user_input = input("Enter 'quit' to exit: ")
    if user_input == "quit":
        break
    print(f"You entered: {user_input}")`,
        language: 'python'
      },
      {
        id: 'nested',
        title: "Nested Loops",
        content: `You can place loops inside other loops. This is useful for working with multi-dimensional data or generating patterns.`,
        codeExample: `# Multiplication table
for i in range(1, 6):
    for j in range(1, 6):
        print(f"{i} x {j} = {i*j}")
    print()  # Blank line

# Pattern printing
for i in range(1, 6):
    print("* " * i)

# 2D list iteration
matrix = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
for row in matrix:
    for num in row:
        print(num, end=" ")
    print()`,
        language: 'python'
      },
      {
        id: 'comprehensions',
        title: "Loop Alternatives",
        content: `Python offers concise alternatives to loops: list comprehensions, map(), filter(), and generator expressions.`,
        codeExample: `# List comprehension vs loop
numbers = [1, 2, 3, 4, 5]

# Traditional loop
squares = []
for n in numbers:
    squares.append(n**2)

# List comprehension (better)
squares = [n**2 for n in numbers]

# map() function
squares = list(map(lambda x: x**2, numbers))

# filter() function
evens = list(filter(lambda x: x % 2 == 0, numbers))

# Generator expression (memory efficient)
sum_of_squares = sum(n**2 for n in range(1000000))`,
        language: 'python'
      },
      {
        id: 'practice',
        title: "Practice Exercise",
        content: `Practice using loops to solve common problems.`,
        codeExample: `# 1. Sum of numbers 1 to 100
total = sum(range(1, 101))
print(f"Sum: {total}")  # 5050

# 2. Fibonacci sequence
fib = [0, 1]
for i in range(8):
    fib.append(fib[-1] + fib[-2])
print(fib)  # [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]

# 3. Count vowels in string
text = "Hello World"
vowels = "aeiouAEIOU"
count = sum(1 for char in text if char in vowels)
print(f"Vowels: {count}")  # 3`,
        language: 'python'
      }
    ]
  },

  // Python Conditionals
  {
    id: 'python-conditionals',
    title: "Python Conditional Statements",
    description: "Master if, elif, else statements and conditional expressions in Python",
    language: "python",
    difficulty: "beginner",
    order: 5,
    sections: [
      {
        id: 'intro',
        title: "Conditional Statements",
        content: `Conditional statements allow your program to make decisions and execute different code based on conditions.

Python uses if, elif, and else for conditional logic.`,
        codeExample: `age = 18

if age >= 18:
    print("Adult")
else:
    print("Minor")`,
        language: 'python'
      },
      {
        id: 'if-elif-else',
        title: "If-Elif-Else",
        content: `Use if for the first condition, elif for additional conditions, and else for when no conditions are met.

Note: Python uses indentation (usually 4 spaces) instead of braces.`,
        codeExample: `score = 85

if score >= 90:
    print("Grade: A")
elif score >= 80:
    print("Grade: B")
elif score >= 70:
    print("Grade: C")
elif score >= 60:
    print("Grade: D")
else:
    print("Grade: F")

# Multiple conditions
age = 25
has_license = True

if age >= 18 and has_license:
    print("Can drive")`,
        language: 'python'
      },
      {
        id: 'comparison',
        title: "Comparison Operators",
        content: `Python supports all standard comparison operators: == (equal), != (not equal), > (greater), < (less), >= (greater or equal), <= (less or equal)

Python also has 'is' for identity comparison and 'in' for membership testing.`,
        codeExample: `# Comparison operators
x = 5
print(x == 5)   # True
print(x != 3)   # True
print(x > 3)    # True
print(x <= 10)  # True

# Identity (same object)
a = [1, 2, 3]
b = a
c = [1, 2, 3]
print(a is b)   # True
print(a is c)   # False (different objects)
print(a == c)   # True (same values)

# Membership
fruits = ["apple", "banana"]
print("apple" in fruits)  # True`,
        language: 'python'
      },
      {
        id: 'logical',
        title: "Logical Operators",
        content: `Python uses 'and', 'or', and 'not' for logical operations. These are more readable than symbolic operators.`,
        codeExample: `# AND - both must be True
age = 25
income = 50000
if age >= 18 and income > 30000:
    print("Eligible for loan")

# OR - at least one must be True
is_weekend = True
is_holiday = False
if is_weekend or is_holiday:
    print("Day off!")

# NOT - inverts boolean
is_raining = False
if not is_raining:
    print("Go outside!")

# Combining operators
x = 15
if (x > 10 and x < 20) or x == 5:
    print("Condition met")`,
        language: 'python'
      },
      {
        id: 'ternary',
        title: "Conditional Expressions",
        content: `Python's ternary operator (conditional expression) provides a concise way to write simple if-else statements in one line.

Syntax: value_if_true if condition else value_if_false`,
        codeExample: `# Traditional if-else
age = 20
if age >= 18:
    status = "adult"
else:
    status = "minor"

# Ternary operator (same result)
status = "adult" if age >= 18 else "minor"

# Useful in assignments
max_value = x if x > y else y

# Can be nested (but be careful)
score = 85
grade = "A" if score >= 90 else "B" if score >= 80 else "C"

# In function returns
def abs_value(num):
    return num if num >= 0 else -num`,
        language: 'python'
      },
      {
        id: 'practice',
        title: "Practice Exercise",
        content: `Practice using conditional statements to solve problems.`,
        codeExample: `# 1. Check if number is positive, negative, or zero
num = 5
if num > 0:
    print("Positive")
elif num < 0:
    print("Negative")
else:
    print("Zero")

# 2. Leap year checker
year = 2024
is_leap = (year % 4 == 0 and year % 100 != 0) or (year % 400 == 0)
print(f"{year} is leap year: {is_leap}")

# 3. Grade calculator with ternary
def get_grade(score):
    return "A" if score >= 90 else "B" if score >= 80 else "C" if score >= 70 else "D" if score >= 60 else "F"

print(get_grade(85))  # B`,
        language: 'python'
      }
    ]
  },

  // Java Variables
  {
    id: 'java-variables',
    title: "Java Variables and Data Types",
    description: "Learn about Java variables, primitive data types, and type casting",
    language: "java",
    difficulty: "beginner",
    order: 1,
    sections: [
      {
        id: 'intro',
        title: "Introduction to Variables",
        content: `In Java, variables must be declared with a specific data type before they can be used. Java is a strongly-typed language.

This means Java checks variable types at compile time, preventing many errors.`,
        codeExample: `dataType variableName = value;`,
        language: 'java'
      },
      {
        id: 'primitive',
        title: "Primitive Data Types",
        content: `Java has 8 primitive data types:

**Integer Types**: byte, short, int, long
**Floating-Point Types**: float, double
**Character**: char
**Boolean**: boolean`,
        codeExample: `// Integer types
byte smallNumber = 127;       // 8-bit
short mediumNumber = 32000;   // 16-bit
int number = 100000;          // 32-bit
long bigNumber = 9876543210L; // 64-bit

// Floating-point types
float price = 19.99f;  // 32-bit
double pi = 3.14159;   // 64-bit

// Character and Boolean
char grade = 'A';
boolean isStudent = true;`,
        language: 'java'
      },
      {
        id: 'reference',
        title: "Reference Types",
        content: `Reference types include String, Arrays, and Objects.

Strings are the most commonly used reference type in Java.`,
        codeExample: `// String
String firstName = "Ali";
String lastName = "Hassan";
String fullName = firstName + " " + lastName;

// String methods
System.out.println(fullName.length());
System.out.println(fullName.toUpperCase());

// Arrays
int[] numbers = {1, 2, 3, 4, 5};
String[] fruits = new String[3];
fruits[0] = "Apple";
fruits[1] = "Banana";
fruits[2] = "Orange";`,
        language: 'java'
      },
      {
        id: 'casting',
        title: "Type Casting",
        content: `Type casting is converting a value from one data type to another.

**Widening** (automatic) - smaller to larger type
**Narrowing** (manual) - larger to smaller type`,
        codeExample: `// Widening (Automatic)
int myInt = 9;
double myDouble = myInt;
System.out.println(myDouble);  // 9.0

// Narrowing (Manual)
double myDouble2 = 9.78;
int myInt2 = (int) myDouble2;
System.out.println(myInt2);  // 9`,
        language: 'java'
      },
      {
        id: 'constants',
        title: "Constants",
        content: `Constants are variables whose values cannot be changed once assigned.

Use the final keyword to declare constants.`,
        codeExample: `final double PI = 3.14159;
final int MAX_STUDENTS = 30;

// PI = 3.14;  // Error: Cannot reassign final variable`,
        language: 'java'
      },
      {
        id: 'practice',
        title: "Practice Exercise",
        content: `**Exercise:** Create a student record program

1. Declare variables for student name, age, and GPA
2. Calculate if the student passes (GPA >= 2.0)
3. Display all information
4. Use appropriate data types`,
        codeExample: `// Your solution here:
public class Main {
    public static void main(String[] args) {
        String studentName = "Ahmed";
        int studentAge = 20;
        double studentGPA = 3.5;
        
        boolean passes = studentGPA >= 2.0;
        
        System.out.println("Name: " + studentName);
        System.out.println("Age: " + studentAge);
        System.out.println("GPA: " + studentGPA);
        System.out.println("Passes: " + passes);
    }
}`,
        language: 'java'
      }
    ]
  },

  // C++ Basics
  {
    id: 'cpp-basics',
    title: "C++ Basics and Variables",
    description: "Introduction to C++ programming, variables, and data types",
    language: "cpp",
    difficulty: "beginner",
    order: 1,
    sections: [
      {
        id: 'intro',
        title: "Introduction to C++",
        content: `C++ is a powerful general-purpose programming language. It's an extension of C with object-oriented features.

C++ is used for system programming, game development, and performance-critical applications.`,
        codeExample: `#include <iostream>
using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    return 0;
}`,
        language: 'cpp'
      },
      {
        id: 'variables',
        title: "Variables and Data Types",
        content: `C++ variables must be declared with a specific type before use.

Common data types include int, double, char, bool, and string.`,
        codeExample: `int age = 25;
double price = 99.99;
char grade = 'A';
bool isActive = true;
string name = "Ahmed";`,
        language: 'cpp'
      },
      {
        id: 'io',
        title: "Input and Output",
        content: `C++ uses cout for output and cin for input.

cout sends data to the console, cin receives data from the user.`,
        codeExample: `#include <iostream>
using namespace std;

int main() {
    string name;
    int age;
    
    cout << "Enter your name: ";
    cin >> name;
    
    cout << "Enter your age: ";
    cin >> age;
    
    cout << "Hello " << name;
    cout << ", you are " << age << " years old" << endl;
    
    return 0;
}`,
        language: 'cpp'
      },
      {
        id: 'arrays',
        title: "Arrays",
        content: `Arrays in C++ store multiple values of the same type.

Arrays have a fixed size that must be specified at declaration.`,
        codeExample: `int numbers[5] = {1, 2, 3, 4, 5};
string fruits[] = {"apple", "banana", "orange"};

cout << numbers[0] << endl;  // 1
cout << fruits[1] << endl;   // banana

// Array size
int size = sizeof(numbers) / sizeof(numbers[0]);
cout << "Array size: " << size << endl;`,
        language: 'cpp'
      },
      {
        id: 'constants',
        title: "Constants",
        content: `Constants are values that cannot be modified after declaration.

Use the const keyword to declare constants.`,
        codeExample: `const double PI = 3.14159;
const int MAX_SIZE = 100;

// PI = 3.14;  // Error: Cannot modify const`,
        language: 'cpp'
      },
      {
        id: 'practice',
        title: "Practice Exercise",
        content: `**Exercise:** Create a simple calculator

1. Declare two integer variables
2. Calculate their sum, difference, product
3. Display the results
4. Use appropriate data types`,
        codeExample: `// Your solution here:
#include <iostream>
using namespace std;

int main() {
    int a = 10, b = 5;
    
    int sum = a + b;
    int diff = a - b;
    int prod = a * b;
    
    cout << "Sum: " << sum << endl;
    cout << "Difference: " << diff << endl;
    cout << "Product: " << prod << endl;
    
    return 0;
}`,
        language: 'cpp'
      }
    ]
  }
];
