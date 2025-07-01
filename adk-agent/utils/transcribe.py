import whisper
import os

# Get the current directory
current_dir = os.path.dirname(os.path.abspath(__file__))
# Construct the path to the audio file
audio_path = os.path.join(current_dir, "../../Backend/raw-data/policyboss/audio-recordings/plvc/1.wav")

print(f"Attempting to transcribe file at: {audio_path}")

model = whisper.load_model("medium")
result = model.transcribe(audio_path)
print(result["text"])
