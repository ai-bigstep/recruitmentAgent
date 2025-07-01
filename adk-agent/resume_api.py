import os
import json
import asyncio
import base64
import shutil
import sys
from pathlib import Path
from dotenv import load_dotenv
import re
from pydantic import BaseModel
from google.adk.runners import Runner
from app.adk_agent.agent import get_agent_async
from google.genai.types import Part, Content, Blob
from google.adk.runners import Runner
from google.adk.agents.live_request_queue import LiveRequestQueue
from google.adk.agents.run_config import RunConfig
from google.adk.sessions.in_memory_session_service import InMemorySessionService
from google.adk.sessions import DatabaseSessionService
from google.genai import types
from app.adk_agent.agent import session_service
from fastapi import FastAPI, WebSocket, Body, HTTPException,Request,Response,WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from mcp.types import CallToolResult, TextContent
import logging
from google.genai.types import SpeechConfig, VoiceConfig, PrebuiltVoiceConfig, AudioTranscriptionConfig
from google.adk.agents.run_config import StreamingMode
from twilio.rest import Client # type:ignore
from twilio.twiml.voice_response import VoiceResponse, Connect # type:ignore
import audioop
# from queue_handler import poll_sqs
import boto3 # type:ignore

logger = logging.getLogger(__name__)
# Load environment variables
load_dotenv()

# DB_URL = "postgresql://postgres.pxrswnfszmbwlswtkpjk:lavitra2004lavitra@aws-0-ap-south-1.pooler.supabase.com:6543/postgres"
# session_service = DatabaseSessionService(db_url=DB_URL)
# Constants
APP_NAME = "adk_streaming_app"
session_service = InMemorySessionService()
# QUEUE_URL = 'https://sqs.ap-south-1.amazonaws.com/474560118046/resumequeue'
# # API_ENDPOINT = os.getenv('API_ENDPOINT')  # e.g., http://localhost:8000/api/process-resume
# API_ENDPOINT = 'http://localhost:8000/resumeextract'  # Default for local testing
# AWS_REGION = os.getenv('AWS_REGION', 'ap-south-1')


# # Initialize AWS SQS client
# sqs = boto3.client('sqs', region_name=AWS_REGION)


# print("🚀 Starting SQS worker...")
# poll_sqs()


class RunRequest(BaseModel):
    application_id: str
    file_id: str



# FastAPI Application
app = FastAPI()
USER_ID = "new"

# Serve static files
STATIC_DIR = Path("app/static")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")



@app.post("/resumeextract")
async def resume_extract(request: RunRequest = Body(...)):
    application_id = request.application_id
    file_id = request.file_id
    try:
        #api to extract resume
        
        resume_raw_text = "hello world"  # Placeholder for the actual resume text extraction logic
        #call agent to parse the extracted resume and return a good response
        # response = await run_agent_resume_extract(
        #     application_id=request.application_id,
        #     resume_raw_text=resume_raw_text,
        # )
        # return {"response": response}
        print("API HAS BEEN CALLED, application_id:", application_id, "file_id:", file_id)
    except Exception as e:
        logger.error(f"Failed to handle resume extract: {e}")
        raise HTTPException(status_code=500, detail="Resume extraction failed")
    
    
async def run_agent_resume_extract(application_id: str, resume_raw_text: str):
    session_id = application_id  # Use application_id as session_id
    try:
        session = await session_service.get_session(
            app_name=APP_NAME,
            user_id=USER_ID,
            session_id=session_id
        )

        if not session:
            session = await session_service.create_session(
                app_name=APP_NAME,
                user_id=USER_ID,
                session_id=session_id,
            )
        
        root_agent = await get_agent_async()
        fallback_data = {
            "application_id": application_id,
            "resume_raw_text": resume_raw_text,
            "error": True
        }
        
        print(f"Running agent for application_id: {application_id}, session_id: {session_id}, resume_raw_text: {resume_raw_text}")
        try:
            runner = Runner(
                    agent=root_agent,
                    app_name=APP_NAME,
                    session_service=session_service
                )
            print(f"Runner created for agent: {runner}")
            user_input = types.Content(role='user', parts=[types.Part(text=resume_raw_text)])
            print(f"User input for agent: {user_input}")
            async for event in runner.run_async(
                user_id=USER_ID,
                session_id=session_id,
                new_message=user_input,
            ):
                print(f"Event received: {event}")
                raw_text=""
                if event.content.parts[0].text is not None:
                    raw_text = event.content.parts[0].text
                    try:
                        parsed_json = json.loads(raw_text)
                        return json.dumps(parsed_json)
                    except json.JSONDecodeError as e:
                        print("Failed to parse JSON from response")
                        print(f"Error: {e}, raw text: {raw_text}")
                        return json.dumps(fallback_data)
        
        except Exception as e:
            logger.exception("Error during agent execution")
            print(e)
            raise HTTPException(status_code=500, detail="Agent execution failed") from e
        
        return json.dumps(fallback_data)
    
    except Exception as e:
        logger.exception("Error during question generation agent execution")
        raise HTTPException(status_code=500, detail="Agent run failed") from e
    