# Quick Start Guide - NexusQuest IDE

## ✅ Current Status

Your NexusQuest IDE is now running!

- **Frontend**: http://localhost:5173 ✓
- **Backend**: http://localhost:9876 ✓

## 🚀 Getting Started

### 1. Open the IDE
The IDE should already be open in your browser at http://localhost:5173

### 2. Before Running Code
**Important**: Make sure Docker Desktop is running!

To pull the Python Docker image (first time only):
```powershell
docker pull python:3.10-slim
```

### 3. Test Your First Code

Try this simple Python code:
```python
print("Hello from NexusQuest IDE!")

# Basic calculations
x = 10
y = 20
result = x + y
print(f"The sum is: {result}")

# List operations
numbers = [1, 2, 3, 4, 5]
squared = [n**2 for n in numbers]
print(f"Squared numbers: {squared}")
```

Click the **"Run Code"** button to execute!

## 🔧 Development Workflow

### Starting the Servers

Backend:
```powershell
cd backend
npm run dev
```

Frontend:
```powershell
cd frontend
npm run dev
```

Or use VS Code tasks:
- `Ctrl+Shift+B` → "Start Full Development Environment"

### Building for Production

Frontend:
```powershell
cd frontend
npm run build
```

Backend:
```powershell
cd backend
npm run build
npm start
```

## 🐳 Docker Setup

### Start Docker Desktop
Make sure Docker Desktop is running before executing code.

### Pull Python Image
```powershell
docker pull python:3.10-slim
```

### Check Docker Status
```powershell
docker --version
docker ps
```

## 🎯 Features

- **Monaco Editor**: Full VS Code editing experience
- **Python Execution**: Safe sandboxed code execution
- **Real-time Output**: See results instantly in the console
- **Error Handling**: Clear error messages
- **Security**: Resource limits and network isolation

## 🛡️ Security Features

- Memory limit: 128MB per execution
- CPU limit: 50% quota
- Execution timeout: 10 seconds
- No network access
- Read-only filesystem
- Code validation

## 📝 Example Codes to Try

### 1. Basic Math
```python
# Calculate factorial
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n-1)

print(f"Factorial of 5: {factorial(5)}")
```

### 2. String Manipulation
```python
text = "NexusQuest IDE"
print(f"Original: {text}")
print(f"Uppercase: {text.upper()}")
print(f"Reversed: {text[::-1]}")
print(f"Length: {len(text)}")
```

### 3. Loops and Lists
```python
# Generate Fibonacci sequence
def fibonacci(n):
    fib = [0, 1]
    for i in range(2, n):
        fib.append(fib[-1] + fib[-2])
    return fib

print(fibonacci(10))
```

## ⚠️ Limitations

The following are blocked for security:
- File operations (`open`, `file`)
- Network requests (`urllib`, `requests`, `socket`)
- System operations (`os`, `subprocess`, `sys`)
- Dynamic code execution (`exec`, `eval`)

## 🐛 Troubleshooting

### Backend Won't Start
- Check if another process is using the port
- Kill existing node processes: `taskkill /F /IM node.exe`
- Restart the backend server

### Code Execution Fails
- Make sure Docker Desktop is running
- Pull the Python image: `docker pull python:3.10-slim`
- Check Docker status: `docker ps`

### Frontend Not Loading
- Clear browser cache
- Check console for errors (F12)
- Restart the frontend server

## 📚 Next Steps

1. **Start Docker Desktop** (if not already running)
2. **Pull Python image** (first time only)
3. **Write some code** in the editor
4. **Click Run** and see the results!

## 🎉 You're All Set!

The IDE is ready to use. Start coding and have fun!

---

**Need Help?** Check the main README.md for detailed documentation.