import os
import asyncio
from dotenv import load_dotenv
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Body, WebSocket, Request
from twilio.rest import Client
from twilio.twiml.voice_response import VoiceResponse, Connect
from app.db.crud import get_job_data, update_calling_status, get_application_data
from app.services.calling_utils import initiate_call_to_number, handle_twiml_service
from app.services.calling_agent_runner import start_agent_session, agent_to_client_calling, client_to_agent_calling
from app.api.calling_globals import (
    global_job_description,
    global_job_title,
    global_screening_questions_prompt,
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
    global global_job_description, global_screening_questions_prompt, global_job_title

    job_data = get_job_data(request.job_id)
    if not job_data:
        raise HTTPException(status_code=404, detail="Job not found")

    global_job_description=job_data['description']
    global_screening_questions_prompt=job_data['screening_questions_prompt']
    global_job_title = job_data['title']

    application_data = get_application_data(request.application_id)
    if not application_data:
        return HTTPException(status_code=404, detail="Applicant not found")
    to_number = application_data['phone']
    print("Calling number: ", to_number)
    if not to_number.startswith("+91"):
        to_number = "+91" + to_number
    response = await initiate_call_to_number(to_number)
    print("Call sid = ", response.get("call_sid"))
    if response.get("status") == "initiated":
        update_calling_status(request.application_id, "in progress")
    return response

@call_router.post("/call/twiml")
async def handle_twiml(request: Request):
    return await handle_twiml_service(request)

@call_router.websocket("/wscall/{session_id}")
async def websocket_endpoint_call(websocket: WebSocket, session_id: str):
    """Client websocket endpoint"""

    is_audio = "true"

    # Wait for client connection
    await websocket.accept()
    print(f"Client #{session_id} connected, audio mode: {is_audio}")

    # Start agent session
    session_id = str(session_id)
    live_events, live_request_queue = await start_agent_session(session_id, is_audio == "true")

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
