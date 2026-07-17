"""Application configuration."""
import os

class Config:
    SECRET_KEY = os.environ.get('SESSION_SECRET', 'ajar-secret-key-2024')
    DATABASE_URL = os.environ.get('DATABASE_URL')
    JSON_AS_ASCII = False
    JSON_SORT_KEYS = False
    JSONIFY_PRETTYPRINT_REGULAR = False
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'None'
    SESSION_COOKIE_SECURE = True
