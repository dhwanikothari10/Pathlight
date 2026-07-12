"""
Auto-transcription service: when an instructor adds a lecture without typing
a transcript, this generates one automatically using Gemini's native audio
understanding — covering both pasted YouTube URLs and uploaded video files
through the same code path.

Only runs when LLM_PROVIDER=gemini, since this relies on Gemini's multimodal
audio input support specifically (not available via the Anthropic path).

IMPORTANT — why this sends audio, not video, to Gemini:
Video content tokenizes at ~290 tokens/sec (1fps frames + audio), which blows
past the 1,048,576 token context window for anything over ~60 minutes. The
two obvious fixes for that -- media_resolution (lowers per-frame cost) and
video_metadata start/end offsets (lets you request a time range instead of
the whole video) -- are BOTH Vertex-AI-only parameters and raise "not
supported in Google AI" errors on the Google AI Studio API key this app uses.

Since a lecture video is just a person talking (screen-share/talking-head,
no visual content that matters for a transcript), the fix is to strip out
the video track ourselves before sending anything to Gemini. Audio-only
content tokenizes at ~32 tokens/sec, which raises the effective ceiling to
roughly 9 hours of runtime in a single request -- comfortably covering any
realistic lecture, no chunking or Vertex-only params required.

This requires ffmpeg to be installed and on PATH (used both by yt-dlp to
extract audio from YouTube, and directly for uploaded video files).
"""

import re
import tempfile
import os
import time
import subprocess
import requests as http_requests

from app.core.config import settings

SYSTEM_PROMPT = (
    "Transcribe the spoken content of this audio as plain text, in paragraph "
    "form, without timestamps or speaker labels. Focus on capturing the "
    "educational content accurately."
)

# Gemini occasionally returns these when its servers are temporarily
# overloaded -- they're not a problem with the request itself, so it's worth
# a short retry with backoff rather than failing the whole transcription.
TRANSIENT_ERROR_MARKERS = ("UNAVAILABLE", "RESOURCE_EXHAUSTED", "high demand")
MAX_RETRIES = 3
RETRY_BASE_DELAY_SECONDS = 10

TOKEN_LIMIT_ERROR_MARKER = "exceeds the maximum number of tokens"

# Fallback chunk size for the rare case where even audio-only content still
# exceeds the token limit (an extremely long recording). Splitting happens
# locally on the audio file itself (via ffmpeg), not via any Gemini API
# parameter, since neither Vertex-only trimming option is available here.
CHUNK_SECONDS = 3 * 60 * 60  # 3 hours
MAX_CHUNKS = 4  # covers up to 12 hours total, far beyond any realistic lecture


def _is_transient_error(e: Exception) -> bool:
    return any(marker in str(e) for marker in TRANSIENT_ERROR_MARKERS)


def _is_youtube_url(url: str) -> bool:
    return bool(re.search(r"(youtube\.com/watch|youtu\.be/)", url or ""))


def _clean_youtube_url(url: str) -> str:
    """
    Strips playlist/index/timestamp query params, keeping only the video ID.
    """
    match = re.search(r"(?:youtube\.com/watch\?v=|youtu\.be/)([\w-]{11})", url)
    if match:
        return f"https://www.youtube.com/watch?v={match.group(1)}"
    return url


def _get_youtube_video_id(url: str) -> str | None:
    match = re.search(r"(?:youtube\.com/watch\?v=|youtu\.be/)([\w-]{11})", url or "")
    return match.group(1) if match else None


def _get_youtube_duration_via_page_scrape(video_id: str) -> int:
    """
    Fallback for when yt-dlp's metadata lookup gets blocked -- common on
    cloud/datacenter IPs (e.g. Render), which YouTube treats as suspicious
    and challenges with a bot check that yt-dlp can't get past on its own.

    Makes a single plain HTTP GET to the watch page with a realistic
    browser User-Agent and pulls "lengthSeconds" out of the embedded player
    response JSON. One plain request is less likely to trip bot detection
    than yt-dlp's multi-step extraction flow, though it's not guaranteed to
    work every time either.
    """
    resp = http_requests.get(
        f"https://www.youtube.com/watch?v={video_id}",
        headers={
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
            )
        },
        timeout=15,
    )
    resp.raise_for_status()
    match = re.search(r'"lengthSeconds":"(\d+)"', resp.text)
    if not match:
        raise RuntimeError("lengthSeconds not found in watch page")
    return int(match.group(1))


