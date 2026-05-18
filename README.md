# ⚖️ Moroccan Legal Chatbot — Assistant Juridique Marocain

A RAG-based (Retrieval-Augmented Generation) legal assistant specialized in Moroccan criminal law — covering the **Penal Code (Code Pénal)** and the **Code of Criminal Procedure (Code de Procédure Pénale)**. Built as a thesis project, it combines semantic search, BM25 retrieval, and Google Gemini to answer legal questions in **French, Arabic, and Darija**.

---

## 📸 Overview

This project consists of:

- **Backend** — Flask API with a full NLP pipeline (RAG + hybrid search + LLM)
- **Frontend** — React application with a chat interface, history view, and penal code browser
- **Data** — Structured legal articles extracted from official Moroccan legal PDFs

---

## 🗂️ Project Structure

```
MOROCCAN-LEGAL-CHATBOT/
├── backend/
│   ├── fullpipeline.py                         # Core RAG pipeline (embeddings, retrieval, LLM)
│   ├── app.py                                  # Flask REST API
│   ├── penal_code_chunks_themes_expanded.jsonl # Penal code data (JSONL)
│   ├── legal_articles_dataset.json             # Procedure code data (JSON)
│   ├── faiss_index_moroccan_legal_google/      # FAISS vector index (auto-generated)
│   │   ├── index.faiss
│   │   └── index.pkl
│   ├── .env                                    # ⚠️ Your API key goes here (not committed)
│   └── venv/                                   # Python virtual environment
│
└── frontend/
    ├── public/
    │   └── index.html
    └── src/
        ├── components/
        │   ├── ChatInput.js
        │   ├── ChatMessage.js
        │   ├── Header.js
        │   ├── HelpView.js
        │   ├── HistoryView.js
        │   ├── LandingPage.js
        │   ├── MessageBubble.js
        │   ├── PenalCodeView.js
        │   ├── SettingsView.js
        │   ├── Sidebar.js
        │   └── TypingLoader.js
        ├── contexts/
        │   └── SettingsContext.js
        ├── App.js
        ├── App.css
        ├── index.js
        └── index.css
```

---

## 🧠 How It Works

The pipeline implements **hybrid retrieval** combining three strategies:

1. **Semantic search** — Google `embedding-001` embeddings stored in a FAISS index
2. **BM25 keyword search** — via `rank_bm25` for lexical matching
3. **Levenshtein fuzzy matching** — for handling typos and spelling variants

Results are merged and re-ranked before being fed to **Gemini 1.5 Flash** as grounded context. The system prompt constrains the model to answer only from retrieved articles, cite article numbers and sources, and refuse to hallucinate.

**Language support:**
- Questions in French are processed directly
- Questions in Arabic (MSA) are translated to French for retrieval, and the response is translated back to Arabic with a disclaimer
- Darija terms are handled via an extended synonym map

---

## 📦 Data Format

### Penal Code (`penal_code_chunks_themes_expanded.jsonl`)
One JSON object per line:
```json
{
  "id": "article_123_chunk_1",
  "metadata": {
    "book": "LIVRE II",
    "title": "...",
    "chapter": "...",
    "section": "...",
    "article": "123",
    "keywords": ["vol", "soustraction"],
    "themes": ["vol et extorsion"]
  },
  "text": "Code Pénal Article 123: ..."
}
```

### Procedure Code (`legal_articles_dataset.json`)
JSON array of objects:
```json
[
  {
    "article_number": "PREMIER",
    "book": null,
    "title": null,
    "chapter": null,
    "section": null,
    "text": "Toute infraction donne ouverture à une action publique..."
  }
]
```

---

## 🚀 Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- A **Google AI Studio API key** with Gemini API access

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/moroccan-legal-chatbot.git
cd moroccan-legal-chatbot
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate        # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

#### ⚠️ Download the language detection model

The file `lid.176.bin` (used to detect Arabic/French input) is too large for GitHub (125MB) and is not included in this repository. Download it manually:

1. Go to: [https://dl.fbaipublicfiles.com/fasttext/supervised-models/lid.176.bin](https://dl.fbaipublicfiles.com/fasttext/supervised-models/lid.176.bin)
2. Download the file
3. Place it inside the `backend/` folder

Without this file, language detection will fail and Arabic queries will not be handled correctly.

#### ⚠️ Configure your API key

Create a `.env` file inside the `backend/` directory:

```
GOOGLE_API_KEY=your_google_ai_studio_api_key_here
```

> You can get a free API key at [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey).  
> The `.env` file is excluded from version control — **never commit your API key**.

#### Run the backend

```bash
python app.py
```

> **Note for first-time setup:** The FAISS vector index (`faiss_index_moroccan_legal_google/`) is not included in the repository to keep the repo lightweight. On the **first run**, `app.py` will automatically build it from the data files and save it to disk — this takes a few minutes. Every run after that will load the index from disk instantly. Make sure both `penal_code_chunks_themes_expanded.jsonl` and `legal_articles_dataset.json` are present in the `backend/` directory before running.

The API will be available at `http://localhost:5000`.

### 3. Frontend Setup

```bash
cd frontend
npm install
npm start
```

The app will open at `http://localhost:3000`.

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/new-session` | Create a new chat session |
| `POST` | `/api/chat` | Send a message, receive a legal answer |
| `GET` | `/api/history/<session_id>` | Retrieve full chat history for a session |
| `GET` | `/api/sessions` | List all active sessions with titles |

### Example request

```bash
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "session_abc123",
    "message": "Quelles sont les peines prévues pour le vol simple au Maroc?"
  }'
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| LLM | Google Gemini 1.5 Flash (`gemini-1.5-flash-latest`) |
| Embeddings | Google `embedding-001` via LangChain |
| Vector store | FAISS (via `langchain-community`) |
| Keyword search | BM25 (`rank_bm25`) |
| Fuzzy matching | `python-Levenshtein` |
| Language detection | `langdetect` |
| Backend | Flask + Flask-CORS |
| Frontend | React + Tailwind CSS |

---

## 📋 Python Dependencies

Key packages (`requirements.txt` should include):

```
flask
flask-cors
langchain
langchain-community
langchain-google-genai
google-generativeai
faiss-cpu
rank-bm25
python-Levenshtein
langdetect
python-dotenv
numpy
```

---

## ⚠️ Limitations & Disclaimer

- This chatbot covers **only** the Moroccan Penal Code and Code of Criminal Procedure. Questions about other laws (family law, commercial law, the Constitution, etc.) will be declined.
- Arabic responses go through automatic translation and **may contain inaccuracies**. A disclaimer is always prepended to Arabic answers.
- This tool is for **informational purposes only** and does not constitute legal advice. For any real legal situation, consult a licensed Moroccan attorney.

---

## 👥 Authors

Built as a thesis project by:

- **Marouane Daouki** 
- **Imane Alouani**

Feel free to open issues or contribute via pull requests.

---

## 📄 License

This project is for academic and educational purposes.
