"""Web UI routes — renders Jinja2 templates."""
import uuid
import json
from functools import wraps
from flask import (Blueprint, render_template, request, redirect,
                   url_for, session, flash)
import database as db

web_bp = Blueprint('web', __name__)

STATUS_AR = {
    'active': 'ساري', 'pending': 'قيد الانتظار', 'expired': 'منتهي',
    'rejected': 'مرفوض', 'suspended': 'موقوف',
}
ROLE_AR = {'admin': 'مدير', 'manager': 'مشرف', 'operator': 'مشغل'}


def current_user():
    return db.get_user_by_token(session.get('token'))


def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not current_user():
            return redirect(url_for('web.login'))
        return f(*args, **kwargs)
    return decorated


# ── Auth ──────────────────────────────────────────────────────────────────────

@web_bp.get('/')
def index():
    if current_user():
        return redirect(url_for('web.dashboard'))
    return redirect(url_for('web.login'))


@web_bp.get('/login')
def login():
    if current_user():
        return redirect(url_for('web.dashboard'))
    return render_template('login.html')


@web_bp.post('/login')
def login_post():
    username = request.form.get('username', '').strip()
    password = request.form.get('password', '')
    user = db.get_user_by_credentials(username, password)
    if not user:
        flash('اسم المستخدم أو كلمة المرور غير صحيحة', 'danger')
        return render_template('login.html')
    if user.get('status') != 'active':
        flash('الحساب موقوف، تواصل مع المدير', 'danger')
        return render_template('login.html')
    token = db.create_session(user['id'])
    session['token'] = token
    db.add_log('تسجيل دخول', user['id'], 'auth', None,
               f'تم تسجيل دخول {user["fullName"]}')
    return redirect(url_for('web.dashboard'))


@web_bp.get('/logout')
def logout():
    token = session.pop('token', None)
    if token:
        db.delete_session(token)
    return redirect(url_for('web.login'))


# ── Dashboard ─────────────────────────────────────────────────────────────────

@web_bp.get('/dashboard')
@login_required
def dashboard():
    stats = db.dashboard_stats()
    expiring = db.expiring_soon(30, 8)
    activity = db.recent_activity(10)
    return render_template('dashboard.html', stats=stats, expiring=expiring,
                           activity=activity, user=current_user(),
                           status_ar=STATUS_AR)


# ── Permits ───────────────────────────────────────────────────────────────────

@web_bp.get('/permits')
@login_required
def permits_list():
    q = request.args.get('q', '')
    status = request.args.get('status', '')
    page = int(request.args.get('page', 1))
    paged = db.list_permits(q=q or None, status=status or None, page=page, limit=15)
    return render_template('permits/list.html', permits=paged['data'], paged=paged,
                           q=q, status=status, user=current_user(), status_ar=STATUS_AR)


@web_bp.get('/permits/new')
@login_required
def permits_new():
    workers = db.list_workers(limit=1000)['data']
    companies = db.list_companies(limit=1000)['data']
    return render_template('permits/form.html', permit=None, workers=workers,
                           companies=companies, user=current_user(), status_ar=STATUS_AR,
                           workers_json=json.dumps(workers, ensure_ascii=False, default=str),
                           companies_json=json.dumps(companies, ensure_ascii=False, default=str))


def _resolve_worker(f, u):
    """ينشئ / يحدّث / يعيد worker_id بحسب worker_mode."""
    mode      = f.get('worker_mode', 'existing')
    worker_id = f.get('workerId') or None
    fields = {
        'fullName':       f.get('worker_fullName', '').strip(),
        'nationality':    f.get('worker_nationality', '').strip(),
        'idNumber':       f.get('worker_idNumber', '').strip(),
        'passportNumber': f.get('worker_passportNumber', '').strip(),
        'phone':          f.get('worker_phone', '').strip(),
        'birthDate':      f.get('worker_birthDate', '').strip(),
        'email':          f.get('worker_email', '').strip(),
        'occupation':     f.get('worker_occupation', '').strip(),
    }
    if mode == 'new' and fields.get('fullName'):
        return db.create_worker(fields, u['id'])['id']
    if worker_id and any(fields.values()):
        db.update_worker(worker_id, fields, u['id'])
    return worker_id


