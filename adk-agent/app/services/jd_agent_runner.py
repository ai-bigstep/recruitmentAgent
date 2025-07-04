from app.adk_agent.agent import get_agent_async, session_service, APP_NAME, logger
from google.adk.sessions import DatabaseSessionService
from fastapi import HTTPException
from google.adk.runners import Runner
from google.genai import types
import json
USER_ID = "new"

DB_URL = "postgresql://postgres.pxrswnfszmbwlswtkpjk:lavitra2004lavitra@aws-0-ap-south-1.pooler.supabase.com:6543/postgres"
session_service = DatabaseSessionService(db_url=DB_URL)


async def run_agent_jd_gen(job_id: str, jd_prompt: str):
    session_id = str(job_id)  # Use job_id as session_id
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
            purpose="jd_generator", 
        )
        fallback_data = {
            "job_id": job_id,
            "jd_prompt": jd_prompt,
            "error": True,
            "raw_text": ""
        }
        
        logger.info(f"Running agent for job_id: {job_id}")
        try:
            runner = Runner(
                    agent=root_agent,
                    app_name=APP_NAME,
                    session_service=session_service
                )
            # print(f"Runner created for agent: {runner}")
            user_input = types.Content(role='user', parts=[types.Part(text=jd_prompt)])
            # print(f"User input for agent: {user_input}")
            async for event in runner.run_async(
                user_id=USER_ID,
                session_id=session_id,
                new_message=user_input,
            ):
                # print(f"Event received: {event}")
                raw_text=""
                if event.content and event.content.parts and event.content.parts[0].text is not None:
                    raw_text = event.content.parts[0].text
                    try:
                        
                        if raw_text.startswith("```json"):
                            raw_text = raw_text.strip("```json").strip("```").strip()
                        elif raw_text.startswith("```"):
                            raw_text = raw_text.strip("```").strip()
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
    