def get_youtube_duration_seconds(youtube_url: str) -> int:
    """
    Looks up a YouTube video's real duration without downloading anything.
    Tries yt-dlp first (works reliably from a home/residential IP); if that
    fails -- as it does from most cloud hosts, since YouTube blocks
    datacenter IPs -- falls back to a lightweight page-scrape that doesn't
    trigger the same bot check as yt-dlp's extraction flow.
    """
    import yt_dlp

    clean_url = _clean_youtube_url(youtube_url)
    ydl_opts = {"quiet": True, "no_warnings": True, "skip_download": True}

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(clean_url, download=False)
        duration = int(info.get("duration") or 0)
        if duration:
            return duration
    except Exception as e:
        print(f"[get_youtube_duration_seconds] yt-dlp failed for {youtube_url}: {e}")

    video_id = _get_youtube_video_id(clean_url)
    if not video_id:
        return 0

    try:
        return _get_youtube_duration_via_page_scrape(video_id)
    except Exception as e:
        print(f"[get_youtube_duration_seconds] page-scrape fallback also failed for {youtube_url}: {e}")
        return 0


def _run_ffmpeg_extract_audio(input_path: str, output_path: str, start=None, duration=None):
    """
    Extracts (and optionally trims) the audio track from a local video/audio
    file using the ffmpeg CLI directly. Requires ffmpeg to be installed and
    on PATH.
    """
    cmd = ["ffmpeg", "-y"]
    if start is not None:
        cmd += ["-ss", str(start)]
    cmd += ["-i", input_path]
    if duration is not None:
        cmd += ["-t", str(duration)]
    cmd += ["-vn", "-acodec", "libmp3lame", "-ar", "44100", "-ab", "128k", output_path]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg audio extraction failed: {result.stderr[-500:]}")


def _download_youtube_audio(youtube_url: str) -> str:
    """
    Downloads just the audio track of a YouTube video using yt-dlp, returning
    the path to a local mp3 file. Downloading + extracting audio ourselves
    (rather than letting Gemini fetch the YouTube URL directly as video) is
    what actually gets us the ~9x token reduction -- Gemini has no way to
    "only look at the audio" of a URL it fetches itself.
    """
    import yt_dlp

    tmp_dir = tempfile.mkdtemp()
    out_template = os.path.join(tmp_dir, "audio.%(ext)s")

    ydl_opts = {
        # A fallback chain rather than a single strict format: if the
        # preferred audio-only stream isn't available for a given video
        # (YouTube's available formats shift over time), fall back to any
        # audio stream, then to a combined video+audio stream (ffmpeg still
        # strips it down to audio-only via the postprocessor below either way).
        "format": "bestaudio/ba/best",
        "outtmpl": out_template,
        "postprocessors": [
            {
                "key": "FFmpegExtractAudio",
                "preferredcodec": "mp3",
                "preferredquality": "128",
            }
        ],
        "quiet": True,
        "no_warnings": True,
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([youtube_url])

    audio_path = os.path.join(tmp_dir, "audio.mp3")
    if not os.path.exists(audio_path):
        raise RuntimeError(f"yt-dlp did not produce an audio file for {youtube_url}")

    return audio_path


def _generate_transcript_from_audio(client, types, audio_path, label):
    """
    Uploads a local audio file to Gemini's Files API and transcribes it, with
    retry-with-backoff for transient server-side errors.
    """
    uploaded_file = client.files.upload(path=audio_path)

    # Uploaded files are processed asynchronously on Gemini's side (state
    # starts as PROCESSING) -- using the file before it's ACTIVE is what
    # produces the "required oneof field 'data'" error, since there's no
    # usable file behind the reference yet.
    while uploaded_file.state == "PROCESSING":
        time.sleep(2)
        uploaded_file = client.files.get(name=uploaded_file.name)

    if uploaded_file.state == "FAILED":
        raise RuntimeError(f"Gemini file processing failed for {label}")

    # This SDK version doesn't auto-convert a bare File object passed into
    # `contents`, so it has to be wrapped explicitly as a Part referencing
    # the uploaded file's uri/mime_type.
    audio_part = types.Part(
        file_data=types.FileData(
            file_uri=uploaded_file.uri, mime_type=uploaded_file.mime_type
        )
    )

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            response = client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=types.Content(
                    parts=[audio_part, types.Part(text=SYSTEM_PROMPT)]
                ),
                config=types.GenerateContentConfig(
                    # Long lectures need a lot of output tokens for the transcript
                    # text -- without this, long recordings get cut off
                    # mid-sentence once the response hits the default ceiling.
                    max_output_tokens=65536,
                ),
            )
            if response.candidates and response.candidates[0].finish_reason == "MAX_TOKENS":
                print(f"[transcribe] response truncated at MAX_TOKENS for {label}")
            return response.text or ""
        except Exception as e:
            if _is_transient_error(e) and attempt < MAX_RETRIES:
                delay = RETRY_BASE_DELAY_SECONDS * attempt
                print(
                    f"[transcribe] transient error for {label} (attempt {attempt}/{MAX_RETRIES}), "
                    f"retrying in {delay}s: {e}"
                )
                time.sleep(delay)
                continue
            raise


