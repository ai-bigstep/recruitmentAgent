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



account_sid = os.getenv('TWILIO_ACCOUNT_SID')
auth_token = os.getenv('TWILIO_AUTH_TOKEN')


print(f"TWILIO_ACCOUNT_SID: {account_sid}")
print(f"TWILIO_AUTH_TOKEN: {auth_token}")
client = Client(account_sid, auth_token)
logger = logging.getLogger(__name__)
# Load environment variables
load_dotenv()

def delete_pycache():
    """Deletes all __pycache__ directories in the project."""
    base_dir = os.path.dirname(os.path.abspath(__file__))
    for root, dirs, files in os.walk(base_dir):
        for dir_name in dirs:
            if dir_name == "__pycache__":
                pycache_path = os.path.join(root, dir_name)
                try:
                    shutil.rmtree(pycache_path)
                    logger.info(f"Deleted: {pycache_path}")
                except Exception as e:
                    logger.error(f"Failed to delete {pycache_path}: {e}")

# Delete __pycache__ directories at startup
# delete_pycache()




# Import the agent
# from app.adk_agent import root_agent
# DB_URL="postgresql://postgres.jmpsgftqigcfldvjudbi:vicky2002@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"
DB_URL = "postgresql://postgres.pxrswnfszmbwlswtkpjk:lavitra2004lavitra@aws-0-ap-south-1.pooler.supabase.com:6543/postgres"
session_service = DatabaseSessionService(db_url=DB_URL)
# Constants
APP_NAME = "adk_streaming_app"
# session_service = InMemorySessionService()
from app.adk_agent.agent import start_agent_session



twilio_stream_sid = None  # Define twilio_stream_sid in the global scope



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



session_service = DatabaseSessionService(db_url=DB_URL)
async def agent_to_client_messaging(websocket, live_events):
    """Agent to client communication"""
    while True:
        async for event in live_events:
            # for input time
            # calls = event.get_function_calls()
            # if calls:
            #     for call in calls:
            #         tool_name = call.name
            #         arguments = call.args  # This is usually a dictionary
            #         print("calls " ,calls)
            #         print(f"  Tool: {tool_name}, Args: {arguments}")
            #         data={
            #             "ui":arguments,
            #             "method_call":tool_name
            #         }
            #         await websocket.send_text(json.dumps(data))
            responses = event.get_function_responses()
            if responses:
                for response in responses:
                    tool_name = response.name
                    result_dict = response.response  # The dictionary returned by the tool
                    print(f"Tool Result: {tool_name} -> {result_dict}")
                    
                    try:
                        result = result_dict.get('result')
                        if isinstance(result, CallToolResult):
                            # Get the text content from the result
                            if result.content and isinstance(result.content[0], TextContent):
                                raw_text = result.content[0].text
                                
                                # Check if this is an error message
                                if result.isError:
                                    print(f"Tool error: {raw_text}")
                                    # Send a simplified error response
                                    error_data = {
                                        "method_call": tool_name,
                                        "data": {
                                            "error": True,
                                            "message": "Unable to process your request at this time."
                                        }
                                    }
                                    await websocket.send_text(json.dumps(error_data))
                                    continue

                                # Try to parse JSON safely
                                try:
                                    parsed_data = json.loads(raw_text)
                                    
                                    # Send the parsed data to the client
                                    data = {
                                        "method_call": tool_name,
                                        "data": parsed_data
                                    }
                                    await websocket.send_text(json.dumps(data))
                                except json.JSONDecodeError as e:
                                    print(f"JSON decode error: {e}, raw text: {raw_text}")
                                    # Send a fallback response with the raw text
                                    fallback_data = {
                                        "method_call": tool_name,
                                        "data": {
                                            "message": raw_text if raw_text else "No data available"
                                        }
                                    }
                                    await websocket.send_text(json.dumps(fallback_data))
                    except Exception as e:
                        print(f"Error processing tool result: {e}")
                        # Send a generic error response
                        error_response = {
                            "method_call": tool_name if 'tool_name' in locals() else "unknown_tool",
                            "data": {
                                "error": True,
                                "message": "An error occurred while processing your request."
                            }
                        }
                        await websocket.send_text(json.dumps(error_response))
            # If the turn complete or interrupted, send it

            if event.turn_complete or event.interrupted:
                message = {
                    "turn_complete": event.turn_complete,
                    "interrupted": event.interrupted,
                }
                await websocket.send_text(json.dumps(message))
                print(f"[AGENT TO CLIENT]: {message}")
                continue

            # Read the Content and its first Part
            part: Part = (
                event.content and event.content.parts and event.content.parts[0]
            )
            if not part:
                continue
            print("AUDIO EVENT (Agent to client)--------------")
            print(event)

            # If it's audio, send Base64 encoded audio data
            is_audio = part.inline_data and part.inline_data.mime_type.startswith("audio/pcm")
            if is_audio:
                audio_data = part.inline_data and part.inline_data.data
                if audio_data:
                    message = {
                        "mime_type": "audio/pcm",
                        "data": base64.b64encode(audio_data).decode("ascii")
                    }
                    await websocket.send_text(json.dumps(message))
                    print(f"[AGENT TO CLIENT]: audio/pcm: {len(audio_data)} bytes.")
                    continue

            # If it's text and a parial text, send it
            if part.text and event.partial:
                message = {
                    "mime_type": "text/plain",
                    "data": part.text
                }
                await websocket.send_text(json.dumps(message))
                print(f"[AGENT TO CLIENT]: text/plain: {message}")

