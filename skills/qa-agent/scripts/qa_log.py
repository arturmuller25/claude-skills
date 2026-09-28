"""Repro-first logging for exploratory QA with Python Playwright.

Use it inside any Playwright script (for example one written with the
`webapp-testing` skill):

    from qa_log import QaLog

    log = QaLog(page, "qa/run-2026-09-28")   # created if missing; keep qa/ git-ignored
    log.step("open home", lambda: page.goto("http://localhost:3000"))
    log.step("send empty form", lambda: page.get_by_role("button", name="Send").click())
    print(log.finish())                        # writes report.md and returns its path

Each step runs its action, waits for the network to settle (bounded), saves a
numbered screenshot and records what happened during that step only: console
errors, uncaught page exceptions, failed requests and HTTP responses >= 400.
The first step's findings are the page's load errors; every later step gets only
what its own action caused, so a load error is never blamed on a click.

A failing action (selector not found, timeout) is recorded as a finding and the
run goes on: in exploratory QA a broken step is a result, not a crash.
"""
from __future__ import annotations

import re
import time
import unicodedata
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class _Step:
    number: int
    name: str
    screenshot: str = ""
    action_error: str = ""
    console: list[str] = field(default_factory=list)
    requests: list[str] = field(default_factory=list)

    @property
    def clean(self) -> bool:
        return not (self.action_error or self.console or self.requests)


def _slug(text: str) -> str:
    plain = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", plain.lower()).strip("-")[:40] or "step"


class QaLog:
    def __init__(self, page, folder: str | Path, settle_ms: int = 300, full_page: bool = False):
        self.page = page
        self.folder = Path(folder)
        self.folder.mkdir(parents=True, exist_ok=True)
        self.settle_ms = settle_ms
        self.full_page = full_page
        self.steps: list[_Step] = []
        self._current: _Step | None = None
        page.on("console", self._on_console)
        page.on("pageerror", lambda error: self._add("console", f"uncaught: {error}"))
        page.on("requestfailed", lambda req: self._add(
            "requests", f"{req.method} {req.url} failed: {req.failure or 'unknown'}"))
        page.on("response", self._on_response)

    def _add(self, kind: str, text: str) -> None:
        if self._current is not None:
            getattr(self._current, kind).append(text)

    def _on_console(self, message) -> None:
        if message.type == "error":
            self._add("console", message.text)

    def _on_response(self, response) -> None:
        if response.status >= 400:
            self._add("requests", f"{response.status} {response.request.method} {response.url}")

    def step(self, name: str, action) -> _Step:
        step = _Step(number=len(self.steps) + 1, name=name)
        self.steps.append(step)
        self._current = step
        try:
            action()
        except Exception as error:  # noqa: BLE001  a failing action is a finding
            step.action_error = f"{type(error).__name__}: {str(error).splitlines()[0]}"
        try:
            self.page.wait_for_load_state("networkidle", timeout=5000)
        except Exception:  # noqa: BLE001  pages that never go idle still get a screenshot
            pass
        self.page.wait_for_timeout(self.settle_ms)  # late console errors land in this step
        shot = self.folder / f"{step.number:02d}-{_slug(name)}.png"
        try:
            self.page.screenshot(path=str(shot), full_page=self.full_page)
            step.screenshot = shot.name
        except Exception as error:  # noqa: BLE001
            step.action_error = step.action_error or f"screenshot failed: {error}"
        return step

    def finish(self) -> Path:
        self._current = None
        lines = [
            f"# QA run {time.strftime('%Y-%m-%d %H:%M')}",
            "",
            f"{sum(not s.clean for s in self.steps)} of {len(self.steps)} steps with findings.",
            "Step 1 findings are load errors; later steps list only what their action caused.",
            "",
            "| # | Step | Screenshot | Action | Console and exceptions | Requests |",
            "|---|---|---|---|---|---|",
        ]
        for s in self.steps:
            cell = lambda items: "<br>".join(i.replace("|", "\\|") for i in items) or "none"
            lines.append(
                f"| {s.number} | {s.name} | {s.screenshot or 'none'} | "
                f"{(s.action_error or 'ok').replace('|', '/')} | {cell(s.console)} | {cell(s.requests)} |")
        report = self.folder / "report.md"
        report.write_text("\n".join(lines) + "\n", encoding="utf-8")
        return report
