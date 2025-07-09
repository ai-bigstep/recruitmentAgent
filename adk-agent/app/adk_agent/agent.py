import os
import logging
import asyncio
from datetime import datetime, timezone
from dotenv import load_dotenv

from google.adk.agents.llm_agent import LlmAgent
from google.adk.sessions import InMemorySessionService
from google.adk.tools.google_search_tool import google_search
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset
from google.adk.tools.mcp_tool.mcp_session_manager import SseServerParams

# from google.adk.guardrails.guardrail import Guardrail
from ..prompts.resume_extractor_prompt import prompt_resume_extractor
from ..prompts.jd_generator_prompt import prompt_jd_generator
from ..prompts.calling_prompt import prompt_calling


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


load_dotenv()

APP_NAME = "adk_streaming_app"
session_service = InMemorySessionService()


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
    """Creates an ADK Agent with tools and instructions."""
    logger.info("Creating ADK Agent...")
    
    # logger.info("Creating agent with tools...")
    # tools, exit_stack = await get_tools_async()
    # tools.append(google_search)
    # logger.info(f"Fetched {len(tools)} tools from MCP server.")
    # Add logging for memory tool
    # logger.info("Adding load_memory tool to agent")
    
    if purpose == "resume_extractor":
        logger.info("Creating agent for resume extraction")
        instruction = prompt_resume_extractor.replace(
            "{{ats_calculation_prompt}}", extras.get("ats_calculation_prompt", "")
        ).replace(
            "{{job_description}}", extras.get("job_description", "")
        )
    elif purpose == "jd_generator":
        logger.info("Creating agent for jd generation")
        instruction = prompt_jd_generator

    elif purpose == "calling_for_screening":
        logger.info("Creating agent for calling/screening questions")
        logger.info("Received extras:-")
        logger.info("Job title: ", extras.get("job_title"))
        instruction = prompt_calling.replace(
            "{{screening_questions}}", extras.get("screening_questions_prompt", "")
        ).replace(
            "{{job_description}}", extras.get("job_description", "")
        ).replace(
            "{{job_title}}", extras.get("job_title", "")
        )
    # guardrail = godrej_guardrail if company == "godrej" else tata_guardrail
    root_agent = LlmAgent(
        model="gemini-2.0-flash-exp",
        name="assistant",
        instruction=instruction,
        # tools=list(tools),
        # before_model_callback=guardrail,
    )
    logger.info("Agent created successfully")
    return root_agent