"""
Centralized app configuration. Loads from environment variables / .env file.
"""

from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # App
    APP_NAME: str = "AI Learning Platform"
    ENV: str = "development"

    # Database
    DATABASE_URL: str = "postgresql+psycopg://postgres:postgres@localhost:5432/ai_learn_db"

    # Auth
    SECRET_KEY: str = "CHANGE_ME_IN_PRODUCTION"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day

    # CORS
    # Simple comma-separated string (no brackets/quotes needed in Render's UI).
    # Example value to paste in Render: https://pathlight-beta.vercel.app,http://localhost:5173
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    # Stripe
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""

    # Cloudinary (video/file storage)
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    # AI / LLM provider — choose "anthropic" or "gemini"
    LLM_PROVIDER: str = "gemini"

    # Anthropic
    ANTHROPIC_API_KEY: str = ""
    LLM_MODEL: str = "claude-sonnet-4-6"

    # Google Gemini
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"

    # Vector store (Chroma persists to disk at this path)
    CHROMA_PERSIST_DIR: str = "./chroma_data"

    # Frontend URL (used to build password-reset links)
    FRONTEND_URL: str = "http://localhost:5173"

    # SMTP (password reset emails)
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "noreply@pathlight.app"
    SMTP_FROM_NAME: str = "PathLight"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()