def _transcribe_audio_in_chunks(client, types, audio_path, label):
    """
    Fallback for the rare case where even audio-only content still exceeds
    the token limit. Splits the local audio file itself into fixed-length
    segments with ffmpeg and transcribes each one, then stitches the results
    together. This works entirely on our own file (via -ss/-t), so it doesn't
    depend on the Vertex-only Gemini trimming parameters that aren't
    available on this API key.
    """
    print(f"[transcribe] audio still too long for a single request, chunking {label}")

    chunks = []
    for i in range(MAX_CHUNKS):
        start = i * CHUNK_SECONDS
        chunk_path = f"{audio_path}.chunk{i}.mp3"
        _run_ffmpeg_extract_audio(audio_path, chunk_path, start=start, duration=CHUNK_SECONDS)

        # An empty/near-empty output file means we've sliced past the actual
        # end of the audio -- ffmpeg still produces a (near-silent) file, so
        # check its size rather than relying on transcript content here.
        if os.path.getsize(chunk_path) < 10_000:  # ~<1s of audio at this bitrate
            os.remove(chunk_path)
            break

        try:
            chunk_text = _generate_transcript_from_audio(client, types, chunk_path, f"{label} (chunk {i})")
        finally:
            os.remove(chunk_path)

        if not chunk_text.strip():
            break

        chunks.append(chunk_text)

    return "\n\n".join(chunks)


def _transcribe_local_audio(client, types, audio_path, label):
    try:
        return _generate_transcript_from_audio(client, types, audio_path, label)
    except Exception as e:
        if TOKEN_LIMIT_ERROR_MARKER not in str(e):
            raise
        return _transcribe_audio_in_chunks(client, types, audio_path, label)


def _fetch_youtube_captions(video_id: str) -> str:
    """
    Fetches YouTube's own (creator-provided or auto-generated) captions via
    the youtube_transcript_api library, which talks to YouTube's lightweight
    timedtext endpoint directly rather than scraping/downloading like yt-dlp
    does. This is far less likely to trip YouTube's bot detection on
    cloud/datacenter IPs (e.g. Render), so it's tried first for YouTube URLs.
    Raises on failure (e.g. no captions available for this video) -- the
    caller falls back to the audio-download + Gemini transcription pipeline.
    """
    from youtube_transcript_api import YouTubeTranscriptApi

    transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
    return " ".join(segment["text"] for segment in transcript_list if segment.get("text"))