async def client_to_agent_messaging(websocket, live_request_queue):
    """Client to agent communication"""
    while True:
        # Decode JSON message
        message_json = await websocket.receive_text()
        message = json.loads(message_json)
        mime_type = message["mime_type"]
        data = message["data"]

        # Send the message to the agent
        if mime_type == "text/plain":
            # Send a text message
            content = Content(role="user", parts=[Part.from_text(text=data)])
            live_request_queue.send_content(content=content)
            print(f"[CLIENT TO AGENT]: {data}")
        elif mime_type == "audio/pcm":
            # Send an audio data
            # print("AUDIO EVENT (Agent to client)--------------")
            # print(data)
            decoded_data = base64.b64decode(data)
            # print("DECODED DATA")
            # print(decoded_data)
            live_request_queue.send_realtime(Blob(data=decoded_data, mime_type=mime_type))
        else:
            raise ValueError(f"Mime type not supported: {mime_type}")




# FastAPI Application
app = FastAPI()
USER_ID = "new"

# Serve static files
STATIC_DIR = Path("app/static")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/")
async def root():
    """Serves the index.html"""
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))


@app.websocket("/wscall/{session_id}")
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


@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str, is_audio: str):
    """Client websocket endpoint"""

    # Wait for client connection
    await websocket.accept()
    print(f"Client #{session_id} connected, audio mode: {is_audio}")

    # Start agent session
    session_id = str(session_id)
    live_events, live_request_queue = await start_agent_session(session_id, is_audio == "true")

    # Start tasks
    agent_to_client_task = asyncio.create_task(
        agent_to_client_messaging(websocket, live_events)
    )
    client_to_agent_task = asyncio.create_task(
        client_to_agent_messaging(websocket, live_request_queue)
    )
    await asyncio.gather(agent_to_client_task, client_to_agent_task)

    # Disconnected
    print(f"Client #{session_id} disconnected")



# class ImageReq(BaseModel):
#     mime_type: str
#     data: str
#     session_id: str  # Added session_id to the request model

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Or restrict to your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/n8nwhatsapp")
async def n8n_whatsapp(request: RunRequest = Body(...)):
    """
    WhatsApp entrypoint to trigger question generation.
    """
    try:
        # delete_pycache()  # Clean up __pycache__ directories
        response = await handle_n8n_whatsapp(request)
        return {"response": response}
    except Exception as e:
        logger.error(f"Failed to handle WhatsApp question gen: {e}")
        raise HTTPException(status_code=500, detail="Question generation failed")



