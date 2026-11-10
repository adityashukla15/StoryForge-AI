
def chunk_text(
    text: str,
    chunk_size: int = 1000,
    overlap: int = 150,
) -> list[str]:
    """
    Split chapter text into overlapping chunks.

    Args:
        text: Extracted chapter content.
        chunk_size: Maximum characters per chunk.
        overlap: Characters shared between consecutive chunks.

    Returns:
        Ordered list of text chunks.
    """

    if not text or not text.strip():
        return []

    if chunk_size <= 0:
        raise ValueError("chunk_size must be greater than zero.")

    if overlap < 0 or overlap >= chunk_size:
        raise ValueError("overlap must be between 0 and chunk_size.")

    # Normalize line endings and whitespace.
    text = text.replace("\r\n", "\n").replace("\r", "\n").strip()

    chunks = []
    start = 0
    text_length = len(text)

    while start < text_length:
        end = min(start + chunk_size, text_length)

        if end < text_length:
            # Prefer natural boundaries in the latter part of the chunk.
            min_boundary = start + int(chunk_size * 0.7)

            boundaries = [
                text.rfind("\n\n", min_boundary, end),
                text.rfind("\n", min_boundary, end),
                text.rfind(". ", min_boundary, end),
                text.rfind("! ", min_boundary, end),
                text.rfind("? ", min_boundary, end),
                text.rfind(" ", min_boundary, end),
            ]

            best_boundary = max(boundaries)

            if best_boundary > start:
                # Include punctuation, but avoid including the next sentence.
                end = best_boundary + 1

        chunk = text[start:end].strip()

        if chunk:
            chunks.append(chunk)

        if end >= text_length:
            break

        # Move forward while retaining approximate overlap.
        next_start = max(start + 1, end - overlap)

        # Avoid starting in the middle of a word.
        while next_start < end and text[next_start].isspace():
            next_start += 1

        start = next_start

    return chunks
