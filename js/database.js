// Use relative path for API so it works across different hosting environments (XAMPP subfolders or Vercel root)
const API_URL = 'api.php';


// Maps JS camelCase keys to MySQL snake_case column names
const COLUMN_MAP = {
    studentId: 'student_id', teacherId: 'teacher_id', userId: 'user_id',
    className: 'class_name', classId: 'class_id', departmentId: 'department_id',
    guardianName: 'guardian_name', guardianPhone: 'guardian_phone',
    amountPaid: 'amount_paid', receiptNo: 'receipt_no', recordedBy: 'recorded_by',
    paymentMethod: 'payment_method', tuitionFee: 'tuition_fee',
    parentEmail: 'parent_email', parentPhone: 'parent_phone',
    senderName: 'sender_name', senderId: 'sender_id', senderRole: 'sender_role',
    receiverRole: 'receiver_role', teacherName: 'teacher_name',
    fileName: 'file_name', childName: 'child_name', childAge: 'child_age',
    targetClass: 'target_class', dateApplied: 'date_applied',
    studentName: 'student_name', classScore: 'class_score', examScore: 'exam_score',
    rejectionReason: 'rejection_reason', isActive: 'is_active',
    roleName: 'role_name', totalCopies: 'total_copies',
    availableCopies: 'available_copies', bookId: 'book_id',
    bookTitle: 'book_title', borrowerType: 'borrower_type',
    issueDate: 'issue_date', dueDate: 'due_date', returnDate: 'return_date',
    notificationType: 'notification_type', targetAudience: 'target_audience',
    admissionId: 'admission_id', createdAt: 'created_at',
    arrears: 'arrears'
};

// Reverse map: snake_case -> camelCase
const REVERSE_MAP = {};
Object.entries(COLUMN_MAP).forEach(([camel, snake]) => { REVERSE_MAP[snake] = camel; });

// Fields stored as JSON strings in MySQL but used as arrays in JS
const JSON_FIELDS = ['classes', 'subjects'];

// Convert a JS object's keys from camelCase to snake_case for MySQL
function toSnakeCase(obj) {
    const result = {};
    Object.entries(obj).forEach(([key, value]) => {
        const dbKey = COLUMN_MAP[key] || key;
        // Stringify arrays for JSON columns
        if (JSON_FIELDS.includes(key) && Array.isArray(value)) {
            result[dbKey] = JSON.stringify(value);
        } else {
            result[dbKey] = value;
        }
    });
    return result;
}

// Convert a MySQL row's keys from snake_case to camelCase for JS
function toCamelCase(obj) {
    const result = {};
    Object.entries(obj).forEach(([key, value]) => {
        const jsKey = REVERSE_MAP[key] || key;
        // Parse JSON array fields
        if (JSON_FIELDS.includes(jsKey) && typeof value === 'string') {
            try { result[jsKey] = JSON.parse(value); }
            catch (e) { result[jsKey] = []; }
        } else if (JSON_FIELDS.includes(jsKey) && !value) {
            result[jsKey] = [];
        } else {
            result[jsKey] = value;
        }
    });
    return result;
}

