"""PostgreSQL database layer — replaces in-memory data store."""
import os
import uuid
from datetime import datetime, timezone, timedelta, date
from contextlib import contextmanager
import psycopg2
import psycopg2.pool
import psycopg2.extras
from werkzeug.security import generate_password_hash

_pool = None

def _get_pool():
    global _pool
    if _pool is None:
        url = os.environ.get('DATABASE_URL')
        if not url:
            raise RuntimeError(
                "DATABASE_URL غير موجود. "
                "في Railway: افتح المشروع ← + New ← Database ← Add PostgreSQL، "
                "ثم تأكد أن الخدمتين في نفس المشروع حتى يُحقن المتغير تلقائياً."
            )
        _pool = psycopg2.pool.ThreadedConnectionPool(
            1, 10,
            dsn=url,
            cursor_factory=psycopg2.extras.RealDictCursor,
        )
    return _pool

@contextmanager
def db_ctx():
    pool = _get_pool()
    conn = pool.getconn()
    try:
        cur = conn.cursor()
        yield conn, cur
        conn.commit()
        cur.close()
    except Exception:
        conn.rollback()
        raise
    finally:
        pool.putconn(conn)

# ── Helpers ────────────────────────────────────────────────────────────────────

def _uid():
    return str(uuid.uuid4())

def _now():
    return datetime.now(timezone.utc).isoformat()

def _to_camel(key: str) -> str:
    parts = key.split('_')
    return parts[0] + ''.join(p.title() for p in parts[1:])

def _row(row) -> dict | None:
    if row is None:
        return None
    result = {}
    for k, v in dict(row).items():
        ck = _to_camel(k)
        if hasattr(v, 'isoformat'):
            result[ck] = v.isoformat()
        else:
            result[ck] = v
    return result

def _rows(rows) -> list[dict]:
    return [_row(r) for r in rows]

def paginate(items: list, page: int = 1, limit: int = 20) -> dict:
    page = max(1, int(page))
    limit = max(1, min(int(limit), 100))
    total = len(items)
    start = (page - 1) * limit
    return {
        'data': items[start:start + limit],
        'total': total,
        'page': page,
        'limit': limit,
        'totalPages': (total + limit - 1) // limit,
    }

def _log(cur, action, user_id, entity_type, entity_id, details):
    cur.execute(
        "INSERT INTO audit_logs (id, action, user_id, entity_type, entity_id, details) VALUES (%s,%s,%s,%s,%s,%s)",
        (_uid(), action, user_id, entity_type, entity_id, details)
    )

# ── Init ───────────────────────────────────────────────────────────────────────

def init_db():
    with db_ctx() as (conn, cur):
        cur.execute("""
            CREATE TABLE IF NOT EXISTS companies (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL DEFAULT '',
                company_number TEXT DEFAULT '',
                email TEXT DEFAULT '',
                phone TEXT DEFAULT '',
                city TEXT DEFAULT '',
                address TEXT DEFAULT '',
                status TEXT DEFAULT 'active',
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
            CREATE TABLE IF NOT EXISTS workers (
                id TEXT PRIMARY KEY,
                full_name TEXT NOT NULL DEFAULT '',
                id_number TEXT DEFAULT '',
                nationality TEXT DEFAULT '',
                occupation TEXT DEFAULT '',
                phone TEXT DEFAULT '',
                email TEXT DEFAULT '',
                passport_number TEXT DEFAULT '',
                birth_date TEXT DEFAULT '',
                photo_url TEXT DEFAULT '',
                company_id TEXT,
                status TEXT DEFAULT 'active',
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
            CREATE TABLE IF NOT EXISTS permits (
                id TEXT PRIMARY KEY,
                permit_number TEXT DEFAULT '',
                worker_id TEXT,
                company_id TEXT,
                beneficiary_company_id TEXT,
                occupation TEXT DEFAULT '',
                notes TEXT DEFAULT '',
                work_location TEXT DEFAULT '',
                status TEXT DEFAULT 'pending',
                start_date TEXT DEFAULT '',
                expiry_date TEXT DEFAULT '',
                issue_date TEXT DEFAULT '',
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                full_name TEXT NOT NULL DEFAULT '',
                username TEXT UNIQUE NOT NULL,
                email TEXT DEFAULT '',
                role TEXT DEFAULT 'operator',
                status TEXT DEFAULT 'active',
                password_hash TEXT NOT NULL DEFAULT '',
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
            CREATE TABLE IF NOT EXISTS audit_logs (
                id TEXT PRIMARY KEY,
                action TEXT NOT NULL DEFAULT '',
                user_id TEXT,
                entity_type TEXT DEFAULT '',
                entity_id TEXT,
                details TEXT DEFAULT '',
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        """)
        cur.execute("SELECT COUNT(*) as c FROM users")
        if cur.fetchone()['c'] == 0:
            _seed(cur)

