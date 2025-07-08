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
from twilio.rest import Client
from twilio.twiml.voice_response import VoiceResponse, Connect
import audioop


from fastapi import APIRouter, HTTPException, Body
from app.db.crud import get_job_data, update_calling_status, get_application_data
from app.adk_agent.agent import logger

load_dotenv()


account_sid = os.getenv('TWILIO_ACCOUNT_SID')
auth_token = os.getenv('TWILIO_AUTH_TOKEN')
client = Client(account_sid, auth_token)

call_router = APIRouter()
APP_NAME = "adk_streaming_app"

global_job_description = ""
global_screening_questions_prompt = ""

class RunRequest(BaseModel):
    job_id: str
    application_id: str



@call_router.post("/call")
async def initiate_call(request: RunRequest = Body(...)):
    global global_job_description, global_screening_questions_prompt

    job_data = get_job_data(request.job_id)
    if not job_data:
        raise HTTPException(status_code=404, detail="Job not found")

    global_job_description=job_data['description']
    global_screening_questions_prompt=job_data['screening_questions_prompt']

    application_data = get_application_data(request.application_id)
    if not application_data:
        return HTTPException(status_code=404, detail="Applicant not found")
    to_number = application_data['phone']
    print("Calling number: ", to_number)
    if not to_number.startswith("+91"):
        to_number = "+91" + to_number
    response = await initiate_call_to_number(to_number)
    if response.get("status") == "initiated":
        update_calling_status(request.application_id, "in progress")
    return response

async def initiate_call_to_number(to_number: str):
    from_number = os.getenv("TWILIO_PHONE_NUMBER")
    base_url = os.getenv("BASE_URL", "http://localhost:8000")
    if base_url == "http://localhost:8000":
        print("Warning: BASE_URL is set to localhost. This may not work for Twilio calls in production.")
        base_url = input("Enter the BASE_URL for Twilio calls (e.g., https://yourdomain.com): ").strip()
    twiml_url = f"{base_url}/call/twiml"

    
    call_sid = create_call(to_number, from_number, twiml_url)
    return {"call_sid": call_sid, "status": "initiated"}

def create_call(to_number, from_number, twiml_url):
    call = client.calls.create(
        to=to_number,
        from_=from_number,
        url=twiml_url
    )
    return call.sid

@call_router.post("/call/twiml")
async def handle_twiml(request: Request):
    return await handle_twiml_service(request)


async def handle_twiml_service(request: Request):
    form_data = await request.form()
    call_sid = form_data.get("CallSid")

    if not call_sid:
        error_twiml = '<Response><Say>An error occurred: Missing call identifier.</Say><Hangup/></Response>'
        return Response(content=error_twiml, media_type="application/xml", status_code=400)

    ws_scheme = "wss" if request.url.scheme == "https" else "ws"
    host = request.url.netloc
    scheme = request.url.scheme

    effective_base_url = f"{scheme}://{host}"
    print(f"Effective base URL: {effective_base_url}")
    # audio_file_name = os.environ.get('INITIAL_GREETING_AUDIO_FILE', 'initial_audio.mp3')
    # audio_file_url = f"{effective_base_url}/static/initial_audio.mp3"

    websocket_url_for_twilio = f"{ws_scheme}://{host}/wscall/{call_sid}"
    print(f"WebSocket URL for Twilio: {websocket_url_for_twilio}")
    
    twiml = generate_twiml(websocket_url_for_twilio)
    print(f"Twiml Response: {twiml}")
    return Response(content=twiml, media_type="application/xml") 




def generate_twiml(websocket_url, audio_file_url=None):
    response = VoiceResponse()
    # if audio_file_url:
    #     response.play(audio_file_url)
    response.say("Greetings! Connecting you to our agent, Kindly stay on the line. This call may be recorded for quality assurance purposes.", voice='Polly.Joanna', language='en-US')  # You can change voice/language
    connect = Connect()
    ws_url = websocket_url
    connect.stream(url=ws_url)
    response.append(connect)
    print(connect)
    return str(response)

def get_call_status(call_sid):
    call = client.calls(call_sid).fetch()
    return call.status


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


