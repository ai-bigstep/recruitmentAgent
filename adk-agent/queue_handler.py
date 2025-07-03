import os
import time
import boto3
import requests
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

QUEUE_URL = 'https://sqs.ap-south-1.amazonaws.com/474560118046/resumequeue'
# API_ENDPOINT = os.getenv('API_ENDPOINT')  # e.g., http://localhost:8000/api/process-resume
API_ENDPOINT = 'http://127.0.0.1:8000/resume_extract'  # Default for local testing
AWS_REGION = os.getenv('AWS_REGION', 'ap-south-1')

# Initialize AWS SQS client
sqs = boto3.client('sqs', region_name=AWS_REGION)

def poll_sqs():
    purge_queue()
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
                    res = requests.post(API_ENDPOINT, json=payload, timeout=30)
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

        except Exception as e:
            print(f"💥 Error polling SQS: {e}")

        time.sleep(1)

def purge_queue():
    sqs.purge_queue(QueueUrl=QUEUE_URL)
    print("🧹 Purged the queue")

if __name__ == "__main__":
    print("🚀 Starting SQS worker...")
    poll_sqs()