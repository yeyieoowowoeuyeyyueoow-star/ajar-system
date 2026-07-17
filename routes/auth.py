"""Authentication API routes."""
from flask import Blueprint, request, jsonify
import database as db

auth_bp = Blueprint('auth', __name__)


def _token_from_request() -> str | None:
    header = request.headers.get('Authorization', '')
    if header.startswith('Bearer '):
        return header[7:]
    return None


def get_current_user() -> dict | None:
    token = _token_from_request()
    return db.get_user_by_token(token)


def require_auth():
    user = get_current_user()
    if not user:
        return None, (jsonify({'message': 'غير مصرح'}), 401)
    return user, None


@auth_bp.post('/login')
def login():
    body = request.get_json(silent=True) or {}
    username = body.get('username', '').strip()
    password = body.get('password', '')
    user = db.get_user_by_credentials(username, password)
    if not user:
        return jsonify({'message': 'اسم المستخدم أو كلمة المرور غير صحيحة'}), 401
    if user.get('status') != 'active':
        return jsonify({'message': 'الحساب موقوف'}), 403
    token = db.create_session(user['id'])
    db.add_log('تسجيل دخول', user['id'], 'auth', None,
               f'تم تسجيل دخول المستخدم {user["fullName"]}')
    return jsonify({'token': token, 'user': user})


@auth_bp.post('/logout')
def logout():
    token = _token_from_request()
    if token:
        db.delete_session(token)
    return jsonify({'message': 'تم تسجيل الخروج'})


@auth_bp.get('/me')
def me():
    user, err = require_auth()
    if err:
        return err
    return jsonify(user)
