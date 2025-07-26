import os
import json
import re
from datetime import datetime
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, UploadFile, File, Request
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
import notion_client
from zoneinfo import ZoneInfo

# --- 1. Configuration Management ---
load_dotenv()
class Settings(BaseModel):
    groq_api_key: str = Field(os.environ.get("GROQ_API_KEY"))
    notion_api_key: str = Field(os.environ.get("NOTION_API_KEY"))
    notion_database_id: str = Field(os.environ.get("NOTION_DATABASE_ID"))
    transcription_model: str = "whisper-large-v3"
    summary_model: str = "llama3-8b-8192"
    chat_model: str = "llama3-8b-8192"

settings = Settings()
app = FastAPI()
groq_client = Groq(api_key=settings.groq_api_key)
notion = notion_client.Client(auth=settings.notion_api_key)

# --- 2. Middleware ---
# --- 2. Middleware ---
CORS_ORIGIN_REGEX = r"http://localhost:3000|https://.*--agaazs-projects\.vercel\.app|https://momentum-ai-tutorial\.vercel\.app"

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=CORS_ORIGIN_REGEX, # Use regex instead of a static list
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 3. Pydantic Data Models ---
class ActionItem(BaseModel): id: int; task: str; owner: list[str]; deadline: str | None = None
class DiscussionPoint(BaseModel): id: int; topic: str; summary: str
class ProcessOutput(BaseModel): overall_sentiment: str; topics: list[str]; discussion_points: list[DiscussionPoint]; action_items: list[ActionItem]; transcript: str
class FinalMinutes(BaseModel): overall_sentiment: str; topics: list[str]; discussion_points: list[DiscussionPoint]; action_items: list[ActionItem]
class ChatInput(BaseModel): question: str; transcript: str

# --- 4. AI Service & Prompts ---
class AIService:
    """Handles all interactions with the AI models and data cleaning."""
    
    SUMMARY_SYSTEM_PROMPT = f"""
    You are a meticulous meeting secretary AI. Your task is to analyze a meeting transcript and produce a comprehensive and detailed set of minutes in a structured JSON format. Do not summarize too aggressively; capture all significant points.
    The current date is {datetime.now().strftime('%Y-%m-%d')}.
    **CRITICAL INSTRUCTIONS:** Your entire response MUST be a single, valid JSON object following the schema provided.
    1. **overall_sentiment**: A single word describing the mood of the meeting.
    2. **topics**: A list of 2-5 short string keywords or tags.
    3. **discussion_points**: A detailed list of objects for each major topic, including a 'topic' and a 'summary'.
    4. **action_items**: A comprehensive list of all explicit and implied tasks, including an 'id', 'task', 'owner' (as a list), and 'deadline'.
    """
    
    RAG_SYSTEM_PROMPT = """
    You are a helpful AI assistant. Your task is to answer a user's question based ONLY on the provided meeting transcript.
    Be concise. If the answer is not in the transcript, say "The answer is not found in the transcript."
    """

    def clean_and_validate_ai_response(self, s: str) -> dict:
        """A highly robust function to find, clean, and validate the AI's JSON output."""
        json_start = s.find('{'); json_end = s.rfind('}') + 1
        if json_start == -1 or json_end == 0:
            raise ValueError("No JSON object found in the AI response.")
        
        json_str = s[json_start:json_end]
        cleaned_str = re.sub(r',\s*([}\]])', r'\1', json_str)
        cleaned_str = re.sub(r'("id":\s*\d+)"', r'\1', cleaned_str)
        
        try:
            data = json.loads(cleaned_str)
        except json.JSONDecodeError as e:
            raise ValueError(f"Failed to decode JSON after basic cleaning: {e}")

        current_id = 1
        # Validate and clean discussion_points
        if "discussion_points" in data and isinstance(data["discussion_points"], list):
            for item in data["discussion_points"]:
                # NEW: Force ID to be a valid integer
                item["id"] = current_id
                current_id += 1
                if "summary" not in item:
                    item["summary"] = "No summary was generated for this topic."

        # Validate and clean action_items
        if "action_items" in data and isinstance(data["action_items"], list):
            for item in data["action_items"]:
                # NEW: Force ID to be a valid integer
                item["id"] = current_id
                current_id += 1
                if "owner" in item and isinstance(item["owner"], str):
                    item["owner"] = [item["owner"]]
        
        return data

    def get_summary_from_transcript(self, transcript: str) -> dict:
        completion = groq_client.chat.completions.create(messages=[{"role": "system", "content": self.SUMMARY_SYSTEM_PROMPT}, {"role": "user", "content": transcript}], model=settings.summary_model)
        raw_response = completion.choices[0].message.content
        return self.clean_and_validate_ai_response(raw_response)

    def get_answer_from_rag(self, question: str, transcript: str) -> str:
        prompt = f"Context:\n{transcript}\n\nUser Question: {question}"
        completion = groq_client.chat.completions.create(messages=[{"role": "system", "content": self.RAG_SYSTEM_PROMPT}, {"role": "user", "content": prompt}], model=settings.chat_model)
        return completion.choices[0].message.content

