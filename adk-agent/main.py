from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from app.api.resume_api import resume_router
from app.api.jd_api import jd_router
from app.api.ai_playground import playground_router
from app.api.calling_api import call_router
from pathlib import Path
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

app = FastAPI()

# Serve static files
STATIC_DIR = Path("app/static")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/")
async def root():
    """Serves the index.html"""
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))


app.include_router(resume_router)
app.include_router(jd_router)
app.include_router(call_router)
app.include_router(playground_router)

