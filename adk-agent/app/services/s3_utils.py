import base64, boto3, os # type:ignore



s3 = boto3.client(
    "s3",
    region_name=os.getenv("AWS_REGION"),
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY")
)
BUCKET = os.getenv("AWS_BUCKET_NAME")

def fetch_file_from_s3(key: str):
    return s3.get_object(Bucket=BUCKET, Key=key)['Body'].read()

def pdf_to_base64(pdf_bytes: bytes):
    return f"data:application/pdf;base64,{base64.b64encode(pdf_bytes).decode('utf-8')}"