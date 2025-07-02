from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
from app.db.crud import get_resume_file, get_job_data, update_application, update_application_status
from app.services.extract_text import extract_resume_text_from_s3_bytes
from app.services.s3_utils import fetch_file_from_s3, pdf_to_base64
from app.services.ocr_utils import send_to_ocr_api
from app.services.agent_runner import run_agent_resume_extract
import json

router = APIRouter()

class RunRequest(BaseModel):
    application_id: str
    file_id: str

@router.post("/resumeextract")
async def resume_extract(request: RunRequest = Body(...)):
    update_application_status(request.application_id, "processing")
    file_data = get_resume_file(request.file_id)
    if not file_data:
        update_application_status(request.application_id, "failed")
        raise HTTPException(status_code=404, detail="File not found")

    resume_raw_text = ""
    
    if file_data['storage'] == 's3':
        file_bytes = fetch_file_from_s3(file_data['path'])
        if not file_bytes:
            update_application_status(request.application_id, "failed")
            raise HTTPException(status_code=500, detail="Failed to fetch file from S3")
        resume_raw_text= extract_resume_text_from_s3_bytes(file_bytes)
    
    
    # if file_data['storage'] == 's3' and file_data['type'] == 'pdf':
    #     pdf_bytes = fetch_file_from_s3(file_data['path'])
    #     base64_pdf = pdf_to_base64(pdf_bytes)
    #     ocr_response = send_to_ocr_api(base64_pdf)
    #     if not ocr_response or 'ParsedResults' not in ocr_response:
    #         update_application_status(request.application_id, "failed")
    #         raise HTTPException(status_code=500, detail="OCR extraction failed")
    #     resume_raw_text = ''.join(r.get('ParsedText', '') for r in ocr_response['ParsedResults'])

    job_data = get_job_data(file_data['job_id'])
    if not job_data:
        update_application_status(request.application_id, "failed")
        raise HTTPException(status_code=404, detail="Job not found")

    response = await run_agent_resume_extract(
        application_id=request.application_id,
        resume_raw_text=resume_raw_text,
        ats_calculation_prompt=job_data['ats_calculation_prompt'],
        job_description=job_data['description']
    )

    response_dict = json.loads(response)
    if response_dict.get("error"):
        update_application_status(request.application_id, "failed")
        raise HTTPException(status_code=500, detail="Resume extraction failed")

    update_application(request.application_id, response_dict)
    update_application_status(request.application_id, "completed")
    return {"message": "Success"}
