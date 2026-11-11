from io import BytesIO
from pathlib import Path

from fastapi import HTTPException, UploadFile
from pypdf import PdfReader


MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
UPLOAD_READ_SIZE = 64 * 1024

ALLOWED_EXTENSIONS = {".pdf", ".txt"}


async def extract_text_from_upload(file: UploadFile) -> tuple[bytes, str, str]:
    filename = Path(file.filename or "").name
    extension = Path(filename).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Only PDF and TXT files are allowed.",
        )

    content_type = (file.content_type or "").lower()

    if extension == ".pdf" and content_type != "application/pdf":
        raise HTTPException(
            status_code=400,
            detail="Invalid PDF content type.",
        )

    if extension == ".txt" and content_type not in (
        "text/plain",
        "application/octet-stream",
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid TXT content type.",
        )

    file_buffer = bytearray()
    while len(file_buffer) <= MAX_FILE_SIZE:
        remaining_with_overflow = MAX_FILE_SIZE + 1 - len(file_buffer)
        read_size = min(UPLOAD_READ_SIZE, remaining_with_overflow)
        chunk = await file.read(read_size)
        if not chunk:
            break
        file_buffer.extend(chunk)
        if len(file_buffer) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail="File size cannot exceed 10 MB.",
            )

    file_bytes = bytes(file_buffer)

    if not file_bytes:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty.",
        )

    if extension == ".pdf":
        if not file_bytes.startswith(b"%PDF-"):
            raise HTTPException(
                status_code=400,
                detail="Invalid PDF file content.",
            )

        try:
            reader = PdfReader(BytesIO(file_bytes))

            if reader.is_encrypted:
                raise HTTPException(
                    status_code=400,
                    detail="Password-protected PDFs are not supported.",
                )

            extracted_text = "\n".join(
                page.extract_text() or "" for page in reader.pages
            )

        except HTTPException:
            raise
        except Exception:
            raise HTTPException(
                status_code=400,
                detail="Unable to read the PDF file.",
            )

    else:
        if b"\x00" in file_bytes:
            raise HTTPException(
                status_code=400,
                detail="Invalid TXT file content.",
            )

        try:
            extracted_text = file_bytes.decode("utf-8-sig")
        except UnicodeDecodeError:
            raise HTTPException(
                status_code=400,
                detail="TXT file must use UTF-8 encoding.",
            )

    extracted_text = extracted_text.strip()

    if not extracted_text:
        raise HTTPException(
            status_code=400,
            detail="No readable text found in the uploaded file.",
        )

    return file_bytes, extracted_text, extension