def _resolve_company(f, prefix, u):
    """ينشئ / يحدّث / يعيد company_id بحسب {prefix}_mode."""
    mode       = f.get(f'{prefix}_mode', 'existing')
    company_id = f.get(f'{prefix}CompanyId') or f.get('companyId') if prefix == 'provider' else f.get(f'{prefix}CompanyId')
    # اقرأ الـ id من الحقول الصحيحة حسب prefix
    if prefix == 'provider':
        company_id = f.get('companyId') or None
    else:
        company_id = f.get('beneficiaryCompanyId') or None
    fields = {
        'name':          f.get(f'{prefix}_name', '').strip(),
        'companyNumber': f.get(f'{prefix}_companyNumber', '').strip(),
        'city':          f.get(f'{prefix}_city', '').strip(),
        'phone':         f.get(f'{prefix}_phone', '').strip(),
        'email':         f.get(f'{prefix}_email', '').strip(),
        'address':       f.get(f'{prefix}_address', '').strip(),
    }
    if mode == 'new' and fields.get('name'):
        return db.create_company(fields, u['id'])['id']
    if company_id and any(fields.values()):
        db.update_company(company_id, fields, u['id'])
    return company_id


@web_bp.post('/permits/new')
@login_required
def permits_create():
    f = request.form
    u = current_user()
    worker_id   = _resolve_worker(f, u)
    company_id  = _resolve_company(f, 'provider', u)
    beneficiary_id = _resolve_company(f, 'beneficiary', u)
    data = {
        'permitNumber':         f.get('permitNumber') or None,
        'workerId':             worker_id,
        'companyId':            company_id,
        'beneficiaryCompanyId': beneficiary_id,
        'occupation':           f.get('occupation', ''),
        'notes':                f.get('notes', ''),
        'workLocation':         f.get('workLocation', ''),
        'status':               f.get('status', 'pending'),
        'startDate':            f.get('startDate', ''),
        'expiryDate':           f.get('expiryDate', ''),
        'issueDate':            f.get('issueDate', ''),
    }
    p = db.create_permit(data, u['id'])
    flash('تم إنشاء التصريح بنجاح', 'success')
    return redirect(url_for('web.permits_detail', pid=p['id']))


@web_bp.get('/permits/<pid>')
@login_required
def permits_detail(pid):
    p = db.get_permit(pid)
    if not p:
        flash('التصريح غير موجود', 'danger')
        return redirect(url_for('web.permits_list'))
    return render_template('permits/detail.html', permit=p,
                           user=current_user(), status_ar=STATUS_AR)


@web_bp.get('/permits/<pid>/edit')
@login_required
def permits_edit(pid):
    p = db.get_permit(pid)
    if not p:
        flash('التصريح غير موجود', 'danger')
        return redirect(url_for('web.permits_list'))
    workers = db.list_workers(limit=1000)['data']
    companies = db.list_companies(limit=1000)['data']
    return render_template('permits/form.html', permit=p, workers=workers,
                           companies=companies, user=current_user(), status_ar=STATUS_AR,
                           workers_json=json.dumps(workers, ensure_ascii=False, default=str),
                           companies_json=json.dumps(companies, ensure_ascii=False, default=str))


@web_bp.post('/permits/<pid>/edit')
@login_required
def permits_update(pid):
    f = request.form
    u = current_user()
    worker_id      = _resolve_worker(f, u)
    company_id     = _resolve_company(f, 'provider', u)
    beneficiary_id = _resolve_company(f, 'beneficiary', u)
    data = {
        'permitNumber':         f.get('permitNumber') or None,
        'workerId':             worker_id,
        'companyId':            company_id,
        'beneficiaryCompanyId': beneficiary_id,
        'occupation':           f.get('occupation'),
        'notes':                f.get('notes'),
        'workLocation':         f.get('workLocation'),
        'status':               f.get('status'),
        'startDate':            f.get('startDate'),
        'expiryDate':           f.get('expiryDate'),
        'issueDate':            f.get('issueDate'),
    }
    db.update_permit(pid, data, u['id'])
    flash('تم تحديث التصريح بنجاح', 'success')
    return redirect(url_for('web.permits_detail', pid=pid))


@web_bp.post('/permits/<pid>/delete')
@login_required
def permits_delete(pid):
    u = current_user()
    db.delete_permit(pid, u['id'])
    flash('تم حذف التصريح', 'success')
    return redirect(url_for('web.permits_list'))


@web_bp.get('/permits/<pid>/pdf')
@login_required
def permits_pdf(pid):
    import io
    from flask import send_file
    from pdf.generator import generate_permit_pdf
    p = db.get_permit(pid)
    if not p:
        flash('التصريح غير موجود', 'danger')
        return redirect(url_for('web.permits_list'))
    pdf_bytes = generate_permit_pdf(p)
    return send_file(io.BytesIO(pdf_bytes), mimetype='application/pdf',
                     as_attachment=True,
                     download_name=f'{p["permitNumber"]}.pdf')


@web_bp.get('/permits/<pid>/pdf/preview')
@login_required
def permits_pdf_preview(pid):
    import io
    from flask import send_file
    from pdf.generator import generate_permit_pdf
    p = db.get_permit(pid)
    if not p:
        flash('التصريح غير موجود', 'danger')
        return redirect(url_for('web.permits_list'))
    pdf_bytes = generate_permit_pdf(p)
    return send_file(io.BytesIO(pdf_bytes), mimetype='application/pdf',
                     as_attachment=False)


# ── Workers ───────────────────────────────────────────────────────────────────

@web_bp.get('/workers')
@login_required
def workers_list():
    q = request.args.get('q', '')
    status = request.args.get('status', '')
    page = int(request.args.get('page', 1))
    paged = db.list_workers(q=q or None, status=status or None, page=page, limit=15)
    # enrich with company name
    companies_map = {c['id']: c['name']
                     for c in db.list_companies(limit=1000)['data']}
    for w in paged['data']:
        w['companyName'] = companies_map.get(w.get('companyId', ''), '-')
    return render_template('workers/list.html', workers=paged['data'], paged=paged,
                           q=q, status=status, user=current_user(), status_ar=STATUS_AR)


@web_bp.get('/workers/new')
@login_required
def workers_new():
    companies = db.list_companies(limit=1000)['data']
    return render_template('workers/form.html', worker=None,
                           companies=companies, user=current_user())


@web_bp.post('/workers/new')
@login_required
def workers_create():
    f = request.form
    u = current_user()
    data = {
        'fullName': f.get('fullName', ''), 'idNumber': f.get('idNumber', ''),
        'nationality': f.get('nationality', ''), 'occupation': f.get('occupation', ''),
        'phone': f.get('phone', ''), 'email': f.get('email', ''),
        'passportNumber': f.get('passportNumber', ''), 'birthDate': f.get('birthDate', ''),
        'photoUrl': '', 'companyId': f.get('companyId') or None,
        'status': f.get('status', 'active'),
    }
    db.create_worker(data, u['id'])
    flash('تم إضافة العامل بنجاح', 'success')
    return redirect(url_for('web.workers_list'))


@web_bp.get('/workers/<wid>/edit')
@login_required
def workers_edit(wid):
    w = db.get_worker(wid)
    if not w:
        flash('العامل غير موجود', 'danger')
        return redirect(url_for('web.workers_list'))
    companies = db.list_companies(limit=1000)['data']
    return render_template('workers/form.html', worker=w,
                           companies=companies, user=current_user())


@web_bp.post('/workers/<wid>/edit')
@login_required
def workers_update(wid):
    f = request.form
    u = current_user()
    data = {
        'fullName': f.get('fullName'), 'idNumber': f.get('idNumber'),
        'nationality': f.get('nationality'), 'occupation': f.get('occupation'),
        'phone': f.get('phone'), 'email': f.get('email'),
        'passportNumber': f.get('passportNumber'), 'birthDate': f.get('birthDate'),
        'companyId': f.get('companyId') or None, 'status': f.get('status'),
    }
    db.update_worker(wid, data, u['id'])
    flash('تم تحديث بيانات العامل', 'success')
    return redirect(url_for('web.workers_list'))


@web_bp.post('/workers/<wid>/delete')
@login_required
def workers_delete(wid):
    u = current_user()
    db.delete_worker(wid, u['id'])
    flash('تم حذف العامل', 'success')
    return redirect(url_for('web.workers_list'))


# ── Companies ─────────────────────────────────────────────────────────────────

@web_bp.get('/companies')
@login_required
def companies_list():
    q = request.args.get('q', '')
    status = request.args.get('status', '')
    page = int(request.args.get('page', 1))
    paged = db.list_companies(q=q or None, status=status or None, page=page, limit=15)
    return render_template('companies/list.html', companies=paged['data'], paged=paged,
                           q=q, status=status, user=current_user(), status_ar=STATUS_AR)


@web_bp.get('/companies/new')
@login_required
def companies_new():
    return render_template('companies/form.html', company=None, user=current_user())


@web_bp.post('/companies/new')
@login_required
def companies_create():
    f = request.form
    u = current_user()
    data = {
        'name': f.get('name', ''), 'companyNumber': f.get('companyNumber', ''),
        'email': f.get('email', ''), 'phone': f.get('phone', ''),
        'city': f.get('city', ''), 'address': f.get('address', ''),
        'status': f.get('status', 'active'),
    }
    db.create_company(data, u['id'])
    flash('تم إضافة الشركة بنجاح', 'success')
    return redirect(url_for('web.companies_list'))


