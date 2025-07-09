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

playground_router = APIRouter()
APP_NAME = "adk_streaming_app"

global_job_description = ""
global_screening_questions_prompt = ""




@playground_router.websocket("/ws/{session_id}")
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
