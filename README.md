# 🧠 Nexus Knowledge

A powerful RAG (Retrieval-Augmented Generation) knowledge base application that allows you to upload documents and chat with them using AI.

![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green.svg)
![React](https://img.shields.io/badge/React-18+-61DAFB.svg)
![Gemini](https://img.shields.io/badge/Google%20Gemini-2.0-4285F4.svg)

## ✨ Features

- 📄 **PDF Upload & Processing** - Upload PDF documents with text extraction and OCR support
- 🤖 **AI-Powered Chat** - Ask questions about your documents using Google Gemini 2.0
- 🔍 **Intelligent Retrieval** - Uses ChromaDB vector database with MMR search for relevant context
- 📊 **Document Grading** - AI evaluates document relevance before generating answers
- 🐳 **Docker Ready** - Full Docker Compose setup for easy deployment

## 🏗️ Tech Stack

### Backend
- **FastAPI** - High-performance Python web framework
- **LangChain** - LLM application framework
- **LangGraph** - Agent workflow orchestration
- **Google Gemini 2.0** - Large Language Model
- **ChromaDB** - Vector database for embeddings
- **HuggingFace Embeddings** - sentence-transformers/all-MiniLM-L6-v2
- **PostgreSQL** - Relational database

### Frontend
- **React 18** - UI library
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Vite** - Fast build tool

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Docker & Docker Compose (optional)
- Google API Key ([Get one here](https://aistudio.google.com/apikey))

### Option 1: Docker Compose (Recommended)

1. **Clone the repository**
   ```bash
   git clone https://github.com/Abhinav3291/Nexus-Knowledge.git
   cd Nexus-Knowledge
   ```

2. **Create environment file**
   ```bash
   # Create .env in root directory
   echo "GOOGLE_API_KEY=your_google_api_key_here" > .env
   ```

3. **Run with Docker Compose**
   ```bash
   docker-compose up --build
   ```

4. **Access the application**
   - Frontend: http://localhost
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

### Option 2: Manual Setup

#### Backend Setup

```bash
cd Backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
echo "GOOGLE_API_KEY=your_google_api_key_here" > .env
echo "DATABASE_URL=postgresql://user:password@localhost:5432/nexus_knowledge" >> .env

# Run the server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend Setup

```bash
cd Frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

## 📁 Project Structure

```
Nexus-Knowledge/
├── Backend/
│   ├── app/
│   │   ├── agents/
│   │   │   └── graph.py        # LangGraph agent workflow
│   │   ├── core/
│   │   │   └── rag_engine.py   # RAG processing engine
│   │   └── db/
│   │       ├── database.py
│   │       ├── models.py
│   │       └── session.py
│   ├── data/                   # Uploaded documents
│   ├── chroma_db/              # Vector database storage
│   ├── main.py                 # FastAPI application
│   ├── requirements.txt
│   └── Dockerfile
├── Frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatInterface.tsx
│   │   │   ├── FileUpload.tsx
│   │   │   └── Sidebar.tsx
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GOOGLE_API_KEY` | Google AI Studio API key for Gemini 2.0 | ✅ Yes |
| `DATABASE_URL` | PostgreSQL connection string | ✅ Yes |

### Getting a Google API Key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key and add it to your `.env` file

## 🌐 Deployment

### Deploy on Railway

1. Fork this repository
2. Create a new project on [Railway](https://railway.app)
3. Add PostgreSQL service
4. Add environment variables:
   - `GOOGLE_API_KEY`
   - `DATABASE_URL` (auto-configured by Railway)
5. Deploy!

### Deploy on Render

1. Fork this repository
2. Create a new Web Service on [Render](https://render.com)
3. Add PostgreSQL database
4. Set environment variables
5. Deploy!

## 📝 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/upload` | Upload a PDF document |
| `POST` | `/chat` | Send a message and get AI response |
| `GET` | `/health` | Health check endpoint |

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 👤 Author

**Abhinav Bhardwaj**
- GitHub: [@Abhinav3291](https://github.com/Abhinav3291)

---

⭐ Star this repository if you find it helpful!