def transcribe_youtube_url(youtube_url: str) -> str:
    """
    Gets a transcript for a YouTube video. Tries YouTube's own captions
    first -- fast, no download, and much less likely to get blocked on a
    cloud host. Falls back to downloading the audio track and transcribing
    it with Gemini only if no captions are available for the video.
    """
    clean_url = _clean_youtube_url(youtube_url)
    video_id = _get_youtube_video_id(clean_url)

    if video_id:
        try:
            captions = _fetch_youtube_captions(video_id)
            if captions.strip():
                return captions
        except Exception as e:
            print(
                f"[transcribe_youtube_url] no captions available for {youtube_url}, "
                f"falling back to audio transcription: {e}"
            )

    from google import genai
    from google.genai import types

    client = genai.Client(api_key=settings.GEMINI_API_KEY)

    audio_path = _download_youtube_audio(clean_url)
    try:
        return _transcribe_local_audio(client, types, audio_path, youtube_url)
    finally:
        # yt-dlp writes into its own temp dir; clean up the whole thing
        parent_dir = os.path.dirname(audio_path)
        for f in os.listdir(parent_dir):
            os.remove(os.path.join(parent_dir, f))
        os.rmdir(parent_dir)


def transcribe_video_file(video_url: str) -> str:
    """
    Downloads a hosted video file (e.g. from Cloudinary), extracts its audio
    track locally, and transcribes that using Gemini's Files API.
    """
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=settings.GEMINI_API_KEY)

    suffix = os.path.splitext(video_url.split("?")[0])[1] or ".mp4"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        resp = http_requests.get(video_url, stream=True, timeout=60)
        resp.raise_for_status()
        for chunk in resp.iter_content(chunk_size=8192):
            tmp.write(chunk)
        video_path = tmp.name

    audio_path = video_path + ".mp3"
    try:
        _run_ffmpeg_extract_audio(video_path, audio_path)
        return _transcribe_local_audio(client, types, audio_path, video_url)
    finally:
        os.remove(video_path)
        if os.path.exists(audio_path):
            os.remove(audio_path)


def auto_transcribe(video_url: str) -> str:
    """
    Entry point used by the lecture routers. Picks the right strategy based
    on whether the URL is a YouTube link or a directly hosted video file.
    Returns an empty string (rather than raising) on failure, so lecture
    creation never blocks on transcription issues — the instructor can
    always add a transcript manually afterward.
    """
    if settings.LLM_PROVIDER != "gemini" or not video_url:
        return ""

    try:
        if _is_youtube_url(video_url):
            return transcribe_youtube_url(video_url)
        return transcribe_video_file(video_url)
    except Exception as e:
        print(f"[auto_transcribe] failed for {video_url}: {e}")
        return ""


def transcribe_lecture_in_background(lecture_id: int, video_url: str):
    """
    Designed to be passed to FastAPI's BackgroundTasks. Runs after the HTTP
    response has already been sent, so a long video (potentially several
    minutes to download + transcribe) never blocks the "Save lecture" request.

    Opens its own DB session since the request-scoped session from the
    original endpoint is closed by the time this runs.
    """
    from app.core.database import SessionLocal
    from app.models.lecture import Lecture
    from app.ai.rag.ingestion import ingest_lecture_transcript

    db = SessionLocal()
    try:
        lecture = db.query(Lecture).filter(Lecture.id == lecture_id).first()
        if not lecture:
            return

        transcript_text = auto_transcribe(video_url)

        if transcript_text:
            lecture.transcript = transcript_text
            lecture.transcript_status = "completed"
            db.commit()
            ingest_lecture_transcript(
                lecture.section.course_id, lecture.id, lecture.title, transcript_text
            )
        else:
            lecture.transcript_status = "failed"
            db.commit()
    except Exception as e:
        print(f"[transcribe_lecture_in_background] failed for lecture {lecture_id}: {e}")
        db.rollback()
        lecture = db.query(Lecture).filter(Lecture.id == lecture_id).first()
        if lecture:
            lecture.transcript_status = "failed"
            db.commit()
    finally:
        db.close()