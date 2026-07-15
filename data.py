"""In-memory data store with seed data."""
from datetime import datetime, timedelta, timezone
import uuid


# ── helpers ────────────────────────────────────────────────────────────────────
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def days_ago(n: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(days=n)).strftime('%Y-%m-%d')

def days_from_now(n: int) -> str:
    return (datetime.now(timezone.utc) + timedelta(days=n)).strftime('%Y-%m-%d')

def new_id() -> str:
    return str(uuid.uuid4())


_ts = now_iso()

# ── Seed data ──────────────────────────────────────────────────────────────────
companies: list[dict] = [
    {'id': 'c1', 'name': 'شركة مروه بداح الحرشان', 'companyNumber': '2-4015519',
     'email': 'info@elite-co.sa', 'phone': '0112345678', 'status': 'active',
     'city': 'مكة المكرمة', 'address': 'حي الخنساء', 'createdAt': _ts, 'updatedAt': _ts},
    {'id': 'c2', 'name': 'شركة التخطيط والاعمار للمقاولات العامة', 'companyNumber': '6-1976381',
     'email': 'contact@alfajr.sa', 'phone': '0123456789', 'status': 'active',
     'city': 'مكة المكرمة', 'address': 'حي النزهة', 'createdAt': _ts, 'updatedAt': _ts},
    {'id': 'c3', 'name': 'شركة الأمل للخدمات', 'companyNumber': 'CR-1003',
     'email': 'hr@amal-services.sa', 'phone': '0134567890', 'status': 'suspended',
     'city': 'الدمام', 'address': 'حي الشاطئ، طريق الملك عبدالعزيز', 'createdAt': _ts, 'updatedAt': _ts},
]

workers: list[dict] = [
    {'id': 'w1', 'fullName': 'محمد عبدالباري محمد عبده الحميدي',
     'idNumber': '2603245131', 'nationality': 'يمني',
     'occupation': 'عامل تحميل وتنزيل', 'phone': '0501234567',
     'email': 'mohammed@email.com', 'passportNumber': 'A12345678',
     'birthDate': '1990-03-15', 'photoUrl': '',
     'companyId': 'c1', 'status': 'active', 'createdAt': _ts, 'updatedAt': _ts},
    {'id': 'w2', 'fullName': 'عبدالله حسن إبراهيم',
     'idNumber': 'ID-002-2024', 'nationality': 'سوداني',
     'occupation': 'فني كهرباء', 'phone': '0509876543',
     'email': 'abdullah@email.com', 'passportNumber': 'B98765432',
     'birthDate': '1988-07-22', 'photoUrl': '',
     'companyId': 'c1', 'status': 'active', 'createdAt': _ts, 'updatedAt': _ts},
    {'id': 'w3', 'fullName': 'خالد محمود يوسف',
     'idNumber': 'ID-003-2024', 'nationality': 'يمني',
     'occupation': 'عامل بناء', 'phone': '0551234567',
     'email': 'khaled@email.com', 'passportNumber': 'C11223344',
     'birthDate': '1995-11-08', 'photoUrl': '',
     'companyId': 'c2', 'status': 'active', 'createdAt': _ts, 'updatedAt': _ts},
    {'id': 'w4', 'fullName': 'أحمد سعيد ناصر',
     'idNumber': 'ID-004-2024', 'nationality': 'أردني',
     'occupation': 'محاسب', 'phone': '0561234567',
     'email': 'ahmed@email.com', 'passportNumber': 'D55667788',
     'birthDate': '1985-01-30', 'photoUrl': '',
     'companyId': 'c2', 'status': 'suspended', 'createdAt': _ts, 'updatedAt': _ts},
    {'id': 'w5', 'fullName': 'علي عمر الشيخ',
     'idNumber': 'ID-005-2024', 'nationality': 'باكستاني',
     'occupation': 'سائق', 'phone': '0571234567',
     'email': 'ali@email.com', 'passportNumber': 'E99001122',
     'birthDate': '1992-06-14', 'photoUrl': '',
     'companyId': 'c3', 'status': 'active', 'createdAt': _ts, 'updatedAt': _ts},
]

