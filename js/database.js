// database.js
const DB_PREFIX = 'ems_';

const DB = {
    init: function() {
        const tables = [
            'users', 
            'students', 
            'teachers', 
            'classes', 
            'subjects', 
            'admissions', 
            'results', 
            'attendance', 
            'announcements', 
            'timetables', 
            'payments',
            'audit_logs'
        ];

        tables.forEach(table => {
            if (!localStorage.getItem(DB_PREFIX + table)) {
                localStorage.setItem(DB_PREFIX + table, JSON.stringify([]));
            }
        });

        // Initialize default admin if no users exist
        const users = this.getTable('users');
        if (users.length === 0) {
            this.insert('users', {
                username: 'admin',
                password: 'password', // In a real app this should be hashed
                role: 'admin',
                name: 'System Administrator',
                status: 'active'
            });
            
            // Add some default classes
            const defaultClasses = [
                'Crèche', 'Nursery 1', 'Nursery 2', 'KG 1', 'KG 2', 
                'Basic 1', 'Basic 2', 'Basic 3', 'Basic 4', 'Basic 5', 'Basic 6',
                'JHS 1', 'JHS 2', 'JHS 3'
            ];
            
            defaultClasses.forEach(className => {
                this.insert('classes', { name: className });
            });
        }
    },

    getTable: function(table) {
        return JSON.parse(localStorage.getItem(DB_PREFIX + table) || '[]');
    },

    saveTable: function(table, data) {
        localStorage.setItem(DB_PREFIX + table, JSON.stringify(data));
    },

    insert: function(table, record) {
        const data = this.getTable(table);
        record.id = Date.now().toString() + Math.floor(Math.random() * 1000).toString();
        record.createdAt = new Date().toISOString();
        data.push(record);
        this.saveTable(table, data);
        return record;
    },

    update: function(table, id, updates) {
        const data = this.getTable(table);
        const index = data.findIndex(item => item.id === id);
        if (index !== -1) {
            data[index] = { ...data[index], ...updates, updatedAt: new Date().toISOString() };
            this.saveTable(table, data);
            return data[index];
        }
        return null;
    },

    delete: function(table, id) {
        const data = this.getTable(table);
        const filtered = data.filter(item => item.id !== id);
        this.saveTable(table, filtered);
        return data.length !== filtered.length;
    },

    findById: function(table, id) {
        return this.getTable(table).find(item => item.id === id);
    },

    find: function(table, query) {
        const data = this.getTable(table);
        return data.filter(item => {
            return Object.keys(query).every(key => item[key] === query[key]);
        });
    },

    findOne: function(table, query) {
        const results = this.find(table, query);
        return results.length > 0 ? results[0] : null;
    },
    
    // Auth specific methods
    login: function(username, password) {
        const user = this.findOne('users', { username: username, password: password });
        if (user && user.status !== 'inactive') {
            this.setCurrentUser(user);
            return user;
        }
        return null;
    },
    
    // Get logged in user
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

    // Audit Logger
    logAction: function(action, details) {
        const user = this.getCurrentUser();
        this.insert('audit_logs', {
            action: action,
            details: details,
            actor: user ? user.name : 'System',
            timestamp: new Date().toISOString()
        });
    }
};

// Initialize the database on load
DB.init();

// Export the DB object globally
window.DB = DB;