def _seed(cur):
    today = date.today()
    def dago(n): return (today - timedelta(days=n)).strftime('%Y-%m-%d')
    def dfrom(n): return (today + timedelta(days=n)).strftime('%Y-%m-%d')

    c1, c2, c3 = _uid(), _uid(), _uid()
    for cid, name, cnum, email, phone, status, city, addr in [
        (c1, 'شركة مروه بداح الحرشان', '2-4015519', 'info@elite-co.sa', '0112345678', 'active', 'مكة المكرمة', 'حي الخنساء'),
        (c2, 'شركة التخطيط والاعمار للمقاولات العامة', '6-1976381', 'contact@alfajr.sa', '0123456789', 'active', 'مكة المكرمة', 'حي النزهة'),
        (c3, 'شركة الأمل للخدمات', 'CR-1003', 'hr@amal-services.sa', '0134567890', 'suspended', 'الدمام', 'حي الشاطئ'),
    ]:
        cur.execute(
            "INSERT INTO companies (id, name, company_number, email, phone, status, city, address) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
            (cid, name, cnum, email, phone, status, city, addr)
        )

    w1, w2, w3, w4, w5 = _uid(), _uid(), _uid(), _uid(), _uid()
    for wid, fn, idn, nat, occ, ph, em, pp, bd, cid, st in [
        (w1, 'محمد عبدالباري محمد عبده الحميدي', '2603245131', 'يمني', 'عامل تحميل وتنزيل', '0501234567', 'mohammed@email.com', 'A12345678', '1990-03-15', c1, 'active'),
        (w2, 'عبدالله حسن إبراهيم', 'ID-002-2024', 'سوداني', 'فني كهرباء', '0509876543', 'abdullah@email.com', 'B98765432', '1988-07-22', c1, 'active'),
        (w3, 'خالد محمود يوسف', 'ID-003-2024', 'يمني', 'عامل بناء', '0551234567', 'khaled@email.com', 'C11223344', '1995-11-08', c2, 'active'),
        (w4, 'أحمد سعيد ناصر', 'ID-004-2024', 'أردني', 'محاسب', '0561234567', 'ahmed@email.com', 'D55667788', '1985-01-30', c2, 'suspended'),
        (w5, 'علي عمر الشيخ', 'ID-005-2024', 'باكستاني', 'سائق', '0571234567', 'ali@email.com', 'E99001122', '1992-06-14', c3, 'active'),
    ]:
        cur.execute(
            "INSERT INTO workers (id, full_name, id_number, nationality, occupation, phone, email, passport_number, birth_date, company_id, status) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
            (wid, fn, idn, nat, occ, ph, em, pp, bd, cid, st)
        )

    for pid, pnum, wid, cid, bcid, occ, notes, loc, st, sd, ed, isd in [
        (_uid(), 'TQ6129122', w1, c1, c2, 'عامل تحميل وتنزيل', 'توريد عمالة ماهرة', '7843 ربيع ذاخر، الخنساء، مكة المكرمة', 'active', dago(28), dfrom(2), dago(28)),
        (_uid(), 'TQ6129123', w2, c1, c2, 'فني كهرباء', 'أعمال صيانة كهربائية', 'جدة، حي الروضة', 'active', dago(60), dfrom(20), dago(60)),
        (_uid(), 'TQ6129124', w3, c2, c3, 'عامل بناء', 'أعمال بناء وتشييد', 'الدمام، المنطقة الصناعية', 'pending', dfrom(5), dfrom(370), today.strftime('%Y-%m-%d')),
        (_uid(), 'TQ6129125', w4, c2, c1, 'محاسب', 'خدمات محاسبية وإدارية', 'الرياض، حي المروج', 'expired', dago(400), dago(35), dago(400)),
        (_uid(), 'TQ6129126', w5, c3, c1, 'سائق', 'خدمات نقل وتوصيل', 'جدة، طريق الملك عبدالعزيز', 'active', dago(10), dfrom(12), dago(10)),
    ]:
        cur.execute(
            "INSERT INTO permits (id, permit_number, worker_id, company_id, beneficiary_company_id, occupation, notes, work_location, status, start_date, expiry_date, issue_date) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
            (pid, pnum, wid, cid, bcid, occ, notes, loc, st, sd, ed, isd)
        )

    admin_id = _uid()
    for uid, fn, uname, em, role, pw in [
        (admin_id, 'مدير النظام', 'admin', 'admin@ajar.sa', 'admin', 'admin123'),
        (_uid(), 'مشرف العمليات', 'manager1', 'manager@ajar.sa', 'manager', 'manager123'),
        (_uid(), 'مشغل البيانات', 'operator1', 'operator@ajar.sa', 'operator', 'operator123'),
    ]:
        cur.execute(
            "INSERT INTO users (id, full_name, username, email, role, status, password_hash) VALUES (%s,%s,%s,%s,%s,%s,%s)",
            (uid, fn, uname, em, role, 'active', generate_password_hash(pw))
        )
    _log(cur, 'إعداد النظام', admin_id, 'system', None, 'تم تهيئة قاعدة البيانات والبيانات الأولية')

