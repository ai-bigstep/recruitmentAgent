# Use official Python image
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Copy requirements first to leverage Docker layer caching
COPY ./requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the app
COPY app/ .

# Optional: Add GCP service account key
#COPY .gcloud_keys/service-account.json /app/service-account.json

# Set environment variables (optional)
#ENV GOOGLE_APPLICATION_CREDENTIALS="/app/service-account.json"

# Command to run the app
CMD ["python", "main.py"]
