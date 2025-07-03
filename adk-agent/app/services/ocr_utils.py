import requests, os


OCR_URL = "https://api.ocr.space/parse/image"
OCR_API_KEY = os.getenv("OCR_API_KEY")

def send_to_ocr_api(base64_pdf):
    headers = {'apikey': OCR_API_KEY, 'isOverlayRequired': 'False'}
    data = {'base64Image': base64_pdf}
    res = requests.post(OCR_URL, headers=headers, data=data)
    return res.json() if res.ok else None
