# adk-agent/app/api/calling_globals.py

import os
from dotenv import load_dotenv
from twilio.rest import Client

load_dotenv()

account_sid = os.getenv('TWILIO_ACCOUNT_SID')
auth_token = os.getenv('TWILIO_AUTH_TOKEN')
client = Client(account_sid, auth_token)

global_job_description = ""
global_job_title = ""
global_screening_questions_prompt = ""