

const API_URL = 'api.php';

const DB = {
    cache: {},
    isInitialized: false,

    init: async function() {
        const tables = [
            'users', 'students', 'teachers', 'classes', 'departments', 'subjects', 'terms', 'admissions', 
            'results', 'attendance', 'announcements', 'timetables', 'payments', 'expenses', 
            'audit_logs', 'messages', 'learning_materials', 'library_books', 'library_issues'
        ];

        try {
            
            for (const table of tables) {
                const response = await fetch(`${API_URL}?action=fetch_all&table=${table}`);
                this.cache[table] = await response.json();
            }
            this.isInitialized = true;
            console.log("DB Initialized from Server Cache");
        } catch (err) {
            console.error("Failed to initialize DB from server:", err);
            
            tables.forEach(t => this.cache[t] = []);
        }
    },

    getTable: function(table) {
        return this.cache[table] || [];
    },

    saveTable: async function(table, data) {
        this.cache[table] = data;

    },

    insert: async function(table, record) {
        try {
            const response = await fetch(`${API_URL}?action=insert&table=${table}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(record)
            });
            const result = await response.json();
            if (result.success) {
                const newRecord = result.data;
                this.cache[table].push(newRecord);
                return newRecord;
            }
        } catch (err) {
            console.error("Insert failed:", err);
        }
        return null;
    },

    update: async function(table, id, updates) {
        try {
            const response = await fetch(`${API_URL}?action=update&table=${table}&id=${id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            const result = await response.json();
            if (result.success) {
                const index = this.cache[table].findIndex(item => item.id == id);
                if (index !== -1) {
                    this.cache[table][index] = { ...this.cache[table][index], ...updates };
                }
                return true;
            }
        } catch (err) {
            console.error("Update failed:", err);
        }
        return false;
    },

    delete: async function(table, id) {
        try {
            const response = await fetch(`${API_URL}?action=delete&table=${table}&id=${id}`);
            const result = await response.json();
            if (result.success) {
                this.cache[table] = this.cache[table].filter(item => item.id != id);
                return true;
            }
        } catch (err) {
            console.error("Delete failed:", err);
        }
        return false;
    },

    findById: function(table, id) {
        return this.getTable(table).find(item => item.id == id);
    },

    find: function(table, query) {
        const data = this.getTable(table);
        return data.filter(item => {
            return Object.keys(query).every(key => item[key] == query[key]);
        });
    },

    findOne: function(table, query) {
        const results = this.find(table, query);
        return results.length > 0 ? results[0] : null;
    },

    login: async function(username, password) {
        try {
            const response = await fetch(`${API_URL}?action=login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const result = await response.json();
            if (result.success) {
                this.setCurrentUser(result.user);
                return result.user;
            }
        } catch (err) {
            console.error("Login failed:", err);
        }
        return null;
    },

    getCurrentUser: function() {
        const user = sessionStorage.getItem('ems_currentUser');
        return user ? JSON.parse(user) : null;
    },

    setCurrentUser: function(user) {
        sessionStorage.setItem('ems_currentUser', JSON.stringify(user));
    },

    logout: function() {
        sessionStorage.removeItem('ems_currentUser');
        window.location.href = 'login.html';
    },

    requireAuth: function(requiredRole = null) {
        const user = this.getCurrentUser();
        if (!user) {
            window.location.href = 'login.html';
            return null;
        }
        if (requiredRole && user.role !== requiredRole) {
            window.location.href = 'login.html';
            return null;
        }
        return user;
    },

    logAction: async function(action, details) {
        const user = this.getCurrentUser();
        const actor = user ? user.name : 'System';
        try {
            await fetch(`${API_URL}?action=log_action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ actor, action, details })
            });
        } catch (e) {}
    },

    generateUniqueId: function(prefix, table) {
        const records = this.getTable(table);
        let newId;
        let isUnique = false;
        while (!isUnique) {
            
            newId = prefix + Math.floor(10000 + Math.random() * 89999);
            
            isUnique = !records.some(r => 
                r.student_id === newId || 
                r.teacher_id === newId || 
                r.studentId === newId || 
                r.teacherId === newId
            );
        }
        return newId;
    }
};
