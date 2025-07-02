#from google.adk.agents.run_config import StreamingMode
from ..prompts.policy_boss_system_prompt import prompt_policy
from ..prompts.tata_motors_system_prompt import prompt_tata_motors
from ..prompts.godrej_properties_system_prompt import prompt_godrej_properties
from ..prompts.resume_extractor_prompt import prompt_resume_extractor
from datetime import datetime, timezone
from google.adk.agents.run_config import StreamingMode
import logging
import asyncio 
from datetime import datetime, timezone
import os

from dotenv import load_dotenv
from google.adk.agents.run_config import RunConfig
from google.adk.agents.live_request_queue import LiveRequestQueue
from google.adk.agents.llm_agent import LlmAgent
from google.adk.artifacts.in_memory_artifact_service import (
    InMemoryArtifactService,  # Optional
)
from google.adk.tools.google_search_tool import google_search
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset
from google.adk.tools.mcp_tool.mcp_session_manager import SseServerParams
from google.genai.types import SpeechConfig, VoiceConfig, PrebuiltVoiceConfig, AudioTranscriptionConfig
from rich import print
from .agent_guardrails.tata_motors_guardrails import before_model_guardrail as tata_guardrail
from .agent_guardrails.godrej_properties_guardrails import before_model_guardrail as godrej_guardrail


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


load_dotenv()
APP_NAME = "adk_streaming_app"
session_service = InMemorySessionService()
# company = os.getenv("COMPANY", "godrej")  # Default to godrej if not set

def serialize_datetime(dt):
    """Convert datetime to ISO format string."""
    if isinstance(dt, datetime):
        return dt.isoformat()
    return dt

async def get_tools_async():
    """Gets tools from the File System MCP Server."""
    logger.info("Fetching tools from MCP Server...")
    mcp_toolset = MCPToolset(
        connection_params=SseServerParams(
            url="http://localhost:8001/sse",
        )
    )
    tools = await mcp_toolset.get_tools()
    logger.info("MCP Toolset created successfully.")
    return tools, None  # No exit stack needed

async def get_agent_async(purpose: str = "resume_extractor", extras: dict = {}):
    """Creates an ADK Agent equipped with tools from the MCP Server."""
    # logger.info("Creating agent with tools...")
    # tools, exit_stack = await get_tools_async()
    # tools.append(google_search)
    # logger.info(f"Fetched {len(tools)} tools from MCP server.")

    # Add logging for memory tool
    logger.info("Adding load_memory tool to agent")
    if purpose == "resume_extractor":
        instruction = prompt_resume_extractor.replace(
            "{{ats_calculation_prompt}}", extras.get("ats_calculation_prompt", "")
        ).replace(
            "{{job_description}}", extras.get("job_description", "")
        )
    # guardrail = godrej_guardrail if company == "godrej" else tata_guardrail
    root_agent = LlmAgent(
        model="gemini-2.0-flash-exp",
        name="assistant",
        instruction=instruction,
        # tools=list(tools),
        # before_model_callback=guardrail,
    )
    logger.info("Agent created successfully with memory tool")
    return root_agent

# root_agent,exit_stack= get_agent_async()
async  def start_agent_session(session_id, is_audio=False):
    """Starts an agent session"""
    root_agent = await get_agent_async()
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
                               language_code="en-IN",
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
