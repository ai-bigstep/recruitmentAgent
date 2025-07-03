
from app.adk_agent.agent import get_agent_async, session_service, APP_NAME, logger
from fastapi import HTTPException
from google.adk.runners import Runner
from google.genai import types
import json
USER_ID = "new"
   
async def run_agent_resume_extract(application_id: str, resume_raw_text: str, ats_calculation_prompt: str, job_description: str):
    session_id = str(application_id)  # Use application_id as session_id
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
        
        logger.info(f"Running agent for application_id: {application_id}")
        try:
            runner = Runner(
                    agent=root_agent,
                    app_name=APP_NAME,
                    session_service=session_service
                )
            # print(f"Runner created for agent: {runner}")
            user_input = types.Content(role='user', parts=[types.Part(text=resume_raw_text)])
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
    