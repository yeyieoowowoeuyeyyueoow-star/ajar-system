"""Application configuration."""
import os

class Config:
    SECRET_KEY = os.environ.get('SESSION_SECRET', 'ajar-secret-key-2024')
    JSON_AS_ASCII = False          # Serve Arabic JSON without escaping
    JSON_SORT_KEYS = False
    JSONIFY_PRETTYPRINT_REGULAR = False
