import asyncio

import pytest
from fastapi import HTTPException

from app.utils.file_parser import (
    MAX_FILE_SIZE,
    UPLOAD_READ_SIZE,
    extract_text_from_upload,
)


class RecordingUpload:
    filename = "oversized.txt"
    content_type = "text/plain"

    def __init__(self, content: bytes):
        self.content = content
        self.position = 0
        self.read_sizes = []
        self.bytes_returned = 0

    async def read(self, size: int = -1) -> bytes:
        self.read_sizes.append(size)
        assert size > 0
        start = self.position
        end = min(start + size, len(self.content))
        self.position = end
        chunk = self.content[start:end]
        self.bytes_returned += len(chunk)
        return chunk


def test_upload_limit_is_enforced_with_bounded_reads():
    upload = RecordingUpload(b"x" * (MAX_FILE_SIZE + 1))

    with pytest.raises(HTTPException) as error:
        asyncio.run(extract_text_from_upload(upload))

    assert error.value.status_code == 413
    assert upload.read_sizes
    assert max(upload.read_sizes) <= UPLOAD_READ_SIZE
    assert upload.bytes_returned == MAX_FILE_SIZE + 1
