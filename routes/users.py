"""Users CRUD."""
import uuid
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
import server.data as db
from .auth import require_auth

users_bp = Blueprint('users', __name__)

def _safe(u: dict) -> dict:
    return {k: v for k, v in u.items() if k != 'password'}


@users_bp.get('/')
def list_users():
    _, err = require_auth()
    if err: return err
    q      = (request.args.get('q') or '').lower()
    role   = request.args.get('role')
    page   = int(request.args.get('page', 1))
    limit  = int(request.args.get('limit', 20))
    results = list(db.users)
    if q:
        results = [u for u in results if q in (u['fullName']+u['username']).lower()]
    if role:
        results = [u for u in results if u['role'] == role]
    paged = db.paginate(results, page, limit)
    paged['data'] = [_safe(u) for u in paged['data']]
    return jsonify(paged)


@users_bp.post('/')
def create_user():
    user, err = require_auth()
    if err: return err
    body = request.get_json(silent=True) or {}
    if next((u for u in db.users if u['username'] == body.get('username')), None):
        return jsonify({'message': 'اسم المستخدم مستخدم بالفعل'}), 409
    ts  = datetime.now(timezone.utc).isoformat()
    uid = str(uuid.uuid4())
    new_user = {
        'id': uid,
        'fullName': body.get('fullName', ''),
        'username': body.get('username', ''),
        'email':    body.get('email', ''),
        'role':     body.get('role', 'operator'),
        'status':   body.get('status', 'active'),
        'password': body.get('password', ''),
        'createdAt': ts, 'updatedAt': ts,
    }
    db.users.append(new_user)
    db.logs.insert(0, {'id': str(uuid.uuid4()), 'action': 'إضافة مستخدم',
        'userId': user['id'], 'entityType': 'user', 'entityId': uid,
        'details': f'تم إضافة المستخدم {new_user["username"]}', 'createdAt': ts})
    return jsonify(_safe(new_user)), 201


@users_bp.get('/<uid>')
def get_user(uid):
    _, err = require_auth()
    if err: return err
    u = db.find_by_id(db.users, uid)
    if not u: return jsonify({'message': 'المستخدم غير موجود'}), 404
    return jsonify(_safe(u))


@users_bp.put('/<uid>')
def update_user(uid):
    user, err = require_auth()
    if err: return err
    u = db.find_by_id(db.users, uid)
    if not u: return jsonify({'message': 'المستخدم غير موجود'}), 404
    body = request.get_json(silent=True) or {}
    for k in ('fullName','email','role','status'):
        if k in body: u[k] = body[k]
    if 'password' in body and body['password']:
        u['password'] = body['password']
    u['updatedAt'] = datetime.now(timezone.utc).isoformat()
    db.logs.insert(0, {'id': str(uuid.uuid4()), 'action': 'تعديل مستخدم',
        'userId': user['id'], 'entityType': 'user', 'entityId': uid,
        'details': f'تم تعديل المستخدم {u["username"]}', 'createdAt': u['updatedAt']})
    return jsonify(_safe(u))


@users_bp.delete('/<uid>')
def delete_user(uid):
    user, err = require_auth()
    if err: return err
    u = db.find_by_id(db.users, uid)
    if not u: return jsonify({'message': 'المستخدم غير موجود'}), 404
    if u['id'] == user['id']:
        return jsonify({'message': 'لا يمكنك حذف حسابك الخاص'}), 400
    db.users.remove(u)
    ts = datetime.now(timezone.utc).isoformat()
    db.logs.insert(0, {'id': str(uuid.uuid4()), 'action': 'حذف مستخدم',
        'userId': user['id'], 'entityType': 'user', 'entityId': uid,
        'details': f'تم حذف المستخدم {u["username"]}', 'createdAt': ts})
    return jsonify({'message': 'تم الحذف'})
