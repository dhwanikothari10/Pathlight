from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.core.security import require_instructor
from app.models.lecture import Lecture
from app.models.section import Section
from app.models.enrollment import LectureCompletion
from app.models.quiz import QuizQuestion
from app.models.user import User
from app.schemas.section import LectureCreate, LectureOut
from app.services.storage_service import upload_video
from app.ai.rag.ingestion import ingest_lecture_transcript
from app.ai.transcription.transcribe_service import transcribe_lecture_in_background, get_youtube_duration_seconds
from app.core.config import settings

router = APIRouter()


@router.post("/section/{section_id}", response_model=LectureOut, status_code=201)
def add_lecture_via_url(
    section_id: int,
    payload: LectureCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    instructor: User = Depends(require_instructor),
):
    """
    Option A: instructor pastes a video URL (YouTube/Vimeo/direct link)
    instead of uploading a raw file. Fastest path for an MVP.

    If no transcript is provided, auto-transcription kicks off as a
    BACKGROUND TASK after this request returns -- the lecture saves
    instantly with transcript_status="pending", and the transcript fills
    in a minute or so later once Gemini finishes processing the video.
    """
    section = db.query(Section).filter(Section.id == section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
    if section.course.instructor_id != instructor.id:
        raise HTTPException(status_code=403, detail="Not your course")

    lecture_data = payload.model_dump()

    # The instructor's form never sends a real duration (there's no way for
    # them to know it from a pasted link), so it always defaulted to 0. For
    # YouTube URLs we can look the real duration up ourselves via yt-dlp's
    # metadata-only mode -- no video download needed, just the page's
    # metadata, so this is fast even for long lectures.
    if lecture_data.get("video_url") and not lecture_data.get("duration_seconds"):
        lecture_data["duration_seconds"] = get_youtube_duration_seconds(lecture_data["video_url"])

    needs_auto_transcribe = (
        not lecture_data.get("transcript")
        and lecture_data.get("video_url")
        and settings.LLM_PROVIDER == "gemini"
    )
    lecture_data["transcript_status"] = "pending" if needs_auto_transcribe else "manual"

    lecture = Lecture(**lecture_data, section_id=section_id)
    db.add(lecture)
    db.commit()
    db.refresh(lecture)

    if lecture.transcript:
        ingest_lecture_transcript(section.course_id, lecture.id, lecture.title, lecture.transcript)
    elif needs_auto_transcribe:
        background_tasks.add_task(transcribe_lecture_in_background, lecture.id, lecture.video_url)

    return lecture


@router.post("/section/{section_id}/upload", response_model=LectureOut, status_code=201)
async def add_lecture_via_file_upload(
    section_id: int,
    background_tasks: BackgroundTasks,
    title: str = Form(...),
    order_index: int = Form(0),
    transcript: Optional[str] = Form(None),
    video_file: UploadFile = File(...),
    db: Session = Depends(get_db),
    instructor: User = Depends(require_instructor),
):
    """
    Option B: instructor uploads the actual video file. We stream it to
    Cloudinary and store the resulting hosted URL -- never the raw file -- in
    Postgres. Auto-transcription (if no transcript given) also runs as a
    background task, same as the URL-based path above.
    """
    section = db.query(Section).filter(Section.id == section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
    if section.course.instructor_id != instructor.id:
        raise HTTPException(status_code=403, detail="Not your course")

    upload_result = await upload_video(video_file)

    needs_auto_transcribe = not transcript and settings.LLM_PROVIDER == "gemini"

    lecture = Lecture(
        title=title,
        video_url=upload_result["url"],
        duration_seconds=upload_result["duration_seconds"],
        order_index=order_index,
        transcript=transcript,
        transcript_status="pending" if needs_auto_transcribe else "manual",
        section_id=section_id,
    )
    db.add(lecture)
    db.commit()
    db.refresh(lecture)

    if lecture.transcript:
        ingest_lecture_transcript(section.course_id, lecture.id, lecture.title, lecture.transcript)
    elif needs_auto_transcribe:
        background_tasks.add_task(transcribe_lecture_in_background, lecture.id, lecture.video_url)

    return lecture


@router.get("/{lecture_id}", response_model=LectureOut)
def get_lecture(lecture_id: int, db: Session = Depends(get_db)):
    lecture = db.query(Lecture).filter(Lecture.id == lecture_id).first()
    if not lecture:
        raise HTTPException(status_code=404, detail="Lecture not found")
    return lecture


@router.delete("/{lecture_id}", status_code=204)
def delete_lecture(
    lecture_id: int,
    db: Session = Depends(get_db),
    instructor: User = Depends(require_instructor),
):
    lecture = db.query(Lecture).filter(Lecture.id == lecture_id).first()
    if not lecture:
        raise HTTPException(status_code=404, detail="Lecture not found")
    if lecture.section.course.instructor_id != instructor.id:
        raise HTTPException(status_code=403, detail="Not your course")

    # Explicitly remove dependent rows first -- a student may have already
    # marked this lecture complete (lecture_completions) or it may already
    # have generated quiz questions, both of which have a foreign key
    # pointing at this lecture and would otherwise block the delete.
    db.query(LectureCompletion).filter(LectureCompletion.lecture_id == lecture_id).delete()
    db.query(QuizQuestion).filter(QuizQuestion.lecture_id == lecture_id).delete()

    db.delete(lecture)
    db.commit()