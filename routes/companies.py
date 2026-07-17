"""Companies CRUD."""
from flask import Blueprint, request, jsonify
import database as db
from routes.auth import require_auth

companies_bp = Blueprint('companies', __name__)


@companies_bp.get('/')
def list_companies():
    _, err = require_auth()
    if err:
        return err
    return jsonify(db.list_companies(
        q=request.args.get('q'),
        status=request.args.get('status'),
        page=int(request.args.get('page', 1)),
        limit=int(request.args.get('limit', 20)),
    ))


@companies_bp.post('/')
def create_company():
    user, err = require_auth()
    if err:
        return err
    body = request.get_json(silent=True) or {}
    return jsonify(db.create_company(body, user['id'])), 201


@companies_bp.get('/<cid>')
def get_company(cid):
    _, err = require_auth()
    if err:
        return err
    c = db.get_company(cid)
    if not c:
        return jsonify({'message': 'الشركة غير موجودة'}), 404
    return jsonify(c)


@companies_bp.put('/<cid>')
def update_company(cid):
    user, err = require_auth()
    if err:
        return err
    body = request.get_json(silent=True) or {}
    c = db.update_company(cid, body, user['id'])
    if not c:
        return jsonify({'message': 'الشركة غير موجودة'}), 404
    return jsonify(c)


@companies_bp.delete('/<cid>')
def delete_company(cid):
    user, err = require_auth()
    if err:
        return err
    if not db.delete_company(cid, user['id']):
        return jsonify({'message': 'الشركة غير موجودة'}), 404
    return jsonify({'message': 'تم الحذف'})
