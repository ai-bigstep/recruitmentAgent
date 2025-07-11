import os
import time
import boto3
import requests
from dotenv import load_dotenv
from app.services.calling_utils import get_call_status

# Load environment variables from .env
load_dotenv()

QUEUE_URL = 'https://sqs.ap-south-1.amazonaws.com/474560118046/resumequeue'
# API_ENDPOINT = os.getenv('API_ENDPOINT')  # e.g., http://localhost:8000/api/process-resume
RESUME_API_ENDPOINT = 'http://127.0.0.1:8003/resume_extract'  # Default for local testing
JD_API_ENDPOINT = 'http://127.0.0.1:8003/jd_gen'
CALLING_API_ENDPOINT = 'http://127.0.0.1:8003/call'
AWS_REGION = os.getenv('AWS_REGION', 'ap-south-1')

# Initialize AWS SQS client
sqs = boto3.client('sqs', region_name=AWS_REGION)
print("hi")
global_last_call_sid = ""

def poll_sqs():
    global global_last_call_sid
    try:
        purge_queue()
    except Exception as e:
        print(e)

    while True:
        try:
            response = sqs.receive_message(
                QueueUrl=QUEUE_URL,
                MaxNumberOfMessages=1,
                WaitTimeSeconds=10,  # long polling
                MessageAttributeNames=['All']
            )

            messages = response.get("Messages", [])
            if not messages:
                continue  # nothing to process

            for msg in messages:
                receipt_handle = msg['ReceiptHandle']
                attrs = msg.get('MessageAttributes', {})
                msg_type = attrs.get('type', {}).get('StringValue')

                if msg_type == 'resume':
                    # Read message attributes
                    job_id = attrs.get('job_id', {}).get('StringValue')

                    if not job_id:
                        print("⚠️  Missing job_id, skipping.")
                        continue

                    print(f"📨 Received job_id={job_id}")

                    # Make your API call
                    payload = {
                        "job_id": job_id
                    }

                    try:
                        res = requests.post(RESUME_API_ENDPOINT, json=payload, timeout=30)
                        res.raise_for_status()
                        print(f"✅ Successfully processed job {job_id}")
                    except requests.RequestException as err:
                        print(f"❌ Failed API call for {job_id}: {err}")
                        continue  # Do not delete the message yet

                    # Delete the message from the queue
                    try:
                        sqs.delete_message(
                            QueueUrl=QUEUE_URL,
                            ReceiptHandle=receipt_handle
                        )
                        print(f"🧹 Deleted message for job {job_id}")
                    except Exception as e:
                        print(f"❗ Error deleting message: {e}")
                
                elif msg_type == 'jd_gen':
                    job_id = attrs.get('job_id', {}).get('StringValue')
                    jd_prompt = attrs.get('jd_prompt', {}).get('StringValue')
                    auth_token = attrs.get('auth_token', {}).get('StringValue')
                    payload = {"job_id": job_id, "jd_prompt": jd_prompt}
                    try:
                        res = requests.post(JD_API_ENDPOINT, json=payload, timeout=30)
                        res.raise_for_status()
                        print(f"✅ Successfully processed job description generation for {job_id}")
                        generated_jd = res.json().get('job_description')
                        print("Generated_jd = ", generated_jd)
                        backend_url = f"http://localhost:5000/api/jobs/{job_id}/jd-result"
                        # Send the result to backend with auth token
                        headers = {"Authorization": auth_token} if auth_token else {}
                        backend_res = requests.post(backend_url, json={"job_description": generated_jd}, headers=headers, timeout=10)
                        backend_res.raise_for_status()
                        print(f"✅ Sent generated JD to backend for job {job_id}")
                    except requests.RequestException as err:
                        print(f"❌ Failed API call jd_gen for {job_id}: {err}")
                        continue  # Do not delete the message yet
                    # handle response, etc.

                    try:
                        sqs.delete_message(
                            QueueUrl=QUEUE_URL,
                            ReceiptHandle=receipt_handle
                        )
                        print(f"🧹 Deleted jd_gen message for job {job_id}")
                    except Exception as e:
                        print(f"❗ Error deleting message: {e}")

                elif msg_type == 'call':

                    # check last call's status
                    last_call_status = get_call_status(global_last_call_sid)
                    if last_call_status=="in-progress":
                        print("Last call still in progress")
                        continue
                    

                    # Read message attributes
                    job_id = attrs.get('job_id', {}).get('StringValue')
                    application_id = attrs.get('application_id', {}).get('StringValue')
                    if not job_id:
                        print("⚠️  Missing job_id, skipping.")
                        continue
                    if not application_id:
                        print("⚠️  Missing application_id, skipping.")
                        continue
                    print(f"📨 Received job_id={job_id}, application_id={application_id}")
                    payload = {
                        "job_id" : job_id,
                        "application_id" : application_id
                    }
                    try:
                        res = requests.post(CALLING_API_ENDPOINT, json=payload, timeout=600)
                        res.raise_for_status()
                        res_json = res.json()                        
                        print("Call succesfully initiated to ", res_json.get("status"))
                        print("Call sid: ", res_json.get("call_sid"))
                        global_last_call_sid = res_json.get("call_sid")
                        print(f"✅ Successfully processed calling applicant {application_id} for job {job_id}")
                    except requests.RequestException as err:
                        print(f"❌ Failed API call for applicant {application_id} for job {job_id}: {err}")
                        continue  # Do not delete the message yet

                    # Delete the message from the queue
                    try:
                        sqs.delete_message(
                            QueueUrl=QUEUE_URL,
                            ReceiptHandle=receipt_handle
                        )
                        print(f"🧹 Deleted message for job {job_id}, applicant {application_id}")
                    except Exception as e:
                        print(f"❗ Error deleting message: {e}")

        except Exception as e:
            print(f"💥 Error polling SQS: {e}")

        time.sleep(1)

def purge_queue():
    sqs.purge_queue(QueueUrl=QUEUE_URL)
    print("🧹 Purged the queue")

if __name__ == "__main__":
    print("🚀 Starting SQS worker...")
    poll_sqs()
