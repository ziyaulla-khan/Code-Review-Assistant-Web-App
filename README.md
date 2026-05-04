# Code Review Assistant Web App

A full-stack web application for AI-powered code review with inline suggestions. Users can paste or upload code, get AI-powered reviews with line-by-line suggestions for bugs, optimizations, security issues, and best practices.

## Features

- **Monaco Editor**: VS Code-like code editor with syntax highlighting
- **AI-Powered Reviews**: OpenAI/compatible LLM integration
- **Inline Suggestions**: Line-by-line issue highlighting with color coding
  - Red → Errors/Bugs
  - Yellow → Warnings
  - Blue → Suggestions/Optimizations
- **Diff View**: Before vs After fix comparison
- **Apply Fix**: Auto-edit code with suggested fixes
- **Authentication**: JWT-based auth (register/login)
- **File Upload**: Upload code files for review
- **Review History**: View and manage past reviews stored in MongoDB
- **Caching**: In-memory caching for repeated reviews
- **Responsive UI**: Works on desktop and mobile

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS + Monaco Editor
- **Backend**: Node.js + Express
- **AI**: OpenAI API (or compatible LLM API)
- **Database**: MongoDB + Mongoose
- **Cache**: Node-Cache (in-memory, optional Redis)
- **Auth**: JWT + bcryptjs

## Folder Structure

```
code-review-assistant/
├── client/                 # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/            # Page components
│   │   ├── context/          # React context (auth, etc.)
│   │   ├── hooks/            # Custom hooks
│   │   ├── utils/            # Helpers
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
├── server/                 # Node backend
│   ├── config/             # DB config
│   ├── controllers/        # Route controllers
│   ├── middleware/         # Auth, error handling
│   ├── models/             # Mongoose models
│   ├── routes/             # API routes
│   ├── services/           # AI service, cache
│   ├── utils/              # Helpers
│   ├── .env.example
│   └── server.js
├── .gitignore
└── README.md
```

## Setup Instructions

### Prerequisites

- Node.js (v18+)
- MongoDB (local or MongoDB Atlas)
- OpenAI API key (or compatible LLM API key)

### 1. Clone & Navigate

```bash
cd code-review-assistant
```

### 2. Backend Setup

```bash
cd server
npm install
```

Create a `.env` file (see `.env.example`):

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/code-review-assistant
# Or MongoDB Atlas: mongodb+srv://user:pass@cluster.mongodb.net/code-review-assistant
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini
NODE_ENV=development
```

Start the backend:

```bash
npm run dev
```

### 3. Frontend Setup

```bash
cd client
npm install
```

Create a `.env` file:

```env
VITE_API_URL=http://localhost:5000/api
```

Start the frontend:

```bash
npm run dev
```

### 4. Access the App

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000/api

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login user |
| GET | /api/auth/me | Get current user |
| POST | /api/reviews | Submit code for review |
| GET | /api/reviews | Get user's review history |
| GET | /api/reviews/:id | Get single review |
| DELETE | /api/reviews/:id | Delete a review |
| POST | /api/reviews/upload | Upload file for review |

## Deployment

### Frontend (Vercel)

```bash
cd client
npm run build
# Deploy dist/ folder to Vercel
```

### Backend (Render/Railway)

```bash
cd server
# Set environment variables on platform
# Deploy with start command: node server.js
```

### MongoDB Atlas

1. Create cluster at https://cloud.mongodb.com
2. Get connection string
3. Set `MONGODB_URI` in backend environment

## Environment Variables

### Backend (.env)

| Variable | Description | Required |
|----------|-------------|----------|
| PORT | Server port | No (default: 5000) |
| MONGODB_URI | MongoDB connection string | Yes |
| JWT_SECRET | Secret for JWT signing | Yes |
| OPENAI_API_KEY | OpenAI API key | Yes |
| OPENAI_MODEL | Model name (e.g., gpt-4o-mini) | No (default: gpt-4o-mini) |
| NODE_ENV | Environment mode | No |

### Frontend (.env)

| Variable | Description | Required |
|----------|-------------|----------|
| VITE_API_URL | Backend API base URL | Yes |

## License

MIT

---
Built with ❤️ using React, Node.js, and OpenAI.
