"""
Optional Browser Use runner for EasyDVC.

This module is deliberately lazy: importing backend code must still work when
browser-use is not installed or the feature is disabled.
"""

from __future__ import annotations

import asyncio
import os
from pathlib import Path


ENABLE_VALUES = {"1", "true", "yes", "on"}
DEFAULT_MODEL = "gpt-4.1-mini"
DEFAULT_MAX_STEPS = 18
DEFAULT_TIMEOUT_SECONDS = 180


def _is_enabled() -> bool:
    return os.getenv("BROWSER_USE_ENABLED", "").strip().lower() in ENABLE_VALUES


def _build_task(message: str, current_url: str | None = None) -> str:
    start_url = current_url or os.getenv("BROWSER_USE_START_URL", "https://dichvucong.gov.vn/")
    return (
        "You are controlling a dedicated EasyDVC browser profile for a Vietnamese public service assistant.\n"
        "Goal from user:\n"
        f"{message}\n\n"
        "Start or continue from this URL if needed:\n"
        f"{start_url}\n\n"
        "Safety rules:\n"
        "- Do not type passwords, captcha, OTP, bank credentials, or tax account secrets.\n"
        "- Do not click final submit, login, payment, or irreversible actions.\n"
        "- Stop and report exactly what the user must confirm for sensitive steps.\n"
        "- Prefer reading page structure and using visible labels over coordinates.\n"
        "- Keep the final answer short and in Vietnamese."
    )


def _default_profile_dir() -> str:
    return os.getenv(
        "BROWSER_USE_PROFILE_DIR",
        str(Path.home() / ".easydvc-browser-profile"),
    )


def _result_text(result) -> str:
    for attr in ("final_result", "final_output", "output", "result"):
        value = getattr(result, attr, None)
        if callable(value):
            try:
                value = value()
            except TypeError:
                value = None
        if value:
            return str(value)
    return str(result)


async def run_browser_task(message: str, current_url: str | None = None) -> dict:
    if not _is_enabled():
        return {
            "status": "disabled",
            "reply": (
                "Browser Use chưa được bật. Đặt BROWSER_USE_ENABLED=1 và cài dependency backend "
                "rồi chạy lại server để dùng Chrome riêng cho agent."
            ),
            "tool_actions": ["browser_use=disabled"],
        }

    try:
        from browser_use import Agent as BrowserUseAgent
        from browser_use import BrowserProfile, BrowserSession, ChatOpenAI
    except Exception as exc:
        return {
            "status": "error",
            "code": "BROWSER_USE_NOT_AVAILABLE",
            "reply": (
                "Backend chưa import được Browser Use. Chạy `pip install -r backend/requirements.txt` "
                f"rồi thử lại. Lỗi: {exc}"
            ),
            "tool_actions": ["browser_use=missing_package"],
        }

    profile = BrowserProfile(
        user_data_dir=_default_profile_dir(),
        headless=os.getenv("BROWSER_USE_HEADLESS", "").strip().lower() in ENABLE_VALUES,
    )
    browser_session = BrowserSession(browser_profile=profile)
    llm = ChatOpenAI(model=os.getenv("BROWSER_USE_MODEL", DEFAULT_MODEL))
    agent = BrowserUseAgent(
        task=_build_task(message, current_url),
        llm=llm,
        browser_session=browser_session,
    )

    max_steps = int(os.getenv("BROWSER_USE_MAX_STEPS", str(DEFAULT_MAX_STEPS)))
    timeout = int(os.getenv("BROWSER_USE_TIMEOUT_SECONDS", str(DEFAULT_TIMEOUT_SECONDS)))

    try:
        result = await asyncio.wait_for(agent.run(max_steps=max_steps), timeout=timeout)
    except asyncio.TimeoutError:
        return {
            "status": "error",
            "code": "BROWSER_USE_TIMEOUT",
            "reply": "Browser agent chạy quá lâu. Hãy thử lại với yêu cầu ngắn hơn.",
            "tool_actions": ["browser_use=timeout"],
        }

    return {
        "status": "success",
        "reply": _result_text(result),
        "tool_actions": [f"browser_use=success: max_steps={max_steps}"],
    }