async def handle_n8n_whatsapp(request: RunRequest):
    """
    Handles routing of the question generation logic.
    """
    if request.mime_type=="text":
        return await run_agent_handle_n8n_whatsapp(
            session_id=request.session_id,
            text=request.text,
             # Ensure this is your actual types module
        )
    elif request.mime_type == "image/jpeg":
        return await run_agent_handle_n8n_whatsapp_imageHandle(
            session_id=request.session_id,
            text=request.text,
            base64_ = request.data,
            mime_type = request.mime_type,
             # Ensure this is your actual types module
        )
    elif request.mime_type.startswith("audio"):
        return await run_agent_handle_n8n_whatsapp_audioHandle(
            session_id=request.session_id,
            text=request.text,
            base64_ = request.data,
            mime_type = request.mime_type,
            
        )

# decoded_data = base64.b64decode(data)
#             live_request_queue.send_realtime(Blob(data=decoded_data, mime_type=mime_type))
#         else:

#yeh sab use ho raha hai neeche ka
async def run_agent_handle_n8n_whatsapp(session_id: str, text: str):
    """
    Runs the agent for generating questions using the provided session and text input.
    """
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
        
        root_agent, exit_stack = await get_agent_async()
        response_parts = []

        try:
            if exit_stack is None:
                # If no exit stack, just use the agent directly
                runner = Runner(
                    agent=root_agent,
                    app_name=APP_NAME,
                    session_service=session_service
                )
            else:
                # If we have an exit stack, use it as a context manager
                async with exit_stack:
                    runner = Runner(
                        agent=root_agent,
                        app_name=APP_NAME,
                        session_service=session_service
                    )

            user_input = types.Content(role='user', parts=[types.Part(text=text)])
            
            async for event in runner.run_async(
                user_id=USER_ID,
                session_id=session_id,
                new_message=user_input
            ):
                raw_text=""
                # if event.content and event.content.parts:
                print(f"YEH EVENT CONTENT HAI {"-"*100}")
                print(event.content)
                print(f"Iss event ke function calls hain:")
                calls = event.get_function_calls()
                if calls:
                    for call in calls:
                        tool_name = call.name
                        arguments = call.args # This is usually a dictionary
                        print(f"  Tool: {tool_name}, Args: {arguments}")
                        # Application might dispatch execution based on this
                print(f"Yeh event ke function responses hain: {event.get_function_responses()}")
                if event.content.parts[0].text is not None:
                    print(f"Yeh function call ke bina wala hai {"-"*50}")
                    raw_text = event.content.parts[0].text.strip()
                    print(raw_text)
                if event.get_function_responses() is not None:
                    print(f"Yeh function call WALA hai {"-"*50}")
                    responses = event.get_function_responses()
                    if responses:
                        for response in responses:
                            result_dict = response.response
                            try:
                                result = result_dict.get('result')
                                if isinstance(result, CallToolResult):
                                    # Get the text content from the result
                                    if result.content and isinstance(result.content[0], TextContent):
                                        raw_text = result.content[0].text.strip()
                                        print("CURRENT FUNCTION RESPONSE:----------------")
                                        print(raw_text)
                                    # if event.is_final_response():
                                    #     break
                            except Exception as e:
                                print(f"Error processing tool result: {e}")
                            
                print("RESPONSE PARTS : ---------------------")
                
                response_parts.append(raw_text)
                print(response_parts)

                

        except Exception as e:
            logger.exception("Error during agent execution")
            print(e)
            raise HTTPException(status_code=500, detail="Agent execution failed") from e
        finally:
            # Ensure cleanup happens in the same task
            if exit_stack is not None:
                exit_stack.aclose()

        return response_parts

    except Exception as e:
        logger.exception("Error during question generation agent execution")
        raise HTTPException(status_code=500, detail="Agent run failed") from e
    
