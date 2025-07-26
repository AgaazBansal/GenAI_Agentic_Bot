# Momentum AI 🚀

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi&logoColor=white)

Momentum AI is an intelligent agent designed to transform chaotic meeting audio into structured, editable, and actionable minutes instantly. This tool acts as a co-pilot for modern teams, doing the heavy lifting of note-taking and summarization while giving the user complete editorial control before finalizing the record.

This project is a submission for the **GenAI Agentic Bot Hackathon: Meeting Productivity Unleashed**.

## 🔴 Live Demo

**[INSERT YOUR DEPLOYED APP LINK HERE]**

---

## 🌟 Key Features

Momentum AI is packed with advanced, agentic features designed to turn every meeting into a productivity win:

* **🎙️ Audio-to-Minutes Pipeline:** Upload any common audio or video file (MP3, WAV, MP4, M4A) and let the agent handle the rest.
* **🧠 Comprehensive AI Analysis:** Goes far beyond simple summaries to generate a rich, structured output, including:
    * **Sentiment Analysis:** Understand the tone and mood of the meeting at a glance.
    * **Topic Tagging:** Automatically generated keywords for easy reference and categorization.
    * **Detailed Discussion Points:** Captures the key topics and a detailed, multi-sentence summary of what was discussed.
    * **Thorough Action Item Extraction:** Intelligently identifies both explicit and *implied* tasks, assigning owners and deadlines.
* **✍️ Full Editorial Control (User-in-the-Loop):** The user has the final say on the meeting's record.
    * **Delete irrelevant points** or tasks with a single click.
    * **Manually add** new discussion points or action items that the AI may have missed, ensuring 100% accuracy.
* **🤖 Interactive RAG Chat:** "Chat with your transcript." Ask specific questions about the meeting ("What was the deadline for the pipeline fix?") and get instant, context-aware answers from the AI.
* **📤 One-Click Notion Export:** After editing and finalizing the minutes, export the complete, beautifully formatted record to a Notion database with a single click.
* **✨ Polished & Responsive UI:** A clean, professional, and intuitive user interface designed for a seamless experience on both desktop and mobile.

---

## ⚙️ How It Works

1.  **Upload:** The user uploads an audio/video file of their meeting.
2.  **Process:** The backend transcribes the audio, and an LLM generates a detailed draft of the minutes, including sentiment, topics, discussion points, and action items.
3.  **Review & Edit:** The user reviews the AI-generated draft on a clean UI. They can delete any item or manually add new ones to ensure perfect accuracy.
4.  **Query (Optional):** The user can ask specific questions about the meeting via the RAG chat interface to gain deeper insights.
5.  **Export:** With one click, the final, curated minutes are sent to a Notion database.

---

## 🛠️ Technology Stack

| Component            | Technology                                                          |
| -------------------- | ------------------------------------------------------------------- |
| **Frontend** | React.js                                                            |
| **Backend** | Python (FastAPI)                                                    |
| **LLM & Transcription** | Groq Cloud (Llama3, Whisper)                                     |
| **External APIs** | Notion API                                                          |

---

## 🚀 Running the Project Locally

To run this project on your local machine, follow these steps.

### Prerequisites

* Node.js and npm
* Python 3.10+ and pip
* A `.env` file in the `backend` directory with your API keys (`GROQ_API_KEY`, `NOTION_API_KEY`, `NOTION_DATABASE_ID`).

### Backend Setup


```bash
# 1. Navigate to the backend folder
cd backend

# 2. Create and activate a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows, use `venv\Scripts\activate`

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run the server
uvicorn main:app --reload  
```
### Frontend Setup

```bash
# 1. Navigate to the frontend folder
cd frontend

# 2. Install dependencies
npm install

# 3. Start the development server
npm start
```

Once started, the application will be available at **[http://localhost:3000](http://localhost:3000)**.

