import time
from collections import defaultdict
from threading import Lock

from fastapi import APIRouter, Request, Response
from fastapi.responses import PlainTextResponse

router = APIRouter(prefix="/metrics", tags=["monitoring"])

_lock = Lock()
_request_count = 0
_error_count = 0
_latency_total = 0.0
_path_counts: defaultdict[str, int] = defaultdict(int)


def record_request(path: str, status_code: int, duration: float) -> None:
    global _request_count, _error_count, _latency_total
    with _lock:
        _request_count += 1
        if status_code >= 400:
            _error_count += 1
        _latency_total += duration
        _path_counts[path] += 1


async def metrics_middleware(request: Request, call_next) -> Response:
    started_at = time.perf_counter()
    response = await call_next(request)
    record_request(
        request.url.path,
        response.status_code,
        time.perf_counter() - started_at,
    )
    return response


@router.get("", response_class=PlainTextResponse)
async def get_metrics() -> PlainTextResponse:
    with _lock:
        request_count = _request_count
        error_count = _error_count
        average_latency = _latency_total / request_count if request_count else 0.0
        path_counts = dict(_path_counts)

    lines = [
        "# HELP oms_http_requests_total Total HTTP requests.",
        "# TYPE oms_http_requests_total counter",
        f"oms_http_requests_total {request_count}",
        "# HELP oms_http_errors_total Total HTTP responses with status >= 400.",
        "# TYPE oms_http_errors_total counter",
        f"oms_http_errors_total {error_count}",
        "# HELP oms_http_request_duration_seconds Average request duration.",
        "# TYPE oms_http_request_duration_seconds gauge",
        f"oms_http_request_duration_seconds {average_latency:.6f}",
    ]
    for path, count in sorted(path_counts.items()):
        safe_path = path.replace('"', '\\"')
        lines.append(f'oms_http_requests_by_path{{path="{safe_path}"}} {count}')

    return PlainTextResponse(
        "\n".join(lines) + "\n",
        media_type="text/plain; version=0.0.4; charset=utf-8",
    )
