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
from sqlalchemy import create_engine, MetaData, Table, select
from sqlalchemy.orm import sessionmaker
import boto3 # type:ignore
import requests


logger = logging.getLogger(__name__)
# Load environment variables
load_dotenv()

# DB_URL = "postgresql://postgres.pxrswnfszmbwlswtkpjk:lavitra2004lavitra@aws-0-ap-south-1.pooler.supabase.com:6543/postgres"
# session_service = DatabaseSessionService(db_url=DB_URL)
# Constants
APP_NAME = "adk_streaming_app"
session_service = InMemorySessionService()



# AWS Configuration
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_REGION")
AWS_BUCKET_NAME = os.getenv("AWS_BUCKET_NAME")
OCR_API_KEY = os.getenv("OCR_API_KEY")  # Add this to your .env
OCR_URL = "https://api.ocr.space/parse/image"

# Initialize boto3 S3 client
s3 = boto3.client(
    "s3",
    region_name=AWS_REGION,
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY
)


# Read variables from env
DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_NAME = os.getenv("DB_NAME")
DB_PORT = os.getenv("DB_PORT", "5432") 
DB_URL = f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# Create the engine and session
engine = create_engine(DB_URL)
Session = sessionmaker(bind=engine)
session = Session()

# Reflect the 'files' table (assuming it exists in your DB)
metadata = MetaData()
resume_files = Table('resume_files', metadata, autoload_with=engine)
jobs = Table('jobs', metadata, autoload_with=engine)

def get_resume_file(file_id):
    stmt = select(resume_files).where(resume_files.c.id == file_id)
    result = session.execute(stmt).fetchone()

    if result:
        return dict(result._mapping)
    else:
        return None
    
def get_jd_ats_prompts(job_id):
    stmt = select(jobs).where(jobs.c.id == job_id)
    result = session.execute(stmt).fetchone()

    if result:
        return dict(result._mapping)
    else:
        return None
    
def fetch_file_from_s3(s3_key):
    try:
        response = s3.get_object(Bucket=AWS_BUCKET_NAME, Key=s3_key)
        return response['Body'].read()
    except s3.exceptions.NoSuchKey:
        print(f"No such key: {s3_key}")
    except Exception as e:
        print("Error fetching from S3:", e)

def pdf_to_base64(pdf_bytes):
    encoded = base64.b64encode(pdf_bytes).decode("utf-8")
    return f"data:application/pdf;base64,{encoded}"

def send_to_ocr_api(base64_pdf):
    files = {
        'base64Image': base64_pdf,
    }
    headers = {
        'apikey': OCR_API_KEY,
        'isOverlayRequired': 'False',
    }

    response = requests.post(OCR_URL, headers=headers, data=files)
    if response.ok:
        return response.json()
    else:
        print("OCR API error:", response.text)
        return None



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
    file_data = get_resume_file(file_id)  # replace with actual UUID
    resume_raw_text = ""
    
    if not file_data:
        raise HTTPException(status_code=404, detail="File not found")
    if file_data['storage']=='s3':
        s3_key = file_data['path']  # This is the key saved in your DB
        file_from_s3 = fetch_file_from_s3(s3_key)
        if file_data['type']=='pdf':
            base64_pdf = pdf_to_base64(file_from_s3)
            ocr_response = send_to_ocr_api(base64_pdf)
            if ocr_response and 'ParsedResults' in ocr_response:
                for result in ocr_response['ParsedResults']:
                    resume_raw_text += result.get('ParsedText', '')
            else:
                raise HTTPException(status_code=500, detail="OCR extraction failed")
    # print("Resume raw text extracted:", resume_raw_text)
    
    job_id = file_data['job_id']
    job_data = get_jd_ats_prompts(job_id)
    if job_data is None:
        raise HTTPException(status_code=404, detail="Job not found")
    ats_calculation_prompt = job_data['ats_calculation_prompt']
    print("ATS Calculation Prompt:", ats_calculation_prompt)
    description = job_data['description']
    print("Job Description:", description)
    
    
    try:
         #call agent to parse the extracted resume and return a good response
        response = await run_agent_resume_extract(
            application_id=request.application_id,
            resume_raw_text=resume_raw_text,
            ats_calculation_prompt=ats_calculation_prompt,
            job_description=description
        )
        # return {"response": response}
        print("API HAS BEEN CALLED, application_id:", application_id, "file_id:", file_id)
        print("Response from agent:", response)
    except Exception as e:
        logger.error(f"Failed to handle resume extract: {e}")
        raise HTTPException(status_code=500, detail="Resume extraction failed")
    
    
async def run_agent_resume_extract(application_id: str, resume_raw_text: str, ats_calculation_prompt: str, job_description: str):
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
        
        root_agent = await get_agent_async(
            purpose="resume_extractor", 
            extras={
                "ats_calculation_prompt": ats_calculation_prompt,
                "job_description": job_description
            }
        )
        fallback_data = {
            "application_id": application_id,
            "resume_raw_text": resume_raw_text,
            "error": True,
            "raw_text": ""
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
                if event.content and event.content.parts and event.content.parts[0].text is not None:
                    raw_text = event.content.parts[0].text
                    try:
                        parsed_json = json.loads(raw_text)
                        return json.dumps(parsed_json)
                    except json.JSONDecodeError as e:
                        print("Failed to parse JSON from response")
                        print(f"Error: {e}, raw text: {raw_text}")
                        fallback_data["raw_text"] = raw_text
                        fallback_data["error"] = True
                        return json.dumps(fallback_data)
        
        except Exception as e:
            logger.exception("Error during agent execution")
            print(e)
            raise HTTPException(status_code=500, detail="Agent execution failed") from e
        
        return json.dumps(fallback_data)
    
    except Exception as e:
        logger.exception("Error during question generation agent execution")
        raise HTTPException(status_code=500, detail="Agent run failed") from e
    