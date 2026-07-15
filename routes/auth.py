"""Authentication routes: login / logout / me."""
import uuid
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
import server.data as db

auth_bp = Blueprint('auth', __name__)


def _token_from_request() -> str | None:
    header = request.headers.get('Authorization', '')
    if header.startswith('Bearer '):
        return header[7:]
    return None


def get_current_user() -> dict | None:
    """Return the authenticated user dict or None."""
    token = _token_from_request()
    if not token:
        return None
    uid = db.tokens.get(token)
    if not uid:
        return None
    return db.find_by_id(db.users, uid)


def require_auth():
    """Return (user, None) or (None, error_response)."""
    user = get_current_user()
    if not user:
        return None, (jsonify({'message': 'غير مصرح'}), 401)
    return user, None


# ── POST /api/auth/login ───────────────────────────────────────────────────────
@auth_bp.post('/login')
def login():
    body = request.get_json(silent=True) or {}
    username = body.get('username', '').strip()
    password = body.get('password', '')

    user = next((u for u in db.users if u['username'] == username), None)
    if not user or user['password'] != password:
        return jsonify({'message': 'اسم المستخدم أو كلمة المرور غير صحيحة'}), 401
    if user['status'] != 'active':
        return jsonify({'message': 'الحساب موقوف'}), 403

    token = str(uuid.uuid4())
    db.tokens[token] = user['id']

    db.logs.insert(0, {
        'id': str(uuid.uuid4()),
        'action': 'تسجيل دخول',
        'userId': user['id'],
        'entityType': 'auth',
        'entityId': None,
        'details': f'تم تسجيل دخول المستخدم {user["fullName"]}',
        'createdAt': datetime.now(timezone.utc).isoformat(),
    })

    safe = {k: v for k, v in user.items() if k != 'password'}
    return jsonify({'token': token, 'user': safe})


# ── POST /api/auth/logout ──────────────────────────────────────────────────────
@auth_bp.post('/logout')
def logout():
    token = _token_from_request()
    if token and token in db.tokens:
        db.tokens.pop(token)
    return jsonify({'message': 'تم تسجيل الخروج'})


# ── GET /api/auth/me ───────────────────────────────────────────────────────────
@auth_bp.get('/me')
def me():
    user, err = require_auth()
    if err:
        return err
    safe = {k: v for k, v in user.items() if k != 'password'}
    return jsonify(safe)
