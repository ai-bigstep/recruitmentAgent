import os
import asyncio
from dotenv import load_dotenv
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Body, WebSocket, Request
from twilio.rest import Client
from twilio.twiml.voice_response import VoiceResponse, Connect
from app.db.crud import get_job_data, update_calling_status, get_application_data, get_application_by_phone
from app.services.calling_utils import initiate_call_to_number, handle_twiml_service
from app.services.calling_agent_runner import start_agent_session, agent_to_client_calling, client_to_agent_calling
from app.api.calling_globals import (
    client,
)

load_dotenv()

call_router = APIRouter()
APP_NAME = "adk_streaming_app"


class RunRequest(BaseModel):
    job_id: str
    application_id: str



@call_router.post("/call")
async def initiate_call(request: RunRequest = Body(...)):
    job_id = str(request.job_id)
    application_id = str(request.application_id)


    job_data = get_job_data(request.job_id)
    if not job_data:
        raise HTTPException(status_code=404, detail="Job not found")

    global_job_description=job_data['description']
    global_screening_questions_prompt=job_data['screening_questions_prompt']
    global_job_title = job_data['title']

    application_data = get_application_data(request.application_id)
    if not application_data:
        return HTTPException(status_code=404, detail="Applicant not found")
    global_applicant_name = application_data['name']

    to_number = application_data['phone']
    print("Calling number: ", to_number)
    if not to_number.startswith("+91"):
        to_number = "+91" + to_number
    response = await initiate_call_to_number(to_number, application_id)
    print("Call sid = ", response.get("call_sid"))
    return response

@call_router.post("/call/twiml")
async def handle_twiml(request: Request):
    return await handle_twiml_service(request)

@call_router.post("/call/status_callback")
async def call_status_callback(request: Request):
    data = await request.form()
    call_sid = data.get("CallSid")
    call_status = data.get("CallStatus")
    if call_status in ["initiated", "ringing", "answered", "in progress"]:
        call_status = "in_progress"
    if call_status == "completed":
        call_status = "completed"

    called_number = data.get("Called")
    print(f"Received status callback: CallSid={call_sid}, CallStatus={call_status}, Called={called_number}")
    # Normalize phone number if needed (e.g., remove +91)
    if called_number and called_number.startswith("+91"):
        db_phone = called_number[3:]
    else:
        db_phone = called_number
    
    # Update call status for all applications where phone contains db_phone
    from app.db.crud import update_application_call_status_by_phone
    update_application_call_status_by_phone(db_phone, call_status)
    print(f"Updated application(s) with phone containing {db_phone} call status to {call_status}")
    return {"status": "received"}

@call_router.websocket("/wscall/{session_id}/{application_id}")
async def websocket_endpoint_call(websocket: WebSocket, session_id: str, application_id: str):
    """Client websocket endpoint"""

    is_audio = "true"

    # Wait for client connection
    await websocket.accept()
    print(f"Client #{session_id} connected, audio mode: {is_audio}, Application ID: {application_id}")

    # Start agent session
    session_id = str(session_id)
    live_events, live_request_queue = await start_agent_session(session_id, application_id,  is_audio == "true")

    # Start tasks
    agent_to_client_task = asyncio.create_task(
        agent_to_client_calling(websocket, live_events)
    )
    client_to_agent_task = asyncio.create_task(
        client_to_agent_calling(websocket, live_request_queue)
    )
    await asyncio.gather(agent_to_client_task, client_to_agent_task)
     # Wait until the websocket is disconnected or an error occurs
    # tasks = [agent_to_client_task, client_to_agent_task]
    # await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)

    # Disconnected
    print(f"Client #{session_id} disconnected")
