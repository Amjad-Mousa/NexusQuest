# NexusQuest IDE

A complete online IDE project that allows users to write and execute Python code safely in isolated Docker containers.

## 🚀 Features

- **Monaco Editor**: Full-featured code editor with syntax highlighting and IntelliSense
- **Real-time Code Execution**: Execute Python code safely in isolated Docker containers
- **Security First**: Sandboxed execution environment with resource limits
- **Modern UI**: Built with React, TailwindCSS, and Shadcn UI components
- **TypeScript**: Full type safety throughout the codebase

## 🏗️ Architecture

```
┌─────────────────┐    HTTP API     ┌─────────────────┐    Docker API    ┌─────────────────┐
│   Frontend      │ ──────────────► │    Backend      │ ────────────────► │   Docker        │
│   React + Vite  │                 │   Node.js       │                   │   Containers    │
│   Monaco Editor │                 │   Express       │                   │   Python:3.10   │
└─────────────────┘                 └─────────────────┘                   └─────────────────┘
```

## 🛠️ Tech Stack

### Frontend
- **React** with **Vite** for fast development
- **Monaco Editor** (VS Code editor)
- **TailwindCSS** for styling
- **Shadcn UI** for components
- **TypeScript** for type safety

### Backend
- **Node.js** with **Express**
- **Dockerode** for Docker container management
- **TypeScript** for type safety
- **Helmet** for security headers
- **Rate limiting** for API protection

### Infrastructure
- **Docker** for secure code execution
- **Python 3.10** runtime environment
- **Resource limits** (CPU, Memory, Network isolation)

## 🚦 Getting Started

### Prerequisites

- Node.js 18+ installed
- Docker Desktop running
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/nexusquest.git
   cd nexusquest
   ```

2. **Install Frontend Dependencies**
   ```bash
   cd frontend
   npm install
   ```

3. **Install Backend Dependencies**
   ```bash
   cd ../backend
   npm install
   ```

4. **Build Python Docker Image (Optional)**
   ```bash
   cd ../docker/python
   docker build -t nexusquest-python .
   ```

### Development

1. **Start Backend Server**
   ```bash
   cd backend
   npm run dev
   ```
   Server will run on http://localhost:3001

2. **Start Frontend Development Server**
   ```bash
   cd frontend
   npm run dev
   ```
   Application will be available at http://localhost:5173

### Production Build

1. **Build Frontend**
   ```bash
   cd frontend
   npm run build
   ```

2. **Build Backend**
   ```bash
   cd backend
   npm run build
   npm start
   ```

## 🔒 Security Features

### Code Execution Security
- **Isolated Containers**: Each code execution runs in a separate Docker container
- **Resource Limits**: 128MB memory limit, 50% CPU quota
- **Network Isolation**: No network access from containers
- **Read-only Filesystem**: Prevents file system modifications
- **Execution Timeout**: 10-second maximum execution time
- **Code Validation**: Blocks dangerous operations and imports

### API Security
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Input Validation**: Code length and content validation
- **CORS Protection**: Restricted to frontend origin
- **Security Headers**: Helmet.js for security headers
- **Error Handling**: No sensitive information in error responses

## 📁 Project Structure

```
nexusquest/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── CodeEditor.tsx
│   │   │   ├── Console.tsx
│   │   │   └── ui/         # Shadcn UI components
│   │   ├── lib/           # Utility functions
│   │   ├── App.tsx        # Main application component
│   │   └── main.tsx       # Application entry point
│   ├── package.json
│   └── vite.config.ts
├── backend/                 # Node.js backend API
│   ├── src/
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   ├── middleware/    # Express middleware
│   │   ├── utils/        # Utility functions
│   │   └── index.ts      # Server entry point
│   ├── package.json
│   └── tsconfig.json
├── docker/                 # Docker configurations
│   └── python/           # Python execution environment
└── README.md
```

## 🔧 API Documentation

### Execute Code
```
POST /api/run
```

**Request Body:**
```json
{
  "code": "print('Hello, World!')",
  "language": "python"
}
```

**Response:**
```json
{
  "success": true,
  "output": "Hello, World!",
  "error": "",
  "executionTime": 245
}
```

### Get Supported Languages
```
GET /api/languages
```

**Response:**
```json
{
  "languages": [
    {
      "name": "python",
      "version": "3.10",
      "extensions": [".py"],
      "supported": true
    }
  ]
}
```

## 🧪 Testing the IDE

1. **Basic Python Code**
   ```python
   print("Hello from NexusQuest IDE!")
   
   # Basic calculations
   x = 10
   y = 20
   print(f"The sum is: {x + y}")
   ```

2. **Error Handling**
   ```python
   # This will show an error
   print(undefined_variable)
   ```

3. **Security Test** (Should be blocked)
   ```python
   import os  # This will be rejected
   ```

## 🛡️ Resource Limits

- **Memory**: 128MB per execution
- **CPU**: 50% quota limit
- **Execution Time**: 10 seconds maximum
- **Code Size**: 50KB maximum
- **Network**: Completely disabled
- **File System**: Read-only access

## 🔄 Future Enhancements

- [ ] Support for more languages (JavaScript, C++, Java)
- [ ] File upload/download functionality
- [ ] Code sharing and collaboration
- [ ] Syntax error highlighting
- [ ] Code completion and IntelliSense
- [ ] Multiple file support
- [ ] Package management support
- [ ] Code execution history
- [ ] User accounts and authentication

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Troubleshooting

### Common Issues

1. **Docker not running**
   - Make sure Docker Desktop is installed and running
   - Check if you can run `docker ps` in terminal

2. **Port conflicts**
   - Frontend: Change port in `vite.config.ts`
   - Backend: Set `PORT` environment variable

3. **Permission errors**
   - On Linux/macOS, you might need to add your user to the docker group
   - `sudo usermod -aG docker $USER`

4. **Container execution fails**
   - Make sure Python Docker image is available: `docker pull python:3.10-slim`
   - Check Docker daemon is accessible

### Getting Help

- Check the [Issues](https://github.com/your-username/nexusquest/issues) page
- Create a new issue with detailed error information
- Include your system information and Docker version

---

**Built with ❤️ for the developer community**