permits: list[dict] = [
    {'id': 'p1', 'permitNumber': 'TQ6129122',
     'workerId': 'w1', 'companyId': 'c1', 'beneficiaryCompanyId': 'c2',
     'occupation': 'عامل تحميل وتنزيل',
     'notes': 'توريد عمالة ماهرة',
     'workLocation': '7843 ربيع ذاخر، الخنساء، مكة المكرمة 24238، 2489، الخنساء، مكة 24238',
     'status': 'active',
     'startDate': '2026-06-19', 'expiryDate': '2026-07-18',
     'issueDate': days_ago(10), 'createdAt': _ts, 'updatedAt': _ts},
    {'id': 'p2', 'permitNumber': 'TQ6129123',
     'workerId': 'w2', 'companyId': 'c1', 'beneficiaryCompanyId': 'c2',
     'occupation': 'فني كهرباء', 'notes': 'أعمال صيانة كهربائية',
     'workLocation': 'جدة، حي الروضة',
     'status': 'active',
     'startDate': days_ago(60), 'expiryDate': days_from_now(20),
     'issueDate': days_ago(60), 'createdAt': _ts, 'updatedAt': _ts},
    {'id': 'p3', 'permitNumber': 'TQ6129124',
     'workerId': 'w3', 'companyId': 'c2', 'beneficiaryCompanyId': 'c3',
     'occupation': 'عامل بناء', 'notes': 'أعمال بناء وتشييد',
     'workLocation': 'الدمام، المنطقة الصناعية',
     'status': 'pending',
     'startDate': days_from_now(5), 'expiryDate': days_from_now(370),
     'issueDate': days_ago(0), 'createdAt': _ts, 'updatedAt': _ts},
    {'id': 'p4', 'permitNumber': 'TQ6129125',
     'workerId': 'w4', 'companyId': 'c2', 'beneficiaryCompanyId': 'c1',
     'occupation': 'محاسب', 'notes': 'خدمات محاسبية وإدارية',
     'workLocation': 'الرياض، حي المروج',
     'status': 'expired',
     'startDate': days_ago(400), 'expiryDate': days_ago(35),
     'issueDate': days_ago(400), 'createdAt': _ts, 'updatedAt': _ts},
    {'id': 'p5', 'permitNumber': 'TQ6129126',
     'workerId': 'w5', 'companyId': 'c3', 'beneficiaryCompanyId': 'c1',
     'occupation': 'سائق', 'notes': 'خدمات نقل وتوصيل',
     'workLocation': 'جدة، طريق الملك عبدالعزيز',
     'status': 'active',
     'startDate': days_ago(10), 'expiryDate': days_from_now(12),
     'issueDate': days_ago(10), 'createdAt': _ts, 'updatedAt': _ts},
    {'id': 'p6', 'permitNumber': 'TQ6129127',
     'workerId': 'w1', 'companyId': 'c1', 'beneficiaryCompanyId': 'c3',
     'occupation': 'مهندس مدني', 'notes': 'إشراف هندسي على المشاريع',
     'workLocation': 'مكة المكرمة، حي العزيزية',
     'status': 'rejected',
     'startDate': days_ago(5), 'expiryDate': days_from_now(360),
     'issueDate': days_ago(5), 'createdAt': _ts, 'updatedAt': _ts},
]

users: list[dict] = [
    {'id': 'u1', 'fullName': 'مدير النظام', 'username': 'admin',
     'email': 'admin@ajar.sa', 'role': 'admin', 'status': 'active',
     'password': 'admin123', 'createdAt': _ts, 'updatedAt': _ts},
    {'id': 'u2', 'fullName': 'مشرف العمليات', 'username': 'manager1',
     'email': 'manager@ajar.sa', 'role': 'manager', 'status': 'active',
     'password': 'manager123', 'createdAt': _ts, 'updatedAt': _ts},
    {'id': 'u3', 'fullName': 'مشغل البيانات', 'username': 'operator1',
     'email': 'operator@ajar.sa', 'role': 'operator', 'status': 'active',
     'password': 'operator123', 'createdAt': _ts, 'updatedAt': _ts},
]

logs: list[dict] = [
    {'id': 'l1', 'action': 'تسجيل دخول', 'userId': 'u1',
     'entityType': 'auth', 'entityId': None,
     'details': 'تم تسجيل الدخول بنجاح', 'createdAt': _ts},
]

# token → user_id
tokens: dict[str, str] = {}


# ── helpers ────────────────────────────────────────────────────────────────────
def paginate(items: list, page: int = 1, limit: int = 20) -> dict:
    page  = max(1, page)
    limit = max(1, min(limit, 100))
    total = len(items)
    start = (page - 1) * limit
    return {
        'data': items[start: start + limit],
        'total': total,
        'page': page,
        'limit': limit,
        'totalPages': (total + limit - 1) // limit,
    }

def find_by_id(collection: list, item_id: str) -> dict | None:
    return next((x for x in collection if x['id'] == item_id), None)

def enrich_permit(p: dict) -> dict:
    worker   = find_by_id(workers, p.get('workerId', ''))
    provider = find_by_id(companies, p.get('companyId', ''))
    beneficiary = find_by_id(companies, p.get('beneficiaryCompanyId', ''))
    return {
        **p,
        'workerName': worker['fullName'] if worker else '',
        'companyName': provider['name'] if provider else '',
        'worker': worker,
        'providerCompany': provider,
        'beneficiaryCompany': beneficiary,
        'contractDescription': p.get('notes') or p.get('occupation', ''),
    }