const DB = {
    cache: {},
    isInitialized: false,
    init: async function() {
        if (this.isInitialized) return;
        const tables = ['users', 'students', 'teachers', 'classes', 'departments', 'subjects', 'terms', 'admissions', 'results', 'attendance', 'announcements', 'timetables', 'payments', 'expenses', 'audit_logs', 'messages', 'learning_materials', 'library_books', 'library_issues', 'notifications'];
        
        // Initialize cache with empty arrays first
        tables.forEach(t => { if (!this.cache[t]) this.cache[t] = []; });

        try {
            const fetchPromises = tables.map(async (table) => {
                // Try loading from localStorage first to show something immediately if offline
                const localData = localStorage.getItem(`ems_cache_${table}`);
                if (localData) this.cache[table] = JSON.parse(localData);

                try {
                    const response = await fetch(`${API_URL}?action=fetch_all&table=${table}`, {
                        signal: AbortSignal.timeout(10000)
                    });
                    if (response.ok) {
                        const rawData = await response.json();
                        this.cache[table] = Array.isArray(rawData) ? rawData.map(toCamelCase) : [];
                        // Sync back to local storage for next offline use
                        localStorage.setItem(`ems_cache_${table}`, JSON.stringify(this.cache[table]));
                    }
                } catch (e) {
                    console.warn(`Failed to fetch table ${table}, using local storage fallback:`, e);
                }
            });

            await Promise.allSettled(fetchPromises);
            this.isInitialized = true;
        } catch (err) {
            console.error('Critical database initialization error:', err);
            this.isInitialized = true;
        }

    },
    getTable: function(table) { return this.cache[table] || []; },
    saveTable: async function(table, data) { this.cache[table] = data; },
    insert: async function(table, record) {
        try {
            // Convert camelCase to snake_case for MySQL
            const snakeRecord = toSnakeCase(record);
            const resp = await fetch(`${API_URL}?action=insert&table=${table}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(snakeRecord) });
            const result = await resp.json();
            if (result.success) {
                const camelData = toCamelCase(result.data);
                this.cache[table].push(camelData);
                return camelData;
            }
        } catch (err) {
            console.warn(`Insert to ${table} failed:`, err);
        }
        // Fallback for offline mode
        record.id = Math.floor(Math.random() * 100000);
        if (!this.cache[table]) this.cache[table] = [];
        this.cache[table].push(record);
        localStorage.setItem(`ems_cache_${table}`, JSON.stringify(this.cache[table]));
        return record;
    },

    update: async function(table, id, updates) {
        try {
            // Convert camelCase to snake_case for MySQL
            const snakeUpdates = toSnakeCase(updates);
            const resp = await fetch(`${API_URL}?action=update&table=${table}&id=${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(snakeUpdates) });
            const result = await resp.json();
            if (result.success) {
                const idx = this.cache[table].findIndex(item => item.id == id);
                if (idx !== -1) this.cache[table][idx] = { ...this.cache[table][idx], ...updates };
                return true;
            }
        } catch (err) {
            console.warn(`Update ${table} id=${id} failed:`, err);
        }
        // Fallback: update local cache anyway
        const idx = this.cache[table].findIndex(item => item.id == id);
        if (idx !== -1) {
            this.cache[table][idx] = { ...this.cache[table][idx], ...updates };
            localStorage.setItem(`ems_cache_${table}`, JSON.stringify(this.cache[table]));
        }
        return false;
    },

    delete: async function(table, id) {
        try {
            const resp = await fetch(`${API_URL}?action=delete&table=${table}&id=${id}`);
            const result = await resp.json();
            if (result.success) { this.cache[table] = this.cache[table].filter(item => item.id != id); return true; }
        } catch (err) {
            console.warn(`Delete ${table} id=${id} failed:`, err);
        }
        // Fallback: remove from local cache
        this.cache[table] = this.cache[table].filter(item => item.id != id);
        localStorage.setItem(`ems_cache_${table}`, JSON.stringify(this.cache[table]));
        return false;
    },

    findById: function(table, id) { return this.getTable(table).find(item => item.id == id); },
    find: function(table, query) {
        return this.getTable(table).filter(item => Object.keys(query).every(key => item[key] == query[key]));
    },
    findOne: function(table, query) { const res = this.find(table, query); return res.length > 0 ? res[0] : null; },
    login: async function(username, password) {
        try {
            const resp = await fetch(API_URL + '?action=login', {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    username: username,
                    password: password
                })
            });
            const res = await resp.json();
            if (res.success) { 
                const camelUser = toCamelCase(res.user);
                this.setCurrentUser(camelUser); 
                return { success: true, user: camelUser }; 
            } else {
                return { success: false, message: res.message || 'Login failed' };
            }
        } catch (err) {
            console.warn('Login API failed, using fallback:', err);
        }
        
        // Fallback for offline mode (keeping for dev convenience)
        if (username === 'admin' && password === 'admin123') { 
            const u = { id: 1, username: 'admin', role: 'admin', name: 'System Admin' }; 
            this.setCurrentUser(u); return { success: true, user: u }; 
        }
        if (username === 'finance' && password === 'password123') { 
            const u = { id: 2, username: 'finance', role: 'finance', name: 'School Accountant' }; 
            this.setCurrentUser(u); return { success: true, user: u }; 
        }
        
        // Search in the users table (for applicants, students, etc.)
        const users = this.getTable('users');
        const userFound = users.find(u => u.username === username);
        if (userFound) {
            if (userFound.password === password) {
                this.setCurrentUser(userFound);
                return { success: true, user: userFound };
            } else {
                return { success: false, message: 'Invalid password' };
            }
        }
        
        return { success: false, message: 'User not found' };
    },


    getCurrentUser: function() { const user = sessionStorage.getItem('ems_currentUser'); return user ? JSON.parse(user) : null; },
    setCurrentUser: function(user) { sessionStorage.setItem('ems_currentUser', JSON.stringify(user)); },
    logout: function() { sessionStorage.removeItem('ems_currentUser'); window.location.href = 'login.html'; },
    requireAuth: function(role = null) {
        const user = this.getCurrentUser();
        if (!user || (role && user.role !== role)) { window.location.href = 'login.html'; return null; }
        return user;
    },
    logAction: async function(action, details) {
        const user = this.getCurrentUser();
        const actor = user ? user.name : 'System';
        try { await fetch(`${API_URL}?action=log_action`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actor, action, details }) }); }
        catch (e) {}
    },
    generateUniqueId: function(prefix, table) {
        const recs = this.getTable(table);
        let newId, isUnique = false;
        while (!isUnique) {
            newId = prefix + Math.floor(10000 + Math.random() * 89999);
            isUnique = !recs.some(r => r.studentId === newId || r.teacherId === newId || r.student_id === newId || r.teacher_id === newId);
        }
        return newId;
    },
    calculateStudentDebt: function(student) {
        const classes = this.getTable('classes');
        const payments = this.getTable('payments');
        const cls = classes.find(c => c.id == student.classId || c.id == student.class_id || c.name == student.className);
        const tuition = cls ? parseFloat(cls.tuitionFee || cls.tuition_fee || 0) : 0;
        const totalBilled = tuition + parseFloat(student.arrears || 0);
        const sid = student.studentId || student.student_id;
        
        // Sum up ALL payments that are not 'Failed' or 'Cancelled'
        const validStatuses = ['Paid', 'Partial', 'success', 'Approved'];
        const totalPaid = payments
            .filter(p => (p.studentId == sid || p.student_id == sid) && validStatuses.includes(p.status))
            .reduce((sum, p) => sum + parseFloat(p.amountPaid || p.amount_paid || 0), 0);
            
        return Math.max(0, totalBilled - totalPaid);
    },

    getWardByParent: function(parent) { return this.getTable('students').find(s => s.parentPhone === parent.username || s.parentEmail === parent.username || s.guardianPhone === parent.username || s.parent_phone === parent.username || s.parent_email === parent.username || s.guardian_phone === parent.username); },
    showToast: function(message, type = 'success') {
        let toast = document.querySelector('.toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'toast';
            document.body.appendChild(toast);
        }
        toast.className = 'toast show toast-' + type;
        toast.innerHTML = (type === 'success' ? '<i class="fas fa-check-circle"></i> ' : '<i class="fas fa-exclamation-circle"></i> ') + message;
        setTimeout(() => { toast.classList.remove('show'); }, 3000);
    }
};