# @app.post("/n8nwhatsapp/image")
async def run_agent_handle_n8n_whatsapp_imageHandle(session_id: str, text:str, base64_: str, mime_type: str):
    """
    WhatsApp entrypoint to handle image processing.
    """
    try:
        session = await session_service.get_session(
            app_name=APP_NAME,
            user_id=USER_ID,
            session_id=session_id
        )

        print("in memory existing ", session)
        if not session:
            session = await session_service.create_session(
                app_name=APP_NAME,
                user_id=USER_ID,
                session_id=session_id,
            )
        
        root_agent, exit_stack = await get_agent_async()
        response_parts = []

        try:
            if exit_stack is None:
                # If no exit stack, just use the agent directly
                runner = Runner(
                    agent=root_agent,
                    app_name=APP_NAME,
                    session_service=session_service
                )
            else:
                # If we have an exit stack, use it as a context manager
                async with exit_stack:
                    runner = Runner(
                        agent=root_agent,
                        app_name=APP_NAME,
                        session_service=session_service
                    )

            user_input = types.Content(
                role='user',
                parts=[
                    Part(text=text or "Assit the Cars or Any image according given"),
                    Part(
                        inline_data=Blob(
                            mime_type=mime_type,
                            data=base64.b64decode(base64_)
                        )
                    )
                ]
            )

            async for event in runner.run_async(
                user_id=USER_ID,
                session_id=session_id,
                new_message=user_input
            ):
                raw_text=""
                if event.content and event.content.parts:
                    print(f"YEH EVENT CONTENT HAI {'-'*100}")
                    print(event.content)
                    
                    if event.content.parts[0].text is not None:
                        print(f"Yeh function call ke bina wala hai {'-'*50}")
                        raw_text = event.content.parts[0].text.strip()
                        print(raw_text)
                        response_parts.append(raw_text)
                    
                    if event.get_function_responses() is not None:
                        print(f"Yeh function call WALA hai {'-'*50}")
                        responses = event.get_function_responses()
                        if responses:
                            for response in responses:
                                result_dict = response.response
                                try:
                                    print("event.is_final_response() ", event.is_final_response())
                                    result = result_dict.get('result')
                                    if isinstance(result, CallToolResult):
                                        if result.content and isinstance(result.content[0], TextContent):
                                            raw_text = result.content[0].text.strip()
                                            print("CURRENT FUNCTION RESPONSE:----------------")
                                            print(raw_text)
                                            response_parts.append(raw_text)
                                except Exception as e:
                                    print(f"Error processing tool result: {e}")
                    
                    print("RESPONSE PARTS : ---------------------")
                    print(response_parts)

            return response_parts

        except Exception as e:
            logger.exception("Error during agent execution")
            print(e)
            raise HTTPException(status_code=500, detail="Agent execution failed") from e
        finally:
            if exit_stack is not None:
                await exit_stack.aclose()

    except Exception as e:
        logger.error(f"Failed to handle image processing: {e}")
        raise HTTPException(status_code=500, detail="Image processing failed") from e
        