async def start_agent_session(session_id, is_audio=False):
    """Starts an agent session"""
    root_agent = await get_agent_async(
            purpose="calling_for_screening", 
            extras={
                "screening_questions_prompt": global_screening_questions_prompt,
                "job_description": global_job_description
            }
        )
    # Create a Session
    session =  await session_service.create_session(
        app_name=APP_NAME,
        user_id=session_id,
        session_id=session_id,
    )

    # Create a Runner
    runner = Runner(
        app_name=APP_NAME,
        agent=root_agent,
        session_service=session_service,
    )

    # transcription_config = AudioTranscriptionConfig(
    #     # Optional: specify the language for transcription
    # )

    # Set response modality
    modality = "AUDIO" if is_audio else "TEXT"
    logger.info(f"Setting response modality to: {modality}")
    run_config = RunConfig(response_modalities=[modality],
                        #    output_audio_transcription=transcription_config,
                           speech_config=SpeechConfig(
                               # Using Hindi-English language code for Hinglish
                               language_code="hi-IN",
                               voice_config=VoiceConfig(
                                   prebuilt_voice_config=PrebuiltVoiceConfig(voice_name="Aoede")
                               )
                           ),
                           streaming_mode=StreamingMode.BIDI,
                           )
                           

    # Create a LiveRequestQueue for this session
    logger.info("Creating live request queue")
    live_request_queue = LiveRequestQueue()

    # Start agent session
    logger.info("Starting agent session with memory service")
    live_events = runner.run_live(
        session=session,
        live_request_queue=live_request_queue,
        run_config=run_config,
    )

    print("live_events ",live_events)
    print(live_request_queue)
    return live_events, live_request_queue


async def agent_to_client_calling(websocket, live_events):
    global twilio_stream_sid
    ratecv_state = None # State for audioop.ratecv
    # Assume ADK outputs 16kHz PCM, Twilio needs 8kHz mu-law
    ADK_SAMPLE_RATE = 24000 # Adjusted based on suspicion of 24kHz output
    TWILIO_SAMPLE_RATE = 8000
    PCM_WIDTH = 2 # 16-bit PCM is 2 bytes per sample
    # mark_counter = 0 # Re-evaluate if per-chunk marks are needed; turn-based marks are often better.
    agent_is_speaking = False # Track if agent is currently sending audio for the turn
    turn_mark_counter = 0 # Counter for turn-specific marks
    # print("Twilio stream sid (agent to client): ", twilio_stream_sid)
    while True:
        try:
            async for event in live_events:
                # print(event)
                # Handle interruption or turn completion first, as these are control signals.
                if event.interrupted:
                    print(f"[AGENT TO CLIENT]: Agent interrupted by user (event.interrupted=True).")
                    if twilio_stream_sid and agent_is_speaking: # Only clear if agent was speaking
                        # 1. Send a clear message to Twilio to stop playback of buffered audio
                        clear_message = {
                            "event": "clear",
                            "streamSid": twilio_stream_sid
                        }
                        await websocket.send_text(json.dumps(clear_message))
                        print(f"[AGENT TO CLIENT]: Sent clear message to Twilio.")

                    if twilio_stream_sid: # Always send a mark after potential clear or for general interruption notification
                        # 2. Send a mark message. Twilio requires this after a 'clear'
                        #    to resume processing subsequent media messages.
                        mark_message = {
                            "event": "mark",
                            "streamSid": twilio_stream_sid,
                            "mark": {"name": "agent_interrupted"}
                        }
                        await websocket.send_text(json.dumps(mark_message))
                        print(f"[AGENT TO CLIENT]: Sent mark message: agent_interrupted (after clear or for interruption)")
                    agent_is_speaking = False # Agent is no longer considered to be speaking this turn
                    # The ADK runner will stop sending further audio for this turn.
                    continue # Process the next event

                if event.turn_complete:
                    print(f"[AGENT TO CLIENT]: Agent turn complete.")
                    if twilio_stream_sid and agent_is_speaking: # Only send completion mark if agent was speaking
                        turn_mark_counter += 1
                        mark_name = f"agent_turn_complete_{turn_mark_counter}"
                        mark_message = {"event": "mark", "streamSid": twilio_stream_sid, "mark": {"name": mark_name}}
                        await websocket.send_text(json.dumps(mark_message))
                        print(f"[AGENT TO CLIENT]: Sent mark message: {mark_name}")
                    agent_is_speaking = False # Agent finished speaking for this turn
                    continue # Process the next event

                if event.content and event.content.parts:
                    part = event.content.parts[0]
                    if part.inline_data and part.inline_data.mime_type.startswith("audio/pcm"):
                        if not twilio_stream_sid:
                            print("[AGENT TO CLIENT]: Error - twilio_stream_sid not set. Cannot send media.")
                            continue
                        
                        agent_is_speaking = True # Agent starts/continues speaking this turn
                        pcm_data = part.inline_data.data
                        # Resample PCM from ADK_SAMPLE_RATE to TWILIO_SAMPLE_RATE
                        try:
                            resampled_pcm_data, ratecv_state = audioop.ratecv(
                                pcm_data,
                                PCM_WIDTH,          # width (e.g., 2 for 16-bit PCM)
                                1,                  # nchannels (mono for Twilio)
                                ADK_SAMPLE_RATE,    # inrate (e.g., 16000 Hz from ADK)
                                TWILIO_SAMPLE_RATE, # outrate (8000 Hz for Twilio)
                                ratecv_state        # state for continuous resampling
                            )
                            # Convert resampled PCM (16-bit) to mu-law (8-bit)
                            mulaw_data = audioop.lin2ulaw(resampled_pcm_data, PCM_WIDTH) # Use PCM_WIDTH for input width
                        except Exception as resample_e:
                            print(f"Error during resampling or mu-law conversion: {resample_e}")
                            continue # Skip sending this chunk if conversion fails
                        payload_b64 = base64.b64encode(mulaw_data).decode('utf-8')
                        twilio_media_message = {"event": "media", "streamSid": twilio_stream_sid, "media": {"payload": payload_b64}}
                        await websocket.send_text(json.dumps(twilio_media_message))
                        print(f"[AGENT TO CLIENT]: Sent {len(mulaw_data)} mu-law bytes to Twilio.")
                        
                        if part.text:
                            print(f"[AGENT TO CLIENT]: transcription: {part.text}")
                        
                        # Original code sent a mark message after every audio chunk.
                        # This is often too frequent. Marks are now sent on interruption or turn completion.
                        # If per-chunk marks are essential for your Twilio setup (e.g., to keep stream alive for very long pauses),
                        # you might re-introduce a less frequent keep-alive mark here.
            

        except WebSocketDisconnect: # Should be caught by client_to_agent if Twilio disconnects
            # print(f"WebSocket disconnected during agent_to_client for session {session_id}.")
            break
        except Exception as e:
            # print(f"Error in agent_to_client for session {session_id}: {e}")
            break

async def client_to_agent_calling(websocket, live_request_queue):
    global twilio_stream_sid
    # For upsampling Twilio's 8kHz mu-law (after conversion to PCM) to 16kHz for ADK
    upsample_ratecv_state = None
    TWILIO_INPUT_SAMPLE_RATE = 8000  # After ulaw2lin, PCM is at 8kHz
    ADK_TARGET_INPUT_SAMPLE_RATE = 16000  # Target for ADK ASR
    PCM_INPUT_WIDTH = 2  # 16-bit PCM from ulaw2lin
    while True:
        try:
            message_str = await websocket.receive_text()
            message_data = json.loads(message_str)
            event = message_data.get("event")
            twilio_stream_sid = message_data.get("streamSid")
            # print("Twilio stream sid: ", twilio_stream_sid)
            
            if event == "start":
                start_details = message_data.get("start", {})
                print(f"[TWILIO EVENT START]: Stream SID: {twilio_stream_sid}, Details: {start_details}")
                # Send an initial message to the agent to trigger its greeting.
                # The agent's prompt should handle the actual greeting.
                live_request_queue.send_content(Content(role="user", parts=[Part(text="Hello")]))

            elif event == "media":
                payload = message_data.get("media", {}).get("payload")
                if payload:
                    audio_bytes_mulaw = base64.b64decode(payload)
                    # Convert mu-law (typically 8kHz, 1 byte per sample) to PCM (16-bit linear, 2 bytes per sample)
                    # audioop.ulaw2lin(data, width) -> width is output width (2 for 16-bit)
                    pcm_8khz_data = audioop.ulaw2lin(audio_bytes_mulaw, PCM_INPUT_WIDTH)

                    # Upsample from 8kHz PCM to ADK_TARGET_INPUT_SAMPLE_RATE (e.g., 16kHz) PCM
                    try:
                        pcm_16khz_data, upsample_ratecv_state = audioop.ratecv(
                        pcm_8khz_data,
                        PCM_INPUT_WIDTH,  # Input width (2 for 16-bit)
                        1,  # Number of channels (mono)
                        TWILIO_INPUT_SAMPLE_RATE,  # Current rate (8000 Hz)
                        ADK_TARGET_INPUT_SAMPLE_RATE,  # Target rate (16000 Hz)
                        upsample_ratecv_state  # State for continuous resampling
                        )
                        live_request_queue.send_realtime(Blob(data=pcm_16khz_data, mime_type="audio/pcm"))
                        # print(f"[CLIENT TO AGENT]: Sent {len(pcm_16khz_data)} PCM bytes ({ADK_TARGET_INPUT_SAMPLE_RATE}Hz) to ADK.")
                    except Exception as upsample_e:
                        print(f"Error during upsampling audio for ADK: {upsample_e}")
                        # Optionally, send the 8kHz data as a fallback or skip
                        # live_request_queue.send_realtime(Blob(data=pcm_8khz_data, mime_type="audio/pcm"))
                        # print(f"[CLIENT TO AGENT]: Sent {len(pcm_8khz_data)} PCM bytes (8kHz fallback) to ADK due to upsampling error.")

            elif event == "stop":
                print(f"[TWILIO EVENT STOP]: {message_data}")
                # live_request_queue.close()  # Signal ADK that input is done
                # twilio_stream_sid = None
                break

            elif event == "mark":
                print(f"[TWILIO EVENT MARK]: Received mark: {message_data.get('mark', {}).get('name')}")

        except WebSocketDisconnect:
            # print(f"WebSocket disconnected by client (Twilio) for session {session_id}.")
            live_request_queue.close()
            break
        except Exception as e:
            # print(f"Error in client_to_agent for session {session_id}: {e}")
            live_request_queue.close()
            break
