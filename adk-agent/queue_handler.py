import os
import time
import boto3 # type:ignore
import requests
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

QUEUE_URL = 'https://sqs.ap-south-1.amazonaws.com/474560118046/resumequeue'
# API_ENDPOINT = os.getenv('API_ENDPOINT')  # e.g., http://localhost:8000/api/process-resume
API_ENDPOINT = 'http://127.0.0.1:8000/resumeextract'  # Default for local testing
AWS_REGION = os.getenv('AWS_REGION', 'ap-south-1')

# Initialize AWS SQS client
sqs = boto3.client('sqs', region_name=AWS_REGION)

def poll_sqs():
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
                application_id = attrs.get('ApplicationID', {}).get('StringValue')
                file_id = attrs.get('FileID', {}).get('StringValue')

                if not application_id or not file_id:
                    print("⚠️  Missing required message attributes, skipping.")
                    continue

                print(f"📨 Received ApplicationID={application_id}, FileId={file_id}")

                # Make your API call
                payload = {
                    "application_id": application_id,
                    "file_id": file_id
                }

                try:
                    res = requests.post(API_ENDPOINT, json=payload, timeout=30)
                    res.raise_for_status()
                    print(f"✅ Successfully processed application {application_id}")
                except requests.RequestException as err:
                    print(f"❌ Failed API call for {application_id}: {err}")
                    continue  # Do not delete the message yet

                # Delete the message from the queue
                try:
                    sqs.delete_message(
                        QueueUrl=QUEUE_URL,
                        ReceiptHandle=receipt_handle
                    )
                    print(f"🧹 Deleted message for application {application_id}")
                except Exception as e:
                    print(f"❗ Error deleting message: {e}")

        except Exception as e:
            print(f"💥 Error polling SQS: {e}")

        time.sleep(1)

if __name__ == "__main__":
    print("🚀 Starting SQS worker...")
    poll_sqs()