async def run_agent_handle_n8n_whatsapp_audioHandle(session_id: str, text:str, base64_: str, mime_type: str):
    """
    WhatsApp entrypoint to handle audio processing.
    """
    try:
        session = await session_service.get_session(
            app_name=APP_NAME,
            user_id=USER_ID,
            session_id=session_id
        )

        print("in memory existing ", session)
        if not session:
            session = await session_service.create_session(
                app_name=APP_NAME,
                user_id=USER_ID,
                session_id=session_id,
            )
        
        root_agent, exit_stack = await get_agent_async()
        response_parts = []
        
    # logger.info(f"Setting response modality to: {modality}")
        run_config = RunConfig(response_modalities=["AUDIO"],
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
        
                           
        try:
            if exit_stack is None:
                # If no exit stack, just use the agent directly
                runner = Runner(
                    agent=root_agent,
                    app_name=APP_NAME,
                    session_service=session_service
                )
            else:
                # If we have an exit stack, use it as a context manager
                async with exit_stack:
                    runner = Runner(
                        agent=root_agent,
                        app_name=APP_NAME,
                        session_service=session_service
                    )

            decoded_data = base64.b64decode(base64_)
            # live_request_queue.send_realtime(Blob(data=decoded_data, mime_type=mime_type))
        


            user_input = types.Content(
                role='user',
                parts=[
                    Part(
                        inline_data=Blob(data=decoded_data, mime_type="audio/ogg")
                    )
                ]
            )

            async for event in runner.run_async(
                user_id=USER_ID,
                session_id=session_id,
                new_message=user_input,
                run_config = run_config
            ):
                # part: Part = (
                # event.content and event.content.parts and event.content.parts[0]
                # )
                # if not part:
                #     continue
                # is_audio = part.inline_data and part.inline_data.mime_type.startswith("audio")
                # if is_audio:
                #     audio_data = part.inline_data and part.inline_data.data
                #     if audio_data:
                #         message = {
                #             "mime_type": "audio/pcm",
                #             "data": base64.b64encode(audio_data).decode("ascii")
                #         }
                #         response_parts.append(message)

                # print("event ",event)
                if event.content and event.content.parts:
                    # print(f"YEH EVENT CONTENT HAI {'-'*100}")
                    # print(event.content)
                    
                    if event.content.parts[0].text is not None:
                        # print(f"Yeh function call ke bina wala hai {'-'*50}")
                        raw_text = event.content.parts[0].text.strip()
                        # print(raw_text)
                        response_parts.append(raw_text)
                    
                    if event.get_function_responses() is not None:
                        print(f"Yeh function call WALA hai {'-'*50}")
                        responses = event.get_function_responses()
                        print("responses ", responses)
                        if responses:
                            for response in responses:
                                result_dict = response.response
                                try:
                                    # print("event.is_final_response() ", event.is_final_response())
                                    result = result_dict.get('result')
                                    if isinstance(result, CallToolResult):
                                        if result.content and isinstance(result.content[0], TextContent):
                                            raw_text = result.content[0].text.strip()
                                            print("CURRENT FUNCTION RESPONSE:----------------")
                                            print(raw_text)
                                            response_parts.append(raw_text)
                                except Exception as e:
                                    print(f"Error processing tool result: {e}")
                    
                    # print("RESPONSE PARTS : ---------------------")
                    print(response_parts)

            return response_parts

        except Exception as e:
            logger.exception("Error during agent execution")
            print(e)
            raise HTTPException(status_code=500, detail="Agent execution failed") from e
        finally:
            if exit_stack is not None:
                await exit_stack.aclose()

    except Exception as e:
        logger.error(f"Failed to handle image processing: {e}")
        raise HTTPException(status_code=500, detail="Image processing failed") from e
    

async def initiate_call_to_number(to_number: str):
    from_number = os.getenv("TWILIO_PHONE_NUMBER")
    base_url = os.getenv("BASE_URL", "http://localhost:8000")
    if base_url == "http://localhost:8000":
        print("Warning: BASE_URL is set to localhost. This may not work for Twilio calls in production.")
        base_url = input("Enter the BASE_URL for Twilio calls (e.g., https://yourdomain.com): ").strip()
    twiml_url = f"{base_url}/call/twiml"

    
    call_sid = create_call(to_number, from_number, twiml_url)
    return {"call_sid": call_sid, "status": "initiated"}


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
    audio_file_name = os.environ.get('INITIAL_GREETING_AUDIO_FILE', 'initial_audio.mp3')
    audio_file_url = f"{effective_base_url}/static/initial_audio.mp3"

    websocket_url_for_twilio = f"{ws_scheme}://{host}/wscall/{call_sid}"
    print(f"WebSocket URL for Twilio: {websocket_url_for_twilio}")
    
    twiml = generate_twiml(websocket_url_for_twilio, audio_file_url=audio_file_url)
    print(f"Twiml Response: {twiml}")
    return Response(content=twiml, media_type="application/xml") 


def create_call(to_number, from_number, twiml_url):
    call = client.calls.create(
        to=to_number,
        from_=from_number,
        url=twiml_url
    )
    return call.sid

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

@app.post("/call")
async def initiate_call(to_number: str):
    return await initiate_call_to_number(to_number)



@app.post("/call/twiml")
async def handle_twiml(request: Request):
    return await handle_twiml_service(request)