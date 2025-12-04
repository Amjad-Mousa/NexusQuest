export const defaultTutorials = [
  {
    id: 'js-variables',
    title: "JavaScript Variables",
    description: "Learn about variables in JavaScript including let, const, var, scope, and data types",
    language: "javascript",
    difficulty: "beginner" as const,
    order: 1,
    content: `# JavaScript Variables

Variables are used to store data values. JavaScript uses three keywords to declare variables: \`var\`, \`let\`, and \`const\`.

## Table of Contents
- What is a Variable?
- Variable Declaration
- Variable Assignment
- Variable Scope
- Data Types
- Examples
- Practice Problems

## What is a Variable?

A variable is a named storage location in memory that holds a value. Think of it as a labeled box where you can store and retrieve data.

**Syntax:**
\`\`\`javascript
let variableName = value;
\`\`\`

## Variable Declaration

### 1. Using let (ES6)
\`let\` declares a block-scoped variable that can be reassigned.

\`\`\`javascript
let x = 10;
let name = "John";
let isActive = true;
\`\`\`

### 2. Using const (ES6)
\`const\` declares a block-scoped constant that cannot be reassigned.

\`\`\`javascript
const PI = 3.14159;
const MAX_SIZE = 100;
\`\`\`

### 3. Using var (Legacy)
\`var\` declares a function-scoped or globally-scoped variable. **Not recommended in modern JavaScript.**

\`\`\`javascript
var age = 25;
\`\`\`

## Variable Assignment

### Initial Assignment
\`\`\`javascript
let count = 0;           // Declare and assign
const name = "Alice";    // Declare and assign constant
\`\`\`

### Reassignment
\`\`\`javascript
let score = 10;
score = 20;              // Allowed with let
score = score + 5;       // Now score is 25

const MAX = 100;
// MAX = 200;            // ❌ Error: Cannot reassign const
\`\`\`

## Variable Scope

### Global Scope
Variables declared outside any function or block have global scope.

\`\`\`javascript
let globalVar = "I am global";

function test() {
    console.log(globalVar); // Accessible
}
\`\`\`

### Function Scope
Variables declared inside a function are local to that function.

\`\`\`javascript
function myFunction() {
    let localVar = "I am local";
    console.log(localVar); // Accessible here
}
// console.log(localVar); // ❌ Error: Not accessible outside
\`\`\`

### Block Scope
\`let\` and \`const\` are block-scoped (limited to \`{}\` blocks).

\`\`\`javascript
if (true) {
    let blockVar = "Block scoped";
    console.log(blockVar); // Accessible here
}
// console.log(blockVar); // ❌ Error: Not accessible outside
\`\`\`

## Data Types

JavaScript variables can hold different data types:

### Primitive Types

**String:**
\`\`\`javascript
let firstName = "Ahmed";
let lastName = 'Ali';
let message = \`Hello \${firstName}\`; // Template literal
\`\`\`

**Number:**
\`\`\`javascript
let age = 25;
let price = 99.99;
let negative = -10;
\`\`\`

**Boolean:**
\`\`\`javascript
let isStudent = true;
let hasLicense = false;
\`\`\`

## Examples

### Example 1: Basic Variable Usage
\`\`\`javascript
let name = "Ali";
let age = 20;
let city = "Nablus";

console.log(name);  // Ali
console.log(age);   // 20
console.log(city);  // Nablus
\`\`\`

### Example 2: Variable Reassignment
\`\`\`javascript
let count = 0;
console.log("Initial:", count);  // Initial: 0

count = 5;
console.log("After update:", count);  // After update: 5
\`\`\`

## Practice Problems

### Problem 1: Variable Swap
Swap the values of two variables.

\`\`\`javascript
let a = 5;
let b = 10;

[a, b] = [b, a];

console.log(a); // 10
console.log(b); // 5
\`\`\`

## Key Points to Remember

✅ Use \`const\` by default
✅ Use \`let\` only when you need to reassign
✅ Avoid using \`var\` in modern JavaScript
✅ Variable names should be descriptive
✅ Follow camelCase naming convention

## Summary

Variables are fundamental to JavaScript programming. Use \`let\` for values that change and \`const\` for constants. Always follow naming conventions and understand variable scope to write clean, maintainable code.

**Next Tutorial:** JavaScript Data Types and Operators`
  },
  {
    id: 'js-functions',
    title: "JavaScript Functions",
    description: "Master JavaScript functions including function declarations, expressions, arrow functions, and callbacks",
    language: "javascript",
    difficulty: "beginner" as const,
    order: 2,
    content: `# JavaScript Functions

Functions are reusable blocks of code that perform specific tasks. They are one of the fundamental building blocks in JavaScript.

## What is a Function?

A function is a set of statements that performs a task or calculates a value. Functions help organize code and make it reusable.

**Basic Syntax:**
\`\`\`javascript
function functionName(parameters) {
    // code to be executed
    return value;
}
\`\`\`

## Function Declaration

\`\`\`javascript
function greet(name) {
    return "Hello, " + name + "!";
}

console.log(greet("Ali")); // Hello, Ali!
\`\`\`

## Function Expression

\`\`\`javascript
const greet = function(name) {
    return "Hello, " + name + "!";
};

console.log(greet("Sara")); // Hello, Sara!
\`\`\`

## Arrow Functions (ES6)

Arrow functions provide a shorter syntax for writing functions.

\`\`\`javascript
// Traditional function
function add(a, b) {
    return a + b;
}

// Arrow function
const add = (a, b) => a + b;

console.log(add(5, 3)); // 8
\`\`\`

### Arrow Function Variations

\`\`\`javascript
// No parameters
const greet = () => "Hello!";

// One parameter (parentheses optional)
const square = x => x * x;

// Multiple parameters
const multiply = (a, b) => a * b;

// Multiple statements (need curly braces and return)
const calculate = (a, b) => {
    const sum = a + b;
    return sum * 2;
};
\`\`\`

## Function Parameters

### Default Parameters
\`\`\`javascript
function greet(name = "Guest") {
    return \`Hello, \${name}!\`;
}

console.log(greet());        // Hello, Guest!
console.log(greet("Ahmed")); // Hello, Ahmed!
\`\`\`

### Rest Parameters
\`\`\`javascript
function sum(...numbers) {
    return numbers.reduce((total, num) => total + num, 0);
}

console.log(sum(1, 2, 3, 4)); // 10
\`\`\`

## Return Statement

Functions can return values using the \`return\` statement.

\`\`\`javascript
function multiply(a, b) {
    return a * b;
}

let result = multiply(5, 3);
console.log(result); // 15
\`\`\`

## Examples

### Example 1: Calculate Area
\`\`\`javascript
function calculateArea(width, height) {
    return width * height;
}

console.log(calculateArea(5, 10)); // 50
\`\`\`

### Example 2: Check Even/Odd
\`\`\`javascript
const isEven = (num) => num % 2 === 0;

console.log(isEven(4));  // true
console.log(isEven(7));  // false
\`\`\`

### Example 3: Find Maximum
\`\`\`javascript
function findMax(arr) {
    return Math.max(...arr);
}

console.log(findMax([1, 5, 3, 9, 2])); // 9
\`\`\`

## Practice Problems

### Problem 1: Celsius to Fahrenheit
\`\`\`javascript
function celsiusToFahrenheit(celsius) {
    return (celsius * 9/5) + 32;
}

console.log(celsiusToFahrenheit(0));   // 32
console.log(celsiusToFahrenheit(100)); // 212
\`\`\`

### Problem 2: Reverse String
\`\`\`javascript
const reverseString = (str) => str.split('').reverse().join('');

console.log(reverseString("hello")); // olleh
\`\`\`

## Key Points

✅ Functions make code reusable
✅ Use arrow functions for shorter syntax
✅ Default parameters provide fallback values
✅ Always return a value when needed
✅ Use descriptive function names

## Summary

Functions are essential for writing organized, reusable code. Master function declarations, expressions, and arrow functions to become proficient in JavaScript.

**Next Tutorial:** JavaScript Arrays and Array Methods`
  },
  {
    id: 'js-arrays',
    title: "JavaScript Arrays",
    description: "Complete guide to JavaScript arrays including creation, manipulation, and array methods",
    language: "javascript",
    difficulty: "beginner" as const,
    order: 3,
    content: `# JavaScript Arrays

Arrays are used to store multiple values in a single variable. They are one of the most commonly used data structures in JavaScript.

## Creating Arrays

\`\`\`javascript
// Array literal
let fruits = ["apple", "banana", "orange"];

// Array constructor
let numbers = new Array(1, 2, 3, 4, 5);

// Empty array
let empty = [];
\`\`\`

## Accessing Elements

\`\`\`javascript
let fruits = ["apple", "banana", "orange"];

console.log(fruits[0]);  // apple
console.log(fruits[1]);  // banana
console.log(fruits[2]);  // orange

// Last element
console.log(fruits[fruits.length - 1]);  // orange
\`\`\`

## Array Methods

### Adding Elements

\`\`\`javascript
let fruits = ["apple", "banana"];

// Add to end
fruits.push("orange");
console.log(fruits);  // ["apple", "banana", "orange"]

// Add to beginning
fruits.unshift("mango");
console.log(fruits);  // ["mango", "apple", "banana", "orange"]
\`\`\`

### Removing Elements

\`\`\`javascript
let fruits = ["apple", "banana", "orange"];

// Remove from end
let last = fruits.pop();
console.log(last);    // orange
console.log(fruits);  // ["apple", "banana"]

// Remove from beginning
let first = fruits.shift();
console.log(first);   // apple
console.log(fruits);  // ["banana"]
\`\`\`

### Array Iteration

\`\`\`javascript
let numbers = [1, 2, 3, 4, 5];

// forEach
numbers.forEach((num) => {
    console.log(num * 2);
});

// map - creates new array
let doubled = numbers.map((num) => num * 2);
console.log(doubled);  // [2, 4, 6, 8, 10]

// filter - creates new array with elements that pass test
let evens = numbers.filter((num) => num % 2 === 0);
console.log(evens);  // [2, 4]

// find - returns first element that matches
let found = numbers.find((num) => num > 3);
console.log(found);  // 4
\`\`\`

### Array Transformation

\`\`\`javascript
let numbers = [1, 2, 3, 4, 5];

// reduce - reduces array to single value
let sum = numbers.reduce((total, num) => total + num, 0);
console.log(sum);  // 15

// sort
let unsorted = [3, 1, 4, 1, 5, 9, 2];
unsorted.sort((a, b) => a - b);
console.log(unsorted);  // [1, 1, 2, 3, 4, 5, 9]

// reverse
let reversed = [1, 2, 3].reverse();
console.log(reversed);  // [3, 2, 1]
\`\`\`

## Examples

### Example 1: Sum of Array
\`\`\`javascript
let numbers = [10, 20, 30, 40, 50];
let sum = numbers.reduce((total, num) => total + num, 0);
console.log(sum);  // 150
\`\`\`

### Example 2: Find Max Value
\`\`\`javascript
let numbers = [5, 2, 9, 1, 7];
let max = Math.max(...numbers);
console.log(max);  // 9
\`\`\`

### Example 3: Remove Duplicates
\`\`\`javascript
let numbers = [1, 2, 2, 3, 4, 4, 5];
let unique = [...new Set(numbers)];
console.log(unique);  // [1, 2, 3, 4, 5]
\`\`\`

## Practice Problems

### Problem 1: Average Calculator
\`\`\`javascript
let scores = [85, 90, 78, 92, 88];
let average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
console.log(average);  // 86.6
\`\`\`

### Problem 2: Filter Adults
\`\`\`javascript
let ages = [12, 18, 25, 15, 30, 17];
let adults = ages.filter(age => age >= 18);
console.log(adults);  // [18, 25, 30]
\`\`\`

## Key Points

✅ Arrays store multiple values
✅ Use array methods for manipulation
✅ map, filter, reduce are powerful tools
✅ Arrays are zero-indexed
✅ Use spread operator for copying

## Summary

Arrays are fundamental data structures in JavaScript. Master array methods to efficiently manipulate and transform data in your applications.

**Next Tutorial:** JavaScript Objects`
  },
  {
    id: 'python-variables',
    title: "Python Variables and Data Types",
    description: "Introduction to Python variables, data types, and type conversion",
    language: "python",
    difficulty: "beginner" as const,
    order: 1,
    content: `# Python Variables and Data Types

Variables in Python are containers for storing data values. Python is dynamically typed, meaning you don't need to declare variable types explicitly.

## Creating Variables

In Python, variables are created the moment you assign a value to them.

\`\`\`python
x = 5
name = "Ali"
is_student = True
\`\`\`

## Variable Naming Rules

1. Must start with a letter or underscore
2. Cannot start with a number
3. Can only contain alphanumeric characters and underscores
4. Case-sensitive (name ≠ Name)
5. Cannot use Python keywords

**Valid Names:**
\`\`\`python
my_var = 10
_private = 20
userName = "John"
age2 = 25
\`\`\`

## Data Types

### Numeric Types

\`\`\`python
# Integer
age = 25
count = 100

# Float
price = 99.99
pi = 3.14159

# Complex
complex_num = 3 + 4j
\`\`\`

### String

\`\`\`python
name = "Ahmed"
message = 'Hello World'
multiline = """This is
a multiline
string"""

# f-strings
first_name = "Ali"
age = 20
message = f"My name is {first_name} and I'm {age} years old"
print(message)
\`\`\`

### Boolean

\`\`\`python
is_active = True
has_permission = False
result = (5 > 3)  # True
\`\`\`

### List

\`\`\`python
fruits = ["apple", "banana", "orange"]
numbers = [1, 2, 3, 4, 5]
mixed = [1, "two", True, 3.14]

# Accessing elements
print(fruits[0])   # apple
print(numbers[-1]) # 5 (last element)
\`\`\`

### Dictionary

\`\`\`python
person = {
    "name": "Sara",
    "age": 22,
    "city": "Ramallah"
}

print(person["name"])     # Sara
print(person.get("age"))  # 22
\`\`\`

### Tuple

\`\`\`python
coordinates = (10, 20)
colors = ("red", "green", "blue")

print(coordinates[0])  # 10
\`\`\`

## Type Conversion

\`\`\`python
# String to Integer
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
print(price_float)  # 99.99
\`\`\`

## Multiple Assignment

\`\`\`python
# Assign same value
x = y = z = 0

# Assign different values
a, b, c = 1, 2, 3
print(a, b, c)  # 1 2 3

# Swap variables
x, y = 10, 20
x, y = y, x
print(x, y)  # 20 10
\`\`\`

## Examples

### Example 1: Basic Variables
\`\`\`python
name = "Ahmed"
age = 20
height = 1.75
is_student = True

print(f"Name: {name}")
print(f"Age: {age}")
print(f"Height: {height}m")
print(f"Student: {is_student}")
\`\`\`

### Example 2: List Operations
\`\`\`python
numbers = [1, 2, 3, 4, 5]
print(f"Sum: {sum(numbers)}")
print(f"Max: {max(numbers)}")
print(f"Length: {len(numbers)}")
\`\`\`

## Practice Problems

### Problem 1: Calculate BMI
\`\`\`python
weight = 70  # kg
height = 1.75  # meters

bmi = weight / (height ** 2)
print(f"BMI: {bmi:.2f}")
\`\`\`

### Problem 2: String Manipulation
\`\`\`python
text = "Python Programming"
print(text.upper())  # PYTHON PROGRAMMING
print(text.lower())  # python programming
print(text.split())  # ['Python', 'Programming']
\`\`\`

## Key Points

✅ Python is dynamically typed
✅ Use snake_case for variable names
✅ f-strings are the modern way to format strings
✅ Lists are mutable, tuples are immutable
✅ Use type() to check variable types

## Summary

Python variables are easy to create and use. Understanding data types is crucial for effective Python programming.

**Next Tutorial:** Python Operators and Expressions`
  },
  {
    id: 'python-functions',
    title: "Python Functions",
    description: "Learn about Python functions, parameters, return values, and lambda functions",
    language: "python",
    difficulty: "beginner" as const,
    order: 2,
    content: `# Python Functions

Functions are reusable blocks of code that perform specific tasks. They help organize code and make it more maintainable.

## Defining Functions

\`\`\`python
def function_name(parameters):
    """Docstring describing the function"""
    # function body
    return value
\`\`\`

## Basic Function

\`\`\`python
def greet(name):
    return f"Hello, {name}!"

print(greet("Ali"))  # Hello, Ali!
\`\`\`

## Parameters

### Default Parameters
\`\`\`python
def greet(name="Guest"):
    return f"Hello, {name}!"

print(greet())        # Hello, Guest!
print(greet("Ahmed")) # Hello, Ahmed!
\`\`\`

### Multiple Parameters
\`\`\`python
def add(a, b):
    return a + b

result = add(5, 3)
print(result)  # 8
\`\`\`

### Keyword Arguments
\`\`\`python
def describe_person(name, age, city):
    return f"{name} is {age} years old and lives in {city}"

print(describe_person(name="Ali", city="Nablus", age=20))
\`\`\`

### *args and **kwargs
\`\`\`python
# *args - variable number of arguments
def sum_all(*numbers):
    return sum(numbers)

print(sum_all(1, 2, 3, 4))  # 10

# **kwargs - keyword arguments
def print_info(**info):
    for key, value in info.items():
        print(f"{key}: {value}")

print_info(name="Ali", age=20, city="Ramallah")
\`\`\`

## Return Statement

\`\`\`python
def multiply(a, b):
    return a * b

def get_stats(numbers):
    return min(numbers), max(numbers), sum(numbers)

result = multiply(5, 3)
print(result)  # 15

min_val, max_val, total = get_stats([1, 2, 3, 4, 5])
print(f"Min: {min_val}, Max: {max_val}, Total: {total}")
\`\`\`

## Lambda Functions

Lambda functions are small anonymous functions.

\`\`\`python
# Regular function
def square(x):
    return x ** 2

# Lambda function
square_lambda = lambda x: x ** 2

print(square(5))         # 25
print(square_lambda(5))  # 25

# Lambda with multiple parameters
add = lambda a, b: a + b
print(add(3, 4))  # 7
\`\`\`

## Examples

### Example 1: Calculate Area
\`\`\`python
def calculate_area(width, height):
    return width * height

area = calculate_area(5, 10)
print(f"Area: {area}")  # Area: 50
\`\`\`

### Example 2: Check Prime Number
\`\`\`python
def is_prime(n):
    if n < 2:
        return False
    for i in range(2, int(n ** 0.5) + 1):
        if n % i == 0:
            return False
    return True

print(is_prime(7))   # True
print(is_prime(10))  # False
\`\`\`

### Example 3: Filter List
\`\`\`python
numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
evens = list(filter(lambda x: x % 2 == 0, numbers))
print(evens)  # [2, 4, 6, 8, 10]
\`\`\`

## Practice Problems

### Problem 1: Factorial
\`\`\`python
def factorial(n):
    if n == 0 or n == 1:
        return 1
    return n * factorial(n - 1)

print(factorial(5))  # 120
\`\`\`

### Problem 2: Temperature Converter
\`\`\`python
def celsius_to_fahrenheit(celsius):
    return (celsius * 9/5) + 32

def fahrenheit_to_celsius(fahrenheit):
    return (fahrenheit - 32) * 5/9

print(celsius_to_fahrenheit(25))   # 77.0
print(fahrenheit_to_celsius(77))   # 25.0
\`\`\`

## Key Points

✅ Functions make code reusable
✅ Use def keyword to define functions
✅ Default parameters provide fallback values
✅ Lambda functions for simple operations
✅ Return multiple values using tuples

## Summary

Functions are essential building blocks in Python. Master function definitions, parameters, and lambda functions for clean, efficient code.

**Next Tutorial:** Python Lists and List Comprehensions`
  },
  {
    id: 'java-variables',
    title: "Java Variables and Data Types",
    description: "Learn about Java variables, primitive data types, and type casting",
    language: "java",
    difficulty: "beginner" as const,
    order: 1,
    content: `# Java Variables and Data Types

In Java, variables must be declared with a specific data type before they can be used. Java is a strongly-typed language.

## Variable Declaration

**Syntax:**
\`\`\`java
dataType variableName = value;
\`\`\`

**Example:**
\`\`\`java
int age = 25;
String name = "Ahmed";
double price = 99.99;
boolean isActive = true;
\`\`\`

## Primitive Data Types

### Integer Types

\`\`\`java
byte smallNumber = 127;       // 8-bit: -128 to 127
short mediumNumber = 32000;   // 16-bit
int number = 100000;          // 32-bit
long bigNumber = 9876543210L; // 64-bit (L suffix)
\`\`\`

### Floating-Point Types

\`\`\`java
float price = 19.99f;  // 32-bit (f suffix)
double pi = 3.14159;   // 64-bit (default)
\`\`\`

### Character and Boolean

\`\`\`java
char grade = 'A';
boolean isStudent = true;
\`\`\`

## Reference Types

### String

\`\`\`java
String firstName = "Ali";
String lastName = "Hassan";
String fullName = firstName + " " + lastName;

// String methods
System.out.println(fullName.length());
System.out.println(fullName.toUpperCase());
\`\`\`

### Arrays

\`\`\`java
int[] numbers = {1, 2, 3, 4, 5};
String[] fruits = new String[3];
fruits[0] = "Apple";
fruits[1] = "Banana";
fruits[2] = "Orange";

System.out.println(numbers[0]);  // 1
System.out.println(fruits[1]);   // Banana
\`\`\`

## Type Casting

### Widening (Automatic)
\`\`\`java
int myInt = 9;
double myDouble = myInt;
System.out.println(myDouble);  // 9.0
\`\`\`

### Narrowing (Manual)
\`\`\`java
double myDouble = 9.78;
int myInt = (int) myDouble;
System.out.println(myInt);  // 9
\`\`\`

## Constants

\`\`\`java
final double PI = 3.14159;
final int MAX_STUDENTS = 30;
\`\`\`

## Examples

### Example 1: Basic Variables
\`\`\`java
public class Main {
    public static void main(String[] args) {
        String name = "Ahmed";
        int age = 20;
        double height = 1.75;
        
        System.out.println("Name: " + name);
        System.out.println("Age: " + age);
        System.out.println("Height: " + height + "m");
    }
}
\`\`\`

### Example 2: Calculate Average
\`\`\`java
public class Main {
    public static void main(String[] args) {
        int[] scores = {85, 90, 78, 92, 88};
        
        int sum = 0;
        for (int score : scores) {
            sum += score;
        }
        
        double average = (double) sum / scores.length;
        System.out.println("Average: " + average);
    }
}
\`\`\`

## Practice Problems

### Problem 1: Calculate Area
\`\`\`java
public class Main {
    public static void main(String[] args) {
        double length = 5.5;
        double width = 3.2;
        double area = length * width;
        
        System.out.println("Area: " + area);
    }
}
\`\`\`

## Key Points

✅ Java is strongly-typed
✅ Variables must be declared with types
✅ Use appropriate data types
✅ Constants use final keyword
✅ Type casting converts between types

## Summary

Understanding Java variables and data types is fundamental. Choose the right data type and follow naming conventions for clean code.

**Next Tutorial:** Java Operators and Control Flow`
  },
  {
    id: 'cpp-basics',
    title: "C++ Basics and Variables",
    description: "Introduction to C++ programming, variables, and data types",
    language: "cpp",
    difficulty: "beginner" as const,
    order: 1,
    content: `# C++ Basics and Variables

C++ is a powerful general-purpose programming language. It's an extension of C with object-oriented features.

## Basic Program Structure

\`\`\`cpp
#include <iostream>
using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    return 0;
}
\`\`\`

## Variables

### Declaration and Initialization

\`\`\`cpp
int age = 25;
double price = 99.99;
char grade = 'A';
bool isActive = true;
string name = "Ahmed";
\`\`\`

## Data Types

### Integer Types

\`\`\`cpp
int number = 100;
short smallNum = 32000;
long bigNum = 1000000L;
long long veryBig = 9876543210LL;
\`\`\`

### Floating-Point Types

\`\`\`cpp
float price = 19.99f;
double pi = 3.14159;
\`\`\`

### Character and Boolean

\`\`\`cpp
char letter = 'A';
bool isTrue = true;
\`\`\`

## Constants

\`\`\`cpp
const double PI = 3.14159;
const int MAX_SIZE = 100;
\`\`\`

## Input/Output

\`\`\`cpp
#include <iostream>
using namespace std;

int main() {
    string name;
    int age;
    
    cout << "Enter your name: ";
    cin >> name;
    
    cout << "Enter your age: ";
    cin >> age;
    
    cout << "Hello " << name << ", you are " << age << " years old" << endl;
    
    return 0;
}
\`\`\`

## Arrays

\`\`\`cpp
int numbers[5] = {1, 2, 3, 4, 5};
string fruits[] = {"apple", "banana", "orange"};

cout << numbers[0] << endl;  // 1
cout << fruits[1] << endl;   // banana
\`\`\`

## Examples

### Example 1: Calculate Sum
\`\`\`cpp
#include <iostream>
using namespace std;

int main() {
    int a = 10, b = 20;
    int sum = a + b;
    
    cout << "Sum: " << sum << endl;
    return 0;
}
\`\`\`

### Example 2: Array Average
\`\`\`cpp
#include <iostream>
using namespace std;

int main() {
    int numbers[] = {85, 90, 78, 92, 88};
    int size = 5;
    int sum = 0;
    
    for (int i = 0; i < size; i++) {
        sum += numbers[i];
    }
    
    double average = (double)sum / size;
    cout << "Average: " << average << endl;
    
    return 0;
}
\`\`\`

## Practice Problems

### Problem 1: Temperature Converter
\`\`\`cpp
#include <iostream>
using namespace std;

int main() {
    double celsius = 25.0;
    double fahrenheit = (celsius * 9.0/5.0) + 32;
    
    cout << celsius << "°C = " << fahrenheit << "°F" << endl;
    return 0;
}
\`\`\`

## Key Points

✅ C++ is strongly-typed
✅ Use #include for libraries
✅ main() is the entry point
✅ Use cout for output, cin for input
✅ Arrays have fixed size

## Summary

C++ provides powerful features for system programming. Master the basics of variables and data types to build a strong foundation.

**Next Tutorial:** C++ Functions and Pointers`
  },
  {
    id: 'go-basics',
    title: "Go (Golang) Basics",
    description: "Introduction to Go programming language, variables, and basic syntax",
    language: "go",
    difficulty: "beginner" as const,
    order: 1,
    content: `# Go (Golang) Basics

Go is a statically typed, compiled programming language designed at Google. It's known for simplicity and efficiency.

## Basic Program Structure

\`\`\`go
package main

import "fmt"

func main() {
    fmt.Println("Hello, World!")
}
\`\`\`

## Variables

### Declaration

\`\`\`go
// Explicit type
var age int = 25
var name string = "Ahmed"

// Type inference
var price = 99.99
var isActive = true

// Short declaration (inside functions only)
count := 10
message := "Hello"
\`\`\`

## Data Types

### Basic Types

\`\`\`go
var integer int = 42
var floatingPoint float64 = 3.14
var text string = "Go Programming"
var flag bool = true
\`\`\`

### Multiple Declaration

\`\`\`go
var (
    name string = "Ali"
    age int = 20
    city string = "Ramallah"
)

// Short form
x, y, z := 1, 2, 3
\`\`\`

## Constants

\`\`\`go
const Pi = 3.14159
const MaxConnections = 100
\`\`\`

## Arrays and Slices

### Arrays (Fixed Size)
\`\`\`go
var numbers [5]int = [5]int{1, 2, 3, 4, 5}
fruits := [3]string{"apple", "banana", "orange"}

fmt.Println(numbers[0])  // 1
\`\`\`

### Slices (Dynamic Size)
\`\`\`go
numbers := []int{1, 2, 3, 4, 5}
numbers = append(numbers, 6)

fmt.Println(numbers)  // [1 2 3 4 5 6]
\`\`\`

## Maps

\`\`\`go
ages := map[string]int{
    "Ali": 20,
    "Sara": 22,
}

ages["Ahmed"] = 25
fmt.Println(ages["Ali"])  // 20
\`\`\`

## Functions

\`\`\`go
func add(a int, b int) int {
    return a + b
}

func main() {
    result := add(5, 3)
    fmt.Println(result)  // 8
}
\`\`\`

### Multiple Return Values
\`\`\`go
func getStats(numbers []int) (int, int, int) {
    min := numbers[0]
    max := numbers[0]
    sum := 0
    
    for _, num := range numbers {
        if num < min {
            min = num
        }
        if num > max {
            max = num
        }
        sum += num
    }
    
    return min, max, sum
}
\`\`\`

## Control Flow

### If Statement
\`\`\`go
age := 20

if age >= 18 {
    fmt.Println("Adult")
} else {
    fmt.Println("Minor")
}
\`\`\`

### For Loop
\`\`\`go
// Traditional for
for i := 0; i < 5; i++ {
    fmt.Println(i)
}

// While-style
count := 0
for count < 5 {
    fmt.Println(count)
    count++
}

// Range
numbers := []int{1, 2, 3, 4, 5}
for index, value := range numbers {
    fmt.Printf("Index: %d, Value: %d\\n", index, value)
}
\`\`\`

## Examples

### Example 1: Calculate Average
\`\`\`go
package main

import "fmt"

func main() {
    numbers := []int{85, 90, 78, 92, 88}
    sum := 0
    
    for _, num := range numbers {
        sum += num
    }
    
    average := float64(sum) / float64(len(numbers))
    fmt.Printf("Average: %.2f\\n", average)
}
\`\`\`

### Example 2: Find Maximum
\`\`\`go
package main

import "fmt"

func findMax(numbers []int) int {
    max := numbers[0]
    for _, num := range numbers {
        if num > max {
            max = num
        }
    }
    return max
}

func main() {
    nums := []int{5, 2, 9, 1, 7}
    fmt.Println("Max:", findMax(nums))  // Max: 9
}
\`\`\`

## Practice Problems

### Problem 1: Sum of Slice
\`\`\`go
package main

import "fmt"

func sum(numbers []int) int {
    total := 0
    for _, num := range numbers {
        total += num
    }
    return total
}

func main() {
    nums := []int{1, 2, 3, 4, 5}
    fmt.Println("Sum:", sum(nums))  // Sum: 15
}
\`\`\`

## Key Points

✅ Go is statically typed
✅ Use := for short variable declaration
✅ Slices are more flexible than arrays
✅ Functions can return multiple values
✅ Use range for easy iteration

## Summary

Go offers simplicity and performance. Its clean syntax and powerful features make it excellent for modern applications.

**Next Tutorial:** Go Goroutines and Concurrency`
  }
];
