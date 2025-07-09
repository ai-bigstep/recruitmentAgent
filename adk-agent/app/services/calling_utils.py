from fastapi import Request, Response
from twilio.twiml.voice_response import VoiceResponse, Connect
from app.api.calling_globals import (
    client,
)
import os

global_application_id = ""

async def initiate_call_to_number(to_number: str, application_id: str):
    global global_application_id
    global_application_id = application_id
    from_number = os.getenv("TWILIO_PHONE_NUMBER")
    base_url = os.getenv("BASE_URL", "http://localhost:8000")
    if base_url == "http://localhost:8000":
        print("Warning: BASE_URL is set to localhost. This may not work for Twilio calls in production.")
        base_url = input("Enter the BASE_URL for Twilio calls (e.g., https://yourdomain.com): ").strip()
    twiml_url = f"{base_url}/call/twiml"

    
    call_sid = create_call(to_number, from_number, twiml_url)
    print("Call initiated")
    return {"call_sid": call_sid, "status": "initiated"}

def create_call(to_number, from_number, twiml_url):
    import os
    base_url = os.getenv("BASE_URL", "http://localhost:8000")
    status_callback_url = f"{base_url}/call/status_callback"
    call = client.calls.create(
        to=to_number,
        from_=from_number,
        url=twiml_url,
        status_callback=status_callback_url,
        status_callback_event=["initiated", "ringing", "answered", "completed"]
    )
    print("call sid",call.sid)
    return call.sid

def get_call_status(call_sid):
    call = client.calls(call_sid).fetch()
    return call.status


async def handle_twiml_service(request: Request):
    global global_application_id
    form_data = await request.form()
    call_sid = form_data.get("CallSid")

    if not call_sid:
        error_twiml = '<Response><Say>An error occurred: Missing call identifier.</Say><Hangup/></Response>'
        return Response(content=error_twiml, media_type="application/xml", status_code=400)

    ws_scheme = "wss" if request.url.scheme == "https" else "ws"
    host = request.url.netloc
    scheme = request.url.scheme

    effective_base_url = f"{scheme}://{host}"
    print(f"Effective base URL: {effective_base_url}")
    # audio_file_name = os.environ.get('INITIAL_GREETING_AUDIO_FILE', 'initial_audio.mp3')
    # audio_file_url = f"{effective_base_url}/static/initial_audio.mp3"

    websocket_url_for_twilio = f"{ws_scheme}://{host}/wscall/{call_sid}/{global_application_id}"
    print(f"WebSocket URL for Twilio: {websocket_url_for_twilio}")
    
    twiml = generate_twiml(websocket_url_for_twilio)
    print(f"Twiml Response: {twiml}")
    return Response(content=twiml, media_type="application/xml") 




def generate_twiml(websocket_url, audio_file_url=None):
    response = VoiceResponse()
    # if audio_file_url:
    #     response.play(audio_file_url)
    response.say("Greetings! Connecting you to our agent, Kindly stay on the line. This call may be recorded for quality assurance purposes.", voice='Polly.Joanna', language='en-US')  # You can change voice/language
    connect = Connect()
    ws_url = websocket_url
    connect.stream(url=ws_url)
    response.append(connect)
    print(connect)
    return str(response)
