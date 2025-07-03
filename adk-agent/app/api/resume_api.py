from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
from app.db.crud import get_resume_file, get_job_data, update_application, update_application_status, get_pending_applications_by_job_id
from app.services.extract_text import extract_resume_text_from_s3_bytes
from app.services.s3_utils import fetch_file_from_s3, pdf_to_base64
from app.services.ocr_utils import send_to_ocr_api
from app.services.resume_agent_runner import run_agent_resume_extract
import json

resume_router = APIRouter()

class RunRequest(BaseModel):
    job_id: str

@resume_router.post("/resume_extract")
async def resume_extract(request: RunRequest = Body(...)):
    job_data = get_job_data(request.job_id)
    if not job_data:
        raise HTTPException(status_code=404, detail="Job not found")

    applications = get_pending_applications_by_job_id(request.job_id)
    if not applications:
        return {"message": "No pending applications found for this job."}

    for application in applications:
        application_id = application['id']
        try:
            update_application_status(application_id, "processing")
            resume_url = application.get('resume_url')
            if not resume_url:
                update_application_status(application_id, "failed")
                continue
            file_bytes = fetch_file_from_s3(resume_url)
            if not file_bytes:
                update_application_status(application_id, "failed")
                continue
            resume_raw_text = extract_resume_text_from_s3_bytes(file_bytes)
            response = await run_agent_resume_extract(
                application_id=application_id,
                resume_raw_text=resume_raw_text,
                ats_calculation_prompt=job_data['ats_calculation_prompt'],
                job_description=job_data['description']
            )
            response_dict = json.loads(response)
            if response_dict.get("error"):
                update_application_status(application_id, "failed")
                continue
            update_application(application_id, response_dict)
            update_application_status(application_id, "completed")
        except Exception as e:
            update_application_status(application_id, "failed")
            continue
    return {"message": "Processing completed for all pending applications."}
