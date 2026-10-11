"""Shared extension instances, kept out of app.py/routes to avoid circular imports."""
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
