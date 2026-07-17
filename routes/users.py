"""Users CRUD (admin only)."""
from flask import Blueprint, request, jsonify
import database as db
from routes.auth import require_auth

users_bp = Blueprint('users', __name__)


def require_admin():
    user, err = require_auth()
    if err:
        return None, err
    if user.get('role') != 'admin':
        return None, (jsonify({'message': 'صلاحيات المدير مطلوبة'}), 403)
    return user, None


@users_bp.get('/')
def list_users():
    _, err = require_admin()
    if err:
        return err
    return jsonify(db.list_users())


@users_bp.post('/')
def create_user():
    admin, err = require_admin()
    if err:
        return err
    body = request.get_json(silent=True) or {}
    u = db.create_user(body, admin['id'])
    if u is None:
        return jsonify({'message': 'اسم المستخدم مستخدم بالفعل'}), 400
    return jsonify(u), 201


@users_bp.get('/<uid>')
def get_user(uid):
    _, err = require_admin()
    if err:
        return err
    u = db.get_user(uid)
    if not u:
        return jsonify({'message': 'المستخدم غير موجود'}), 404
    return jsonify(u)


@users_bp.put('/<uid>')
def update_user(uid):
    admin, err = require_admin()
    if err:
        return err
    body = request.get_json(silent=True) or {}
    u = db.update_user(uid, body, admin['id'])
    if not u:
        return jsonify({'message': 'المستخدم غير موجود'}), 404
    return jsonify(u)


@users_bp.delete('/<uid>')
def delete_user(uid):
    admin, err = require_admin()
    if err:
        return err
    if uid == admin['id']:
        return jsonify({'message': 'لا يمكنك حذف حسابك الخاص'}), 400
    if not db.delete_user(uid, admin['id']):
        return jsonify({'message': 'المستخدم غير موجود'}), 404
    return jsonify({'message': 'تم الحذف'})