ai_service = AIService()

# --- 5. Notion Service ---
class NotionService:
    """Handles all interactions with the Notion API."""
    def export_minutes(self, data: FinalMinutes):
        if not settings.notion_database_id:
            raise ValueError("Notion Database ID not configured.")
        
        # This is the new timezone-aware logic
        ist_time = datetime.now(ZoneInfo("UTC")).astimezone(ZoneInfo("Asia/Kolkata"))
        page_title = f"Meeting Minutes - {ist_time.strftime('%Y-%m-%d %H:%M %Z')}"
        
        children = []
        
        children.append({"heading_2": {"rich_text": [{"text": {"content": "Key Info"}}]}})
        children.append({"bulleted_list_item": {"rich_text": [{"text": {"content": f"Overall Sentiment: {data.overall_sentiment}"}}]}})
        children.append({"bulleted_list_item": {"rich_text": [{"text": {"content": f"Topics: {', '.join(data.topics)}"}}]}})

        if data.discussion_points:
            children.append({"heading_2": {"rich_text": [{"text": {"content": "Discussion Points"}}]}})
            for point in data.discussion_points:
                children.append({"heading_3": {"rich_text": [{"text": {"content": point.topic}}]}})
                children.append({"paragraph": {"rich_text": [{"text": {"content": point.summary}}]}})
        
        if data.action_items:
            children.append({"heading_2": {"rich_text": [{"text": {"content": "Action Items"}}]}})
            for item in data.action_items:
                owners = ", ".join(item.owner)
                task_text = f"{item.task} (Owner: {owners}, Deadline: {item.deadline or 'N/A'})"
                children.append({"to_do": {"rich_text": [{"text": {"content": task_text}}], "checked": False}})
        
        notion.pages.create(
            parent={"database_id": settings.notion_database_id},
            properties={"title": {"title": [{"text": {"content": page_title}}]}},
            children=children
        )

notion_service = NotionService()

# --- 6. API Endpoints ---
# ... (All endpoints are unchanged)
@app.get("/")
async def health_check():
    """Provides a simple 200 OK response for the hosting service to check."""
    return {"status": "ok", "message": "Momentum AI Backend is running."}


@app.post("/process-meeting", response_model=ProcessOutput)
async def process_meeting(file: UploadFile = File(...)):
    try:
        transcription_text = groq_client.audio.transcriptions.create(file=(file.filename, file.file.read()), model=settings.transcription_model).text
        summary_json = ai_service.get_summary_from_transcript(transcription_text)
        summary_json['transcript'] = transcription_text
        return ProcessOutput(**summary_json)
    except Exception as e:
        print(f"ERROR in /process-meeting: {e}")
        raise HTTPException(status_code=500, detail="An internal error occurred during processing.")

@app.post("/export-to-notion")
async def export_to_notion(data: FinalMinutes):
    """Receives user-edited minutes and exports them to Notion."""
    try:
        notion_service.export_minutes(data)
        return {"status": "success", "message": "Successfully exported to Notion!"}
    except Exception as e:
        print(f"ERROR in /export-to-notion: {e}")
        raise HTTPException(status_code=500, detail="Failed to export to Notion.")

@app.post("/chat")
async def chat_with_transcript(data: ChatInput):
    try: answer = ai_service.get_answer_from_rag(data.question, data.transcript); return {"answer": answer}
    except Exception as e: raise HTTPException(status_code=500, detail="Failed to get an answer from the AI.")

# --- 7. Disabled Google Calendar Endpoints ---
@app.get("/login/google")
async def login_google(): return {"message": "Google Calendar integration is temporarily disabled."}
@app.get("/oauth2callback")
async def oauth2callback(request: Request): return RedirectResponse("http://localhost:3000/")
@app.post("/export-to-calendar")
async def export_to_calendar(): return {"message": "Google Calendar integration is temporarily disabled."}