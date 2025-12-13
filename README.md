# 🚀 NexusQuest

<div align="center">

![NexusQuest Logo](https://img.shields.io/badge/NexusQuest-Coding%20Platform-blue?style=for-the-badge&logo=code&logoColor=white)

**An Interactive Coding Education Platform with Real-Time Collaboration**

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=flat-square&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-black?style=flat-square&logo=socket.io&badgeColor=010101)](https://socket.io/)

[Features](#-features) • [Tech Stack](#-tech-stack) • [Getting Started](#-getting-started) • [Documentation](#-documentation) • [Contributing](#-contributing)

</div>

---

## 📖 Overview

**NexusQuest** is a comprehensive coding education platform designed for interactive learning, real-time collaboration, and gamified skill development. Built for both students and teachers, it provides a complete ecosystem for coding education with features like live code execution, collaborative coding sessions, interactive tutorials, quizzes, and a community forum.

### 🎯 Key Highlights

- 🎓 **Dual-Mode Platform**: Separate interfaces for students and teachers
- 💻 **Live Code Execution**: Run code in multiple languages (JavaScript, Python, Java, C++)
- 🤝 **Real-Time Collaboration**: Live coding sessions with WebRTC and Socket.io
- 📚 **Interactive Tutorials**: Step-by-step learning paths with progress tracking
- 🏆 **Gamification System**: Points, achievements, badges, and leaderboards
- 💬 **Community Features**: Q&A forum, direct messaging, and notifications
- 📊 **Analytics Dashboard**: Track progress, performance, and achievements
- 🎮 **Daily Challenges**: Fresh coding challenges every day
- 📝 **Quiz System**: Timed quizzes with instant feedback

---

## ✨ Features

### For Students

#### 🎓 Learning & Practice
- **Interactive Tutorials**: Language-specific learning paths (JavaScript, Python, Java, C++)
- **Coding Tasks**: Difficulty-graded challenges with instant feedback
- **Code Playground**: Sandbox environment for experimentation
- **Daily Challenges**: New coding problems every 24 hours
- **Quiz System**: Timed assessments with multiple question types

#### 🤝 Collaboration
- **Live Collaboration**: Real-time pair programming with video/audio
- **Screen Sharing**: Share your screen during collaboration sessions
- **Code Synchronization**: See changes in real-time
- **Direct Messaging**: Chat with peers and teachers
- **User Search**: Find and connect with other learners

#### 🏆 Gamification
- **XP System**: Earn experience points for completing tasks
- **Achievements**: Unlock badges for milestones
- **Leaderboard**: Compete with peers globally
- **Streak Tracking**: Maintain daily learning streaks
- **Level Progression**: Advance through skill levels

#### 💬 Community
- **Q&A Forum**: Ask questions and help others
- **Vote System**: Upvote/downvote questions and answers
- **Accepted Answers**: Mark solutions as accepted
- **Tag System**: Organize questions by topics
- **Search & Filter**: Find relevant discussions

### For Teachers

#### 📝 Content Management
- **Task Creation**: Design coding challenges with test cases
- **Tutorial Builder**: Create interactive learning content
- **Quiz Designer**: Build timed assessments with various question types
- **Content Publishing**: Control visibility of learning materials

#### 📊 Student Management
- **Progress Tracking**: Monitor student performance
- **Assignment Management**: Create and grade assignments
- **Analytics Dashboard**: View class statistics
- **Individual Reports**: Track each student's journey

#### 🎯 Assessment Tools
- **Automated Grading**: Instant feedback on code submissions
- **Quiz Results**: Detailed analytics on quiz performance
- **Leaderboard Access**: View top performers
- **Custom Challenges**: Create personalized coding tasks

---

## 🛠 Tech Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: React Router v6
- **Styling**: TailwindCSS + shadcn/ui components
- **State Management**: React Context API
- **Code Editor**: Monaco Editor (VS Code engine)
- **Real-Time**: Socket.io Client
- **WebRTC**: Simple Peer for video/audio
- **Build Tool**: Vite
- **Icons**: Lucide React

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Real-Time**: Socket.io
- **Code Execution**: Isolated sandboxes for multiple languages
- **Security**: Helmet, CORS, Rate Limiting
- **File Upload**: Multer
- **Environment**: dotenv

### Infrastructure
- **WebSockets**: Real-time bidirectional communication
- **RESTful API**: Structured endpoints for all operations
- **File Storage**: Local filesystem with organized structure
- **Session Management**: JWT-based authentication

---

## 🚀 Getting Started

### Prerequisites

- **Docker** and **Docker Compose**
- **Git**

### Quick Start with Docker

The easiest way to get NexusQuest up and running is using Docker Compose:

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/NexusQuest.git
cd NexusQuest
```

2. **Start all services**
```bash
docker-compose up -d
```

That's it! Docker Compose will automatically:
- Build and start the backend server
- Build and start the frontend application
- Set up MongoDB database
- Configure all networking between services
- Install all dependencies

3. **Access the Application**
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3001`
- API Health Check: `http://localhost:3001/health`
- MongoDB: `mongodb://localhost:27017`

4. **Stop all services**
```bash
docker-compose down
```

### Manual Installation (Without Docker)

If you prefer to run without Docker:

**Prerequisites:**
- **Node.js** (v18 or higher)
- **MongoDB** (v6 or higher)
- **npm** or **yarn**

**Steps:**

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/NexusQuest.git
cd NexusQuest
```

2. **Install Backend Dependencies**
```bash
cd backend
npm install
```

3. **Install Frontend Dependencies**
```bash
cd ../frontend
npm install
```

4. **Configure Environment Variables**

Create `.env` file in the `backend` directory:
```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/nexusquest

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# AI Integration (Optional)
GROQ_API_KEY=your-groq-api-key
OPENAI_API_KEY=your-openai-api-key

# CORS
CORS_ORIGIN=http://localhost:5173
```

Create `.env` file in the `frontend` directory:
```env
VITE_API_URL=http://localhost:3001
```

5. **Start MongoDB**
```bash
mongod
```

6. **Start the Backend Server**
```bash
cd backend
npm run dev
```

7. **Start the Frontend Development Server**
```bash
cd frontend
npm run dev
```

### First Time Setup

After starting the application:
1. Navigate to `http://localhost:5173`
2. Click "Sign Up" to create your account
3. Choose your role (Student or Teacher)
4. Start learning or creating content!

---

## 📁 Project Structure

```
NexusQuest/
├── backend/
│   ├── src/
│   │   ├── config/          # Configuration files
│   │   ├── middleware/      # Express middleware
│   │   ├── models/          # MongoDB models
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   ├── utils/           # Helper functions
│   │   └── index.ts         # Entry point
│   ├── uploads/             # User uploads
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── ui/          # UI components (shadcn)
│   │   │   └── teacher/     # Teacher-specific components
│   │   ├── context/         # React Context providers
│   │   ├── pages/           # Page components
│   │   ├── services/        # API service layer
│   │   ├── constants/       # Constants and configs
│   │   └── main.tsx         # Entry point
│   ├── public/              # Static assets
│   └── package.json
│
└── README.md
```

---

## 🔌 API Documentation

### Authentication Endpoints

```http
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
PUT  /api/auth/profile
POST /api/auth/upload-avatar
```

### Task Endpoints

```http
GET    /api/tasks              # Get all tasks
GET    /api/tasks/:id          # Get single task
POST   /api/tasks              # Create task (teacher)
PUT    /api/tasks/:id          # Update task (teacher)
DELETE /api/tasks/:id          # Delete task (teacher)
POST   /api/tasks/:id/submit   # Submit solution
```

### Tutorial Endpoints

```http
GET    /api/tutorials                    # Get all tutorials
GET    /api/tutorials/:id                # Get single tutorial
GET    /api/tutorials/teacher/all        # Get teacher's tutorials
POST   /api/tutorials                    # Create tutorial (teacher)
PUT    /api/tutorials/:id                # Update tutorial (teacher)
DELETE /api/tutorials/:id                # Delete tutorial (teacher)
POST   /api/tutorials/:id/start          # Mark as started
POST   /api/tutorials/:id/complete       # Mark as completed
```

### Quiz Endpoints

```http
GET    /api/quizzes              # Get all quizzes
GET    /api/quizzes/:id          # Get single quiz
POST   /api/quizzes              # Create quiz (teacher)
PUT    /api/quizzes/:id          # Update quiz (teacher)
DELETE /api/quizzes/:id          # Delete quiz (teacher)
POST   /api/quizzes/:id/submit   # Submit quiz answers
GET    /api/quizzes/:id/results  # Get quiz results (teacher)
```

### Forum Endpoints

```http
GET    /api/forum/questions           # Get all questions
GET    /api/forum/questions/:id       # Get single question
POST   /api/forum/questions           # Create question
PUT    /api/forum/questions/:id       # Update question
DELETE /api/forum/questions/:id       # Delete question
POST   /api/forum/questions/:id/vote  # Vote on question
POST   /api/forum/questions/:id/answers        # Create answer
POST   /api/forum/answers/:id/vote             # Vote on answer
POST   /api/forum/answers/:id/accept           # Accept answer
```

### Collaboration Endpoints

```http
GET    /api/collaboration/sessions        # Get active sessions
POST   /api/collaboration/sessions        # Create session
GET    /api/collaboration/sessions/:id    # Get session details
DELETE /api/collaboration/sessions/:id    # End session
```

### Gamification Endpoints

```http
GET  /api/gamification/profile      # Get user's gamification profile
GET  /api/gamification/leaderboard  # Get global leaderboard
GET  /api/gamification/achievements # Get all achievements
POST /api/gamification/claim        # Claim achievement reward
```

---

## 📦 Installing Custom Dependencies

### For JavaScript/Node.js Projects

You can install any npm package in your projects using `package.json`:

1. **Create a `package.json` in your project directory:**
```json
{
  "name": "my-project",
  "version": "1.0.0",
  "dependencies": {
    "axios": "^1.6.0",
    "lodash": "^4.17.21",
    "moment": "^2.29.4"
  }
}
```

2. **Install dependencies:**
```bash
npm install
```

3. **Use in your code:**
```javascript
const axios = require('axios');
const _ = require('lodash');
const moment = require('moment');

// Your code here
```

### For Python Projects

Use `requirements.txt` to manage Python dependencies:

1. **Create a `requirements.txt` file:**
```txt
requests==2.31.0
numpy==1.24.3
pandas==2.0.3
```

2. **Install dependencies:**
```bash
pip install -r requirements.txt
```

### For Java Projects

Use Maven (`pom.xml`) or Gradle (`build.gradle`) for dependency management.

### For C++ Projects

Use CMake or package managers like vcpkg or Conan.

**Note:** The code execution environment supports standard libraries for all languages. Custom dependencies can be installed in your local development environment.

---

## 🎮 Features in Detail

### Code Execution Engine

NexusQuest supports multiple programming languages with isolated execution environments:

- **JavaScript/Node.js**: V8 engine execution
- **Python**: Python 3.x interpreter
- **Java**: JDK compilation and execution
- **C++**: G++ compiler with STL support

**Security Features:**
- Sandboxed execution
- Memory limits
- Timeout protection
- Resource monitoring

### Real-Time Collaboration

Powered by WebRTC and Socket.io:

- **Video/Audio**: Peer-to-peer communication
- **Screen Sharing**: Share your coding screen
- **Code Sync**: Real-time code updates
- **Cursor Tracking**: See where collaborators are typing
- **Chat**: In-session messaging

### Gamification System

**XP Calculation:**
- Task completion: 10-100 XP (based on difficulty)
- Quiz completion: 5-50 XP (based on score)
- Daily challenge: 20 XP
- Tutorial completion: 15 XP
- Forum participation: 5 XP per helpful answer

**Achievements:**
- First Steps (Complete first task)
- Speed Demon (Complete task in under 5 minutes)
- Perfectionist (100% quiz score)
- Helper (10 accepted answers)
- Streak Master (7-day streak)
- And many more...

### Forum System

**Features:**
- Markdown support for questions/answers
- Code syntax highlighting
- Tag-based organization
- Vote-based ranking
- Accepted answer system
- Search and filtering
- User reputation

---

## 🔒 Security

- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: bcrypt with salt rounds
- **CORS Protection**: Configured origins
- **Rate Limiting**: Prevent abuse
- **Helmet.js**: Security headers
- **Input Validation**: Sanitized inputs
- **XSS Protection**: Content Security Policy
- **SQL Injection**: MongoDB parameterized queries

---

## 🧪 Testing

### Run Backend Tests
```bash
cd backend
npm test
```

### Run Frontend Tests
```bash
cd frontend
npm test
```

### Run E2E Tests
```bash
npm run test:e2e
```

---

## 📊 Performance

- **Code Execution**: < 2s average response time
- **Real-Time Updates**: < 100ms latency
- **API Response**: < 200ms average
- **Database Queries**: Optimized with indexes
- **Frontend Bundle**: Code-split for faster loading

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Coding Standards

- **TypeScript**: Strict mode enabled
- **ESLint**: Follow the configured rules
- **Prettier**: Format code before committing
- **Commit Messages**: Use conventional commits

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Authors

- **Amjad Mousa** - *Initial work* - [GitHub](https://github.com/Amjad-Mousa)

---

## 🙏 Acknowledgments

- Monaco Editor for the code editing experience
- Socket.io for real-time communication
- shadcn/ui for beautiful UI components
- The open-source community

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/NexusQuest/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/NexusQuest/discussions)
- **Email**: support@nexusquest.com

---

## 🗺 Roadmap

### Upcoming Features

- [ ] Mobile application (React Native)
- [ ] AI-powered code suggestions
- [ ] Advanced analytics dashboard
- [ ] Integration with GitHub
- [ ] Code review system
- [ ] Certification system
- [ ] Multi-language support (i18n)
- [ ] Dark/Light theme customization
- [ ] Export progress reports
- [ ] API for third-party integrations

---

<div align="center">

**Made with ❤️ by the NexusQuest Team**

⭐ Star us on GitHub — it motivates us a lot!

[Website](https://nexusquest.com) • [Documentation](https://docs.nexusquest.com) • [Blog](https://blog.nexusquest.com)

</div>
