const API_URL = 'api.php';
const DB = {
    cache: {},
    isInitialized: false,
    init: async function() {
        const tables = ['users', 'students', 'teachers', 'classes', 'departments', 'subjects', 'terms', 'admissions', 'results', 'attendance', 'announcements', 'timetables', 'payments', 'expenses', 'audit_logs', 'messages', 'learning_materials', 'library_books', 'library_issues'];
        try {
            for (const table of tables) {
                const response = await fetch(`${API_URL}?action=fetch_all&table=${table}`);
                this.cache[table] = await response.json();
            }
            this.isInitialized = true;
        } catch (err) { tables.forEach(t => this.cache[t] = []); }
    },
    getTable: function(table) { return this.cache[table] || []; },
    saveTable: async function(table, data) { this.cache[table] = data; },
    insert: async function(table, record) {
        try {
            const resp = await fetch(`${API_URL}?action=insert&table=${table}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(record) });
            const result = await resp.json();
            if (result.success) { this.cache[table].push(result.data); return result.data; }
        } catch (err) {}
        return null;
    },
    update: async function(table, id, updates) {
        try {
            const resp = await fetch(`${API_URL}?action=update&table=${table}&id=${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) });
            const result = await resp.json();
            if (result.success) {
                const idx = this.cache[table].findIndex(item => item.id == id);
                if (idx !== -1) this.cache[table][idx] = { ...this.cache[table][idx], ...updates };
                return true;
            }
        } catch (err) {}
        return false;
    },
    delete: async function(table, id) {
        try {
            const resp = await fetch(`${API_URL}?action=delete&table=${table}&id=${id}`);
            const result = await resp.json();
            if (result.success) { this.cache[table] = this.cache[table].filter(item => item.id != id); return true; }
        } catch (err) {}
        return false;
    },
    findById: function(table, id) { return this.getTable(table).find(item => item.id == id); },
    find: function(table, query) {
        return this.getTable(table).filter(item => Object.keys(query).every(key => item[key] == query[key]));
    },
    findOne: function(table, query) { const res = this.find(table, query); return res.length > 0 ? res[0] : null; },
    login: async function(username, password) {
        try {
            const resp = await fetch(`${API_URL}?action=login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
            const res = await resp.json();
            if (res.success) { this.setCurrentUser(res.user); return res.user; }
        } catch (err) {}
        return null;
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
            isUnique = !recs.some(r => r.student_id === newId || r.teacher_id === newId || r.studentId === newId || r.teacherId === newId);
        }
        return newId;
    },
    calculateStudentDebt: function(student) {
        const classes = this.getTable('classes');
        const payments = this.getTable('payments');
        const cls = classes.find(c => c.id == student.class_id || c.name == student.className);
        const tuition = cls ? parseFloat(cls.tuitionFee || 0) : 0;
        const totalBilled = tuition + parseFloat(student.arrears || 0);
        const totalPaid = payments.filter(p => (p.studentId == student.studentId || p.student_id == student.student_id) && (p.status === 'success' || p.status === 'Paid')).reduce((sum, p) => sum + parseFloat(p.amountPaid || p.amount_paid || 0), 0);
        return Math.max(0, totalBilled - totalPaid);
    },
    getWardByParent: function(parent) { return this.getTable('students').find(s => s.parent_phone === parent.username || s.parent_email === parent.username || s.guardian_phone === parent.username); }
};