@web_bp.get('/companies/<cid>/edit')
@login_required
def companies_edit(cid):
    c = db.get_company(cid)
    if not c:
        flash('الشركة غير موجودة', 'danger')
        return redirect(url_for('web.companies_list'))
    return render_template('companies/form.html', company=c, user=current_user())


@web_bp.post('/companies/<cid>/edit')
@login_required
def companies_update(cid):
    f = request.form
    u = current_user()
    data = {
        'name': f.get('name'), 'companyNumber': f.get('companyNumber'),
        'email': f.get('email'), 'phone': f.get('phone'),
        'city': f.get('city'), 'address': f.get('address'),
        'status': f.get('status'),
    }
    db.update_company(cid, data, u['id'])
    flash('تم تحديث بيانات الشركة', 'success')
    return redirect(url_for('web.companies_list'))


@web_bp.post('/companies/<cid>/delete')
@login_required
def companies_delete(cid):
    u = current_user()
    db.delete_company(cid, u['id'])
    flash('تم حذف الشركة', 'success')
    return redirect(url_for('web.companies_list'))


# ── Users ─────────────────────────────────────────────────────────────────────

@web_bp.get('/users')
@login_required
def users_list():
    u = current_user()
    if u.get('role') != 'admin':
        flash('هذه الصفحة للمدير فقط', 'danger')
        return redirect(url_for('web.dashboard'))
    return render_template('users/list.html', users=db.list_users(), user=u,
                           status_ar=STATUS_AR, role_ar=ROLE_AR)


@web_bp.get('/users/new')
@login_required
def users_new():
    u = current_user()
    if u.get('role') != 'admin':
        return redirect(url_for('web.dashboard'))
    return render_template('users/form.html', usr=None, user=u, role_ar=ROLE_AR)


@web_bp.post('/users/new')
@login_required
def users_create():
    u = current_user()
    if u.get('role') != 'admin':
        return redirect(url_for('web.dashboard'))
    f = request.form
    data = {
        'fullName': f.get('fullName', ''), 'username': f.get('username', ''),
        'email': f.get('email', ''), 'role': f.get('role', 'operator'),
        'status': f.get('status', 'active'), 'password': f.get('password', '123456'),
    }
    result = db.create_user(data, u['id'])
    if result is None:
        flash('اسم المستخدم مستخدم بالفعل', 'danger')
        return render_template('users/form.html', usr=None, user=u, role_ar=ROLE_AR)
    flash('تم إضافة المستخدم بنجاح', 'success')
    return redirect(url_for('web.users_list'))


@web_bp.get('/users/<uid>/edit')
@login_required
def users_edit(uid):
    u = current_user()
    if u.get('role') != 'admin':
        return redirect(url_for('web.dashboard'))
    usr = db.get_user(uid)
    if not usr:
        flash('المستخدم غير موجود', 'danger')
        return redirect(url_for('web.users_list'))
    return render_template('users/form.html', usr=usr, user=u, role_ar=ROLE_AR)


@web_bp.post('/users/<uid>/edit')
@login_required
def users_update(uid):
    u = current_user()
    if u.get('role') != 'admin':
        return redirect(url_for('web.dashboard'))
    f = request.form
    data = {
        'fullName': f.get('fullName'), 'email': f.get('email'),
        'role': f.get('role'), 'status': f.get('status'),
        'password': f.get('password') or None,
    }
    db.update_user(uid, data, u['id'])
    flash('تم تحديث بيانات المستخدم', 'success')
    return redirect(url_for('web.users_list'))


@web_bp.post('/users/<uid>/delete')
@login_required
def users_delete(uid):
    u = current_user()
    if u.get('role') != 'admin':
        return redirect(url_for('web.dashboard'))
    if uid == u['id']:
        flash('لا يمكنك حذف حسابك الخاص', 'danger')
        return redirect(url_for('web.users_list'))
    db.delete_user(uid, u['id'])
    flash('تم حذف المستخدم', 'success')
    return redirect(url_for('web.users_list'))


# ── Logs ──────────────────────────────────────────────────────────────────────

@web_bp.get('/logs')
@login_required
def logs_view():
    q = request.args.get('q', '')
    page = int(request.args.get('page', 1))
    paged = db.list_logs(q=q or None, page=page, limit=20)
    return render_template('logs.html', paged=paged, q=q, user=current_user())


# ── Search ────────────────────────────────────────────────────────────────────

@web_bp.get('/search')
@login_required
def search_view():
    q = request.args.get('q', '')
    results = db.search_all(q) if q else None
    return render_template('search.html', q=q, results=results,
                           user=current_user(), status_ar=STATUS_AR)
