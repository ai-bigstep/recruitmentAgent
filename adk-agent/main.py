from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from app.api.resume_api import resume_router

app = FastAPI()
app.include_router(resume_router)
