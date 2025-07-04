from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
from app.services.jd_agent_runner import run_agent_jd_gen
import json

jd_router = APIRouter()

class RunRequest(BaseModel):
    job_id: str
    jd_prompt: str

@jd_router.post("/jd_gen")
async def jd_gen(request: RunRequest = Body(...)):
    response = await run_agent_jd_gen(job_id=request.job_id, jd_prompt=request.jd_prompt)
    try:
        response_dict = json.loads(response)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Invalid JSON from agent: {e}")
    return response_dict
