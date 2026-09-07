from slowapi import Limiter
from slowapi.util import get_remote_address
from fastapi import Request


def user_or_ip_key(request: Request):
    auth_header = request.headers.get("authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header[7:][:40]
    return get_remote_address(request)


limiter = Limiter(key_func=user_or_ip_key)