# ── Sessions ───────────────────────────────────────────────────────────────────

def create_session(user_id: str) -> str:
    token = _uid()
    with db_ctx() as (conn, cur):
        cur.execute("INSERT INTO sessions (token, user_id) VALUES (%s,%s)", (token, user_id))
    return token

def delete_session(token: str):
    with db_ctx() as (conn, cur):
        cur.execute("DELETE FROM sessions WHERE token = %s", (token,))

def get_user_by_token(token: str) -> dict | None:
    if not token:
        return None
    with db_ctx() as (conn, cur):
        cur.execute(
            "SELECT u.* FROM users u JOIN sessions s ON u.id = s.user_id WHERE s.token = %s",
            (token,)
        )
        return _row(cur.fetchone())

# ── Users ─────────────────────────────────────────────────────────────────────

def get_user_by_credentials(username: str, password: str) -> dict | None:
    from werkzeug.security import check_password_hash
    with db_ctx() as (conn, cur):
        cur.execute("SELECT * FROM users WHERE username = %s", (username,))
        row = cur.fetchone()
    if not row:
        return None
    if not check_password_hash(row['password_hash'], password):
        return None
    u = _row(row)
    u.pop('passwordHash', None)
    return u

def list_users():
    with db_ctx() as (conn, cur):
        cur.execute("SELECT * FROM users ORDER BY created_at")
        rows = _rows(cur.fetchall())
    for r in rows:
        r.pop('passwordHash', None)
    return rows

def get_user(uid: str) -> dict | None:
    with db_ctx() as (conn, cur):
        cur.execute("SELECT * FROM users WHERE id = %s", (uid,))
        r = _row(cur.fetchone())
    if r:
        r.pop('passwordHash', None)
    return r

def create_user(data: dict, actor_id: str) -> dict | None:
    uid = _uid()
    with db_ctx() as (conn, cur):
        cur.execute("SELECT id FROM users WHERE username = %s", (data.get('username',''),))
        if cur.fetchone():
            return None  # username taken
        cur.execute(
            "INSERT INTO users (id, full_name, username, email, role, status, password_hash) VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING *",
            (uid, data.get('fullName',''), data.get('username',''), data.get('email',''),
             data.get('role','operator'), data.get('status','active'),
             generate_password_hash(data.get('password','123456')))
        )
        u = _row(cur.fetchone())
        _log(cur, 'إضافة مستخدم', actor_id, 'user', uid, f'تم إضافة المستخدم {u["username"]}')
    u.pop('passwordHash', None)
    return u

def update_user(uid: str, data: dict, actor_id: str) -> dict | None:
    from werkzeug.security import generate_password_hash
    with db_ctx() as (conn, cur):
        if data.get('password'):
            cur.execute(
                "UPDATE users SET full_name=COALESCE(%s,full_name), email=COALESCE(%s,email), role=COALESCE(%s,role), status=COALESCE(%s,status), password_hash=%s, updated_at=NOW() WHERE id=%s RETURNING *",
                (data.get('fullName'), data.get('email'), data.get('role'), data.get('status'),
                 generate_password_hash(data['password']), uid)
            )
        else:
            cur.execute(
                "UPDATE users SET full_name=COALESCE(%s,full_name), email=COALESCE(%s,email), role=COALESCE(%s,role), status=COALESCE(%s,status), updated_at=NOW() WHERE id=%s RETURNING *",
                (data.get('fullName'), data.get('email'), data.get('role'), data.get('status'), uid)
            )
        u = _row(cur.fetchone())
        if u:
            _log(cur, 'تعديل مستخدم', actor_id, 'user', uid, f'تم تعديل المستخدم {u["username"]}')
    if u:
        u.pop('passwordHash', None)
    return u

def delete_user(uid: str, actor_id: str) -> bool:
    with db_ctx() as (conn, cur):
        cur.execute("SELECT username FROM users WHERE id = %s", (uid,))
        row = cur.fetchone()
        if not row:
            return False
        cur.execute("DELETE FROM sessions WHERE user_id = %s", (uid,))
        cur.execute("DELETE FROM users WHERE id = %s", (uid,))
        _log(cur, 'حذف مستخدم', actor_id, 'user', uid, f'تم حذف المستخدم {row["username"]}')
    return True

# ── Companies ─────────────────────────────────────────────────────────────────

def list_companies(q=None, status=None, page=1, limit=20):
    with db_ctx() as (conn, cur):
        sql = "SELECT * FROM companies WHERE 1=1"
        params = []
        if q:
            sql += " AND LOWER(name) LIKE %s"
            params.append(f'%{q.lower()}%')
        if status:
            sql += " AND status = %s"
            params.append(status)
        sql += " ORDER BY created_at DESC"
        cur.execute(sql, params)
        rows = _rows(cur.fetchall())
    return paginate(rows, page, limit)

def get_company(cid: str) -> dict | None:
    with db_ctx() as (conn, cur):
        cur.execute("SELECT * FROM companies WHERE id = %s", (cid,))
        return _row(cur.fetchone())

def create_company(data: dict, actor_id: str) -> dict:
    cid = _uid()
    with db_ctx() as (conn, cur):
        cur.execute(
            "INSERT INTO companies (id, name, company_number, email, phone, city, address, status) VALUES (%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *",
            (cid, data.get('name',''), data.get('companyNumber',''), data.get('email',''),
             data.get('phone',''), data.get('city',''), data.get('address',''), data.get('status','active'))
        )
        c = _row(cur.fetchone())
        _log(cur, 'إضافة شركة', actor_id, 'company', cid, f'تم إضافة الشركة {c["name"]}')
    return c

def update_company(cid: str, data: dict, actor_id: str) -> dict | None:
    with db_ctx() as (conn, cur):
        cur.execute(
            """UPDATE companies SET
               name=COALESCE(%s,name), company_number=COALESCE(%s,company_number),
               email=COALESCE(%s,email), phone=COALESCE(%s,phone),
               city=COALESCE(%s,city), address=COALESCE(%s,address),
               status=COALESCE(%s,status), updated_at=NOW()
               WHERE id=%s RETURNING *""",
            (data.get('name'), data.get('companyNumber'), data.get('email'),
             data.get('phone'), data.get('city'), data.get('address'),
             data.get('status'), cid)
        )
        c = _row(cur.fetchone())
        if c:
            _log(cur, 'تعديل شركة', actor_id, 'company', cid, f'تم تعديل الشركة {c["name"]}')
    return c

def delete_company(cid: str, actor_id: str) -> bool:
    with db_ctx() as (conn, cur):
        cur.execute("SELECT name FROM companies WHERE id = %s", (cid,))
        row = cur.fetchone()
        if not row:
            return False
        cur.execute("DELETE FROM companies WHERE id = %s", (cid,))
        _log(cur, 'حذف شركة', actor_id, 'company', cid, f'تم حذف الشركة {row["name"]}')
    return True

# ── Workers ───────────────────────────────────────────────────────────────────

def list_workers(q=None, status=None, company_id=None, page=1, limit=20):
    with db_ctx() as (conn, cur):
        sql = "SELECT * FROM workers WHERE 1=1"
        params = []
        if q:
            sql += " AND (LOWER(full_name) LIKE %s OR LOWER(id_number) LIKE %s)"
            params += [f'%{q.lower()}%', f'%{q.lower()}%']
        if status:
            sql += " AND status = %s"
            params.append(status)
        if company_id:
            sql += " AND company_id = %s"
            params.append(company_id)
        sql += " ORDER BY created_at DESC"
        cur.execute(sql, params)
        rows = _rows(cur.fetchall())
    return paginate(rows, page, limit)

def get_worker(wid: str) -> dict | None:
    with db_ctx() as (conn, cur):
        cur.execute("SELECT * FROM workers WHERE id = %s", (wid,))
        return _row(cur.fetchone())

def create_worker(data: dict, actor_id: str) -> dict:
    wid = _uid()
    with db_ctx() as (conn, cur):
        cur.execute(
            "INSERT INTO workers (id, full_name, id_number, nationality, occupation, phone, email, passport_number, birth_date, photo_url, company_id, status) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *",
            (wid, data.get('fullName',''), data.get('idNumber',''), data.get('nationality',''),
             data.get('occupation',''), data.get('phone',''), data.get('email',''),
             data.get('passportNumber',''), data.get('birthDate',''), data.get('photoUrl',''),
             data.get('companyId'), data.get('status','active'))
        )
        w = _row(cur.fetchone())
        _log(cur, 'إضافة عامل', actor_id, 'worker', wid, f'تم إضافة العامل {w["fullName"]}')
    return w

def update_worker(wid: str, data: dict, actor_id: str) -> dict | None:
    with db_ctx() as (conn, cur):
        cur.execute(
            """UPDATE workers SET
               full_name=COALESCE(%s,full_name), id_number=COALESCE(%s,id_number),
               nationality=COALESCE(%s,nationality), occupation=COALESCE(%s,occupation),
               phone=COALESCE(%s,phone), email=COALESCE(%s,email),
               passport_number=COALESCE(%s,passport_number), birth_date=COALESCE(%s,birth_date),
               photo_url=COALESCE(%s,photo_url), company_id=COALESCE(%s,company_id),
               status=COALESCE(%s,status), updated_at=NOW()
               WHERE id=%s RETURNING *""",
            (data.get('fullName'), data.get('idNumber'), data.get('nationality'),
             data.get('occupation'), data.get('phone'), data.get('email'),
             data.get('passportNumber'), data.get('birthDate'), data.get('photoUrl'),
             data.get('companyId'), data.get('status'), wid)
        )
        w = _row(cur.fetchone())
        if w:
            _log(cur, 'تعديل عامل', actor_id, 'worker', wid, f'تم تعديل العامل {w["fullName"]}')
    return w

def delete_worker(wid: str, actor_id: str) -> bool:
    with db_ctx() as (conn, cur):
        cur.execute("SELECT full_name FROM workers WHERE id = %s", (wid,))
        row = cur.fetchone()
        if not row:
            return False
        cur.execute("DELETE FROM workers WHERE id = %s", (wid,))
        _log(cur, 'حذف عامل', actor_id, 'worker', wid, f'تم حذف العامل {row["full_name"]}')
    return True

# ── Permits ───────────────────────────────────────────────────────────────────

def _permit_query(where='', params=None, order='ORDER BY p.created_at DESC'):
    sql = f"""
        SELECT p.*,
            w.full_name   AS w_full_name,   w.id_number AS w_id_number,
            w.nationality AS w_nationality, w.occupation AS w_occupation,
            w.phone AS w_phone,             w.email AS w_email,
            w.passport_number AS w_passport_number, w.birth_date AS w_birth_date,
            w.photo_url AS w_photo_url,     w.company_id AS w_company_id,
            w.status AS w_status,
            cp.name AS cp_name,             cp.company_number AS cp_company_number,
            cp.email AS cp_email,           cp.phone AS cp_phone,
            cp.city AS cp_city,             cp.address AS cp_address,
            cp.status AS cp_status,
            cb.name AS cb_name,             cb.company_number AS cb_company_number,
            cb.email AS cb_email,           cb.phone AS cb_phone,
            cb.city AS cb_city,             cb.status AS cb_status
        FROM permits p
        LEFT JOIN workers   w  ON p.worker_id               = w.id
        LEFT JOIN companies cp ON p.company_id               = cp.id
        LEFT JOIN companies cb ON p.beneficiary_company_id   = cb.id
        {where} {order}
    """
    return sql, (params or [])

def _flat_to_permit(row) -> dict:
    if row is None:
        return None
    d = dict(row)
    # Build nested worker dict
    worker = None
    if d.get('worker_id'):
        worker = {
            'id': d['worker_id'],
            'fullName': d.get('w_full_name',''),
            'idNumber': d.get('w_id_number',''),
            'nationality': d.get('w_nationality',''),
            'occupation': d.get('w_occupation',''),
            'phone': d.get('w_phone',''),
            'email': d.get('w_email',''),
            'passportNumber': d.get('w_passport_number',''),
            'birthDate': d.get('w_birth_date',''),
            'photoUrl': d.get('w_photo_url',''),
            'companyId': d.get('w_company_id',''),
            'status': d.get('w_status',''),
        }
    provider = None
    if d.get('company_id'):
        provider = {
            'id': d['company_id'],
            'name': d.get('cp_name',''),
            'companyNumber': d.get('cp_company_number',''),
            'email': d.get('cp_email',''),
            'phone': d.get('cp_phone',''),
            'city': d.get('cp_city',''),
            'address': d.get('cp_address',''),
            'status': d.get('cp_status',''),
        }
    beneficiary = None
    if d.get('beneficiary_company_id'):
        beneficiary = {
            'id': d['beneficiary_company_id'],
            'name': d.get('cb_name',''),
            'companyNumber': d.get('cb_company_number',''),
            'email': d.get('cb_email',''),
            'phone': d.get('cb_phone',''),
            'city': d.get('cb_city',''),
            'status': d.get('cb_status',''),
        }
    # Core permit fields (snake_case → camelCase)
    permit_keys = ['id','permit_number','worker_id','company_id','beneficiary_company_id',
                   'occupation','notes','work_location','status','start_date','expiry_date',
                   'issue_date','created_at','updated_at']
    p = {}
    for k in permit_keys:
        if k in d:
            v = d[k]
            ck = _to_camel(k)
            p[ck] = v.isoformat() if hasattr(v, 'isoformat') else v
    p['workerName'] = worker['fullName'] if worker else ''
    p['companyName'] = provider['name'] if provider else ''
    p['worker'] = worker
    p['providerCompany'] = provider
    p['beneficiaryCompany'] = beneficiary
    p['contractDescription'] = p.get('notes') or p.get('occupation','')
    return p

def list_permits(q=None, status=None, company_id=None, worker_id=None, page=1, limit=20):
    conditions, params = [], []
    if q:
        conditions.append("(LOWER(p.permit_number) LIKE %s OR LOWER(w.full_name) LIKE %s)")
        params += [f'%{q.lower()}%', f'%{q.lower()}%']
    if status:
        conditions.append("p.status = %s")
        params.append(status)
    if company_id:
        conditions.append("p.company_id = %s")
        params.append(company_id)
    if worker_id:
        conditions.append("p.worker_id = %s")
        params.append(worker_id)
    where = ('WHERE ' + ' AND '.join(conditions)) if conditions else ''
    sql, params = _permit_query(where, params)
    with db_ctx() as (conn, cur):
        cur.execute(sql, params)
        rows = [_flat_to_permit(r) for r in cur.fetchall()]
    return paginate(rows, page, limit)

def get_permit(pid: str) -> dict | None:
    sql2 = f"""
        SELECT p.*,
            w.full_name AS w_full_name, w.id_number AS w_id_number,
            w.nationality AS w_nationality, w.occupation AS w_occupation,
            w.phone AS w_phone, w.email AS w_email,
            w.passport_number AS w_passport_number, w.birth_date AS w_birth_date,
            w.photo_url AS w_photo_url, w.company_id AS w_company_id, w.status AS w_status,
            cp.name AS cp_name, cp.company_number AS cp_company_number,
            cp.email AS cp_email, cp.phone AS cp_phone, cp.city AS cp_city,
            cp.address AS cp_address, cp.status AS cp_status,
            cb.name AS cb_name, cb.company_number AS cb_company_number,
            cb.email AS cb_email, cb.phone AS cb_phone, cb.city AS cb_city, cb.status AS cb_status
        FROM permits p
        LEFT JOIN workers   w  ON p.worker_id             = w.id
        LEFT JOIN companies cp ON p.company_id             = cp.id
        LEFT JOIN companies cb ON p.beneficiary_company_id = cb.id
        WHERE p.id = %s
    """
    with db_ctx() as (conn, cur):
        cur.execute(sql2, (pid,))
        return _flat_to_permit(cur.fetchone())

def create_permit(data: dict, actor_id: str) -> dict:
    pid = _uid()
    pnum = data.get('permitNumber') or f'TQ{str(uuid.uuid4().int)[:7]}'
    with db_ctx() as (conn, cur):
        cur.execute(
            "INSERT INTO permits (id, permit_number, worker_id, company_id, beneficiary_company_id, occupation, notes, work_location, status, start_date, expiry_date, issue_date) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
            (pid, pnum, data.get('workerId'), data.get('companyId'), data.get('beneficiaryCompanyId'),
             data.get('occupation',''), data.get('notes',''), data.get('workLocation',''),
             data.get('status','pending'), data.get('startDate',''), data.get('expiryDate',''),
             data.get('issueDate', date.today().strftime('%Y-%m-%d')))
        )
        _log(cur, 'إنشاء تصريح', actor_id, 'permit', pid, f'تم إنشاء التصريح {pnum}')
    return get_permit(pid)

def update_permit(pid: str, data: dict, actor_id: str) -> dict | None:
    with db_ctx() as (conn, cur):
        cur.execute(
            """UPDATE permits SET
               permit_number=COALESCE(%s,permit_number),
               worker_id=COALESCE(%s,worker_id), company_id=COALESCE(%s,company_id),
               beneficiary_company_id=COALESCE(%s,beneficiary_company_id),
               occupation=COALESCE(%s,occupation), notes=COALESCE(%s,notes),
               work_location=COALESCE(%s,work_location), status=COALESCE(%s,status),
               start_date=COALESCE(%s,start_date), expiry_date=COALESCE(%s,expiry_date),
               issue_date=COALESCE(%s,issue_date), updated_at=NOW()
               WHERE id=%s""",
            (data.get('permitNumber'), data.get('workerId'), data.get('companyId'),
             data.get('beneficiaryCompanyId'), data.get('occupation'), data.get('notes'),
             data.get('workLocation'), data.get('status'), data.get('startDate'),
             data.get('expiryDate'), data.get('issueDate'), pid)
        )
        cur.execute("SELECT permit_number FROM permits WHERE id = %s", (pid,))
        row = cur.fetchone()
        if row:
            _log(cur, 'تعديل تصريح', actor_id, 'permit', pid, f'تم تعديل التصريح {row["permit_number"]}')
    return get_permit(pid)

def delete_permit(pid: str, actor_id: str) -> bool:
    with db_ctx() as (conn, cur):
        cur.execute("SELECT permit_number FROM permits WHERE id = %s", (pid,))
        row = cur.fetchone()
        if not row:
            return False
        cur.execute("DELETE FROM permits WHERE id = %s", (pid,))
        _log(cur, 'حذف تصريح', actor_id, 'permit', pid, f'تم حذف التصريح {row["permit_number"]}')
    return True

# ── Dashboard ─────────────────────────────────────────────────────────────────

def dashboard_stats():
    today = date.today()
    soon = (today + timedelta(days=30)).strftime('%Y-%m-%d')
    today_s = today.strftime('%Y-%m-%d')
    with db_ctx() as (conn, cur):
        cur.execute("SELECT COUNT(*) as c FROM permits")
        total = cur.fetchone()['c']
        cur.execute("SELECT COUNT(*) as c FROM permits WHERE status='active'")
        active = cur.fetchone()['c']
        cur.execute("SELECT COUNT(*) as c FROM permits WHERE status='pending'")
        pending = cur.fetchone()['c']
        cur.execute("SELECT COUNT(*) as c FROM permits WHERE status='active' AND expiry_date <= %s AND expiry_date >= %s", (soon, today_s))
        expiring = cur.fetchone()['c']
        cur.execute("SELECT COUNT(*) as c FROM workers")
        workers = cur.fetchone()['c']
        cur.execute("SELECT COUNT(*) as c FROM companies")
        companies = cur.fetchone()['c']
    return {
        'totalPermits': total, 'activePermits': active, 'pendingPermits': pending,
        'expiringPermits': expiring, 'totalWorkers': workers, 'totalCompanies': companies,
    }

def permits_by_status():
    with db_ctx() as (conn, cur):
        cur.execute("SELECT status, COUNT(*) as count FROM permits GROUP BY status")
        return [{'status': r['status'], 'count': r['count']} for r in cur.fetchall()]

def expiring_soon(days=30, limit=10):
    today = date.today()
    soon = (today + timedelta(days=days)).strftime('%Y-%m-%d')
    today_s = today.strftime('%Y-%m-%d')
    sql = """
        SELECT p.*,
            w.full_name AS w_full_name, w.id_number AS w_id_number,
            w.nationality AS w_nationality, w.occupation AS w_occupation,
            w.phone AS w_phone, w.email AS w_email,
            w.passport_number AS w_passport_number, w.birth_date AS w_birth_date,
            w.photo_url AS w_photo_url, w.company_id AS w_company_id, w.status AS w_status,
            cp.name AS cp_name, cp.company_number AS cp_company_number,
            cp.email AS cp_email, cp.phone AS cp_phone, cp.city AS cp_city,
            cp.address AS cp_address, cp.status AS cp_status,
            cb.name AS cb_name, cb.company_number AS cb_company_number,
            cb.email AS cb_email, cb.phone AS cb_phone, cb.city AS cb_city, cb.status AS cb_status
        FROM permits p
        LEFT JOIN workers   w  ON p.worker_id             = w.id
        LEFT JOIN companies cp ON p.company_id             = cp.id
        LEFT JOIN companies cb ON p.beneficiary_company_id = cb.id
        WHERE p.status = 'active' AND p.expiry_date <= %s AND p.expiry_date >= %s
        ORDER BY p.expiry_date ASC
        LIMIT %s
    """
    with db_ctx() as (conn, cur):
        cur.execute(sql, (soon, today_s, limit))
        return [_flat_to_permit(r) for r in cur.fetchall()]

def recent_activity(limit=10):
    with db_ctx() as (conn, cur):
        cur.execute(
            """SELECT l.*, u.full_name as user_name FROM audit_logs l
               LEFT JOIN users u ON l.user_id = u.id
               ORDER BY l.created_at DESC LIMIT %s""",
            (limit,)
        )
        result = []
        for r in cur.fetchall():
            d = dict(r)
            entry = {_to_camel(k): (v.isoformat() if hasattr(v, 'isoformat') else v)
                     for k, v in d.items()}
            entry['userName'] = d.get('user_name') or 'النظام'
            result.append(entry)
    return result

# ── Logs ──────────────────────────────────────────────────────────────────────

def list_logs(q=None, user_id=None, action=None, entity_type=None, page=1, limit=20):
    with db_ctx() as (conn, cur):
        sql = """SELECT l.*, u.full_name as user_name FROM audit_logs l
                 LEFT JOIN users u ON l.user_id = u.id WHERE 1=1"""
        params = []
        if q:
            sql += " AND (LOWER(l.action) LIKE %s OR LOWER(l.details) LIKE %s)"
            params += [f'%{q.lower()}%', f'%{q.lower()}%']
        if user_id:
            sql += " AND l.user_id = %s"
            params.append(user_id)
        if action:
            sql += " AND l.action LIKE %s"
            params.append(f'%{action}%')
        if entity_type:
            sql += " AND l.entity_type = %s"
            params.append(entity_type)
        sql += " ORDER BY l.created_at DESC"
        cur.execute(sql, params)
        rows = []
        for r in cur.fetchall():
            d = dict(r)
            entry = {_to_camel(k): (v.isoformat() if hasattr(v, 'isoformat') else v)
                     for k, v in d.items()}
            entry['userName'] = d.get('user_name') or 'النظام'
            rows.append(entry)
    return paginate(rows, page, limit)

# ── Search ────────────────────────────────────────────────────────────────────

def search_all(q: str):
    if not q:
        return {'permits': [], 'workers': [], 'companies': []}
    ql = f'%{q.lower()}%'
    with db_ctx() as (conn, cur):
        cur.execute(
            "SELECT * FROM companies WHERE LOWER(name) LIKE %s OR LOWER(company_number) LIKE %s LIMIT 10",
            (ql, ql)
        )
        companies = _rows(cur.fetchall())
        cur.execute(
            "SELECT * FROM workers WHERE LOWER(full_name) LIKE %s OR LOWER(id_number) LIKE %s LIMIT 10",
            (ql, ql)
        )
        workers = _rows(cur.fetchall())
        cur.execute(
            """SELECT p.permit_number, p.id, p.status, p.occupation, p.expiry_date,
                      w.full_name as worker_name
               FROM permits p LEFT JOIN workers w ON p.worker_id = w.id
               WHERE LOWER(p.permit_number) LIKE %s OR LOWER(p.occupation) LIKE %s OR LOWER(w.full_name) LIKE %s
               LIMIT 10""",
            (ql, ql, ql)
        )
        permits = []
        for r in cur.fetchall():
            d = dict(r)
            permits.append({_to_camel(k): (v.isoformat() if hasattr(v,'isoformat') else v)
                            for k, v in d.items()})
    return {'permits': permits, 'workers': workers, 'companies': companies}

# ── Direct log insert (for web routes) ────────────────────────────────────────

def add_log(action, user_id, entity_type, entity_id, details):
    with db_ctx() as (conn, cur):
        _log(cur, action, user_id, entity_type, entity_id, details)
