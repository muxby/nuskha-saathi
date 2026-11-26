"""Bounded, process-local diagnostics. Never capture request or patient contents."""
from collections import deque
from contextlib import contextmanager
from contextvars import ContextVar
from datetime import datetime, timezone
import logging
from time import perf_counter
from uuid import uuid4

_current = ContextVar('diagnostic_trace', default=None)
logger = logging.getLogger('uvicorn.error')


def error_category(exc):
    # Follow chained provider errors, but never format their messages or URLs.
    for _ in range(5):
        response = getattr(exc, 'response', None)
        if response is not None and isinstance(getattr(response, 'status_code', None), int):
            return f'HTTP_{response.status_code}'
        if exc.__cause__ is None:
            break
        exc = exc.__cause__
    return type(exc).__name__


def event(name, status='passed', milliseconds=0, error=None):
    trace = _current.get()
    if trace is not None and len(trace['stages']) < 100:
        trace['stages'].append({'name': name, 'status': status,
                                'ms': round(milliseconds, 1), 'error': error})


@contextmanager
def stage(name):
    trace = _current.get()
    started = perf_counter()
    previous = trace.get('active_stage') if trace else None
    if trace is not None:
        trace['active_stage'] = name
    try:
        yield
    except Exception as exc:
        event(name, 'failed', (perf_counter() - started) * 1000, error_category(exc))
        raise
    else:
        event(name, milliseconds=(perf_counter() - started) * 1000)
    finally:
        if trace is not None:
            trace['active_stage'] = previous


class Monitor:
    def __init__(self):
        self.started = perf_counter()
        self.started_at = datetime.now(timezone.utc).isoformat()
        self.recent = deque(maxlen=100)
        self.active = {}
        self.total = 0
        self.http_failures = 0


class MonitoringMiddleware:
    def __init__(self, app, monitor):
        self.app, self.monitor = app, monitor

    async def __call__(self, scope, receive, send):
        if scope['type'] != 'http' or not scope['path'].startswith('/api/'):
            return await self.app(scope, receive, send)
        request_id = uuid4().hex
        scope.setdefault('state', {})['diagnostic_request_id'] = request_id
        trace = {'id': request_id, 'at': datetime.now(timezone.utc).isoformat(),
                 'method': scope['method'], 'stages': [], 'active_stage': None}
        # Limit simultaneous retained traces as well as completed history.
        if len(self.monitor.active) < 100:
            self.monitor.active[request_id] = trace
        token = _current.set(trace)
        started, status = perf_counter(), 500

        async def tracked_send(message):
            nonlocal status
            if message['type'] == 'http.response.start':
                status = message['status']
                message['headers'] = list(message.get('headers', [])) + [(b'x-request-id', request_id.encode())]
            await send(message)
        try:
            await self.app(scope, receive, tracked_send)
        except Exception as exc:
            event('request', 'failed', error=error_category(exc))
            raise
        finally:
            route = scope.get('route')
            trace.update(route=getattr(route, 'path', 'unmatched'), status=status,
                         ms=round((perf_counter() - started) * 1000, 1))
            self.monitor.active.pop(request_id, None)
            self.monitor.recent.append(trace)
            self.monitor.total += 1
            self.monitor.http_failures += int(status >= 400)
            if status >= 400 or any(s['status'] == 'failed' for s in trace['stages']):
                logger.warning('diagnostic request_id=%s route=%s status=%s stages=%s',
                               request_id, trace['route'], status,
                               [(s['name'], s['status'], s['error']) for s in trace['stages']])
            _current.reset(token)
