import magic
import io
import pytesseract
from PIL import Image
from PyPDF2 import PdfReader
from pdf2image import convert_from_bytes
from docx import Document
import textract 

def detect_mime_from_bytes(file_bytes: bytes):
    mime = magic.Magic(mime=True)
    return mime.from_buffer(file_bytes)

def is_scanned_pdf_bytes(file_bytes: bytes, text_threshold=50):
    try:
        reader = PdfReader(io.BytesIO(file_bytes))
        for page in reader.pages:
            text = page.extract_text()
            if text and len(text.strip()) > text_threshold:
                return False
        return True
    except:
        return True

def extract_text_from_scanned_pdf_bytes(file_bytes: bytes):
    images = convert_from_bytes(file_bytes)
    full_text = ""
    for img in images:
        text = pytesseract.image_to_string(img)
        full_text += text + "\n"
    return full_text.strip()

def extract_text_from_pdf_bytes(file_bytes: bytes):
    reader = PdfReader(io.BytesIO(file_bytes))
    text = ""
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text += page_text + "\n"
    return text.strip()

def extract_text_from_docx_bytes(file_bytes: bytes):
    doc = Document(io.BytesIO(file_bytes))
    return "\n".join([para.text for para in doc.paragraphs]).strip()

def extract_text_from_doc_bytes(file_bytes: bytes):
    try:
        with open("/tmp/resume.doc", "wb") as f:
            f.write(file_bytes)
        text = textract.process("/tmp/resume.doc").decode("utf-8")
        return text.strip()
    except Exception as e:
        print(f"Error reading .doc file: {e}")
        return ""

def extract_text_from_image_bytes(file_bytes: bytes):
    return pytesseract.image_to_string(Image.open(io.BytesIO(file_bytes))).strip()

def extract_resume_text_from_s3_bytes(file_bytes: bytes):
    mime_type = detect_mime_from_bytes(file_bytes)

    if mime_type == "application/pdf":
        if is_scanned_pdf_bytes(file_bytes):
            return extract_text_from_scanned_pdf_bytes(file_bytes)
        else:
            return extract_text_from_pdf_bytes(file_bytes)

    elif mime_type in ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"]:
        return extract_text_from_docx_bytes(file_bytes)

    elif mime_type == "application/msword":
        return extract_text_from_doc_bytes(file_bytes)

    elif mime_type.startswith("image/"):
        return extract_text_from_image_bytes(file_bytes)

    else:
        raise ValueError(f"Unsupported file type: {mime_type}")
