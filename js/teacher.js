// js/teacher.js

document.addEventListener('DOMContentLoaded', () => {
    const user = DB.requireAuth('teacher');
    if (!user) return;
    
    document.getElementById('currentTeacherName').innerText = user.name || 'Teacher';
    document.getElementById('dashName').innerText = user.name || 'Teacher';

    // Get teacher record
    const teacherRec = DB.findOne('teachers', { userId: user.id });
    if(teacherRec) {
        document.getElementById('statClasses').innerText = teacherRec.classes.length;
        document.getElementById('statSubjects').innerText = teacherRec.subjects.length;
        
        // Calculate total students across classes
        const allStudents = DB.getTable('students');
        let total = 0;
        teacherRec.classes.forEach(c => {
            total += allStudents.filter(s => s.className === c || s.classId === c).length;
        });
        document.getElementById('statStudents').innerText = total;

        // Populate dropdowns
        const classSelect = document.getElementById('classSelect');
        const gradeClassSelect = document.getElementById('gradeClassSelect');
        const gradeSubjectSelect = document.getElementById('gradeSubjectSelect');
        const classListUi = document.getElementById('classList');

        teacherRec.classes.forEach(c => {
            classSelect.add(new Option(c, c));
            gradeClassSelect.add(new Option(c, c));
            const attClassSelect = document.getElementById('attClassSelect');
            if(attClassSelect) attClassSelect.add(new Option(c, c));
            const li = document.createElement('li');
            li.style.padding = '8px 0';
            li.style.borderBottom = '1px solid #eee';
            li.innerHTML = `<i class="fas fa-check-circle" style="color:var(--success)"></i> ${c}`;
            classListUi.appendChild(li);
        });

        teacherRec.subjects.forEach(s => {
            gradeSubjectSelect.add(new Option(s, s));
        });
        
        // Default subjects if empty for demo purposes
        if(teacherRec.subjects.length === 0) {
            ['Mathematics', 'English', 'Science'].forEach(s => {
                gradeSubjectSelect.add(new Option(s, s));
            });
        }
    }

    // Sidebar Navigation
    const menuItems = document.querySelectorAll('.menu-item');
    const sections = document.querySelectorAll('.section');
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('toggleSidebar');
    const overlay = document.getElementById('sidebarOverlay');

    function closeSidebar() {
        sidebar.classList.remove('show');
        if(overlay) overlay.classList.remove('active');
    }

    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            menuItems.forEach(mi => mi.classList.remove('active'));
            item.classList.add('active');
            const target = item.getAttribute('data-target');
            sections.forEach(sec => {
                if(sec.id === target) sec.classList.add('active');
                else sec.classList.remove('active');
            });
            if(window.innerWidth <= 768) closeSidebar();
            if(target === 'dashboard') loadAnnouncements();
            if(target === 'fees') {
                document.getElementById('feeResultArea').style.display = 'none';
                document.getElementById('feeNotFound').style.display = 'none';
                document.getElementById('searchFeeStudId').value = '';
            }
            if(target === 'timetable') loadTimetables();
            if(target === 'attendance') {
                document.getElementById('attDate').valueAsDate = new Date();
                loadAttendanceGrid();
            }
        });
    });

    if(toggleBtn) toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('show');
        if(overlay) overlay.classList.toggle('active');
    });

    if(overlay) overlay.addEventListener('click', closeSidebar);

    document.getElementById('searchTeacherStudent')?.addEventListener('input', () => {
        const classSelect = document.getElementById('classSelect').value;
        window.loadStudentsForClass(classSelect);
    });

    loadAnnouncements();
    
    // Quick comms form
    const msgForm = document.getElementById('msgForm');
    if(msgForm) {
        msgForm.addEventListener('submit', (e) => {
            e.preventDefault();
            alert("Message sent successfully!");
            msgForm.reset();
        });
    }
});

window.loadStudentsForClass = function(className) {
    const tbody = document.querySelector('#teacherStudentsTable tbody');
    tbody.innerHTML = '';
    if(!className) return;

    let students = DB.find('students', { className: className });
    
    const searchTerm = document.getElementById('searchTeacherStudent')?.value.toLowerCase();
    if (searchTerm) {
        students = students.filter(s => s.name.toLowerCase().includes(searchTerm) || s.studentId.toLowerCase().includes(searchTerm));
    }

    if(students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center">No students found.</td></tr>';
        return;
    }

    students.forEach(s => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${s.studentId}</strong></td>
            <td>${s.name}</td>
            <td><span class="badge badge-active">${s.status}</span></td>
            <td><button class="btn btn-primary" style="padding:4px 8px; font-size:0.8rem;" onclick="alert('Viewing student...')">View</button></td>
        `;
        tbody.appendChild(tr);
    });
}

window.loadGradeEntryGrid = function() {
    const cls = document.getElementById('gradeClassSelect').value;
    const sub = document.getElementById('gradeSubjectSelect').value;
    const term = document.getElementById('gradeTermSelect').value;

    if(!cls || !sub || !term) {
        alert("Please select Class, Subject, and Term.");
        return;
    }

    const students = DB.find('students', { className: cls });
    const tbody = document.querySelector('#gradeTable tbody');
    tbody.innerHTML = '';

    if(students.length === 0) {
        alert("No students in this class. Perhaps you need to assign some from Admin.");
        return;
    }

    document.getElementById('gradeEntryArea').style.display = 'block';

    students.forEach(s => {
        // Try to find existing grade
        let existing = DB.findOne('results', { studentId: s.studentId, subject: sub, term });
        const isPublished = existing && existing.status === 'published';
        const isSubmitted = existing && existing.status === 'submitted';
        const isRejected = existing && existing.status === 'rejected';

        let statusText = '-';
        let statusColor = '#666';
        if(isPublished) { statusText = 'Published (Approved)'; statusColor = 'var(--success)'; }
        else if(isSubmitted) { statusText = 'Pending Approval'; statusColor = 'var(--blue)'; }
        else if(isRejected) { statusText = 'Rejected (Check Remark)'; statusColor = 'var(--danger)'; }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <strong>${s.name}</strong><br><small>${s.studentId}</small>
                <input type="hidden" class="g-studId" value="${s.studentId}">
                <input type="hidden" class="g-studName" value="${s.name}">
                <div style="font-size:0.75rem; color:${statusColor}; margin-top:4px;">Status: ${statusText}</div>
            </td>
            <td><input type="number" class="form-control g-class" max="40" value="${existing ? existing.classScore : ''}" placeholder="0-40" ${isPublished ? 'disabled' : ''}></td>
            <td><input type="number" class="form-control g-exam" max="60" value="${existing ? existing.examScore : ''}" placeholder="0-60" ${isPublished ? 'disabled' : ''}></td>
            <td><span class="g-total" style="font-weight:bold; font-size:1.1rem; color:var(--blue);">${existing ? existing.total : 0}</span></td>
            <td><span class="g-grade" style="font-weight:bold; font-size:1.1rem;">${existing ? getGrade(existing.total) : '-'}</span></td>
            <td>
                <input type="text" class="form-control g-remark" value="${existing ? existing.remark : ''}" placeholder="e.g. Excellent" ${isPublished ? 'disabled' : ''}>
                ${isRejected ? `<small style="color:var(--danger); display:block; margin-top:4px;">Reason: ${existing.rejectionReason}</small>` : ''}
            </td>
        `;
        tbody.appendChild(tr);

        // Add auto-calc
        const cInp = tr.querySelector('.g-class');
        const eInp = tr.querySelector('.g-exam');
        const totalSp = tr.querySelector('.g-total');
        const gradeSp = tr.querySelector('.g-grade');
        const remarkInp = tr.querySelector('.g-remark');

        if(!isPublished) {
            const calc = () => {
                const classV = parseFloat(cInp.value) || 0;
                const examV = parseFloat(eInp.value) || 0;
                
                // Max caps
                if(classV > 40) cInp.value = 40;
                if(examV > 60) eInp.value = 60;

                const t = (parseFloat(cInp.value)||0) + (parseFloat(eInp.value)||0);
                totalSp.innerText = t;
                const grade = getGrade(t);
                gradeSp.innerText = grade;
                gradeSp.style.color = grade === 'F' ? 'red' : 'green';
                if(!remarkInp.dataset.modified) {
                    remarkInp.value = getStandardRemark(grade);
                }
            };
            remarkInp.addEventListener('input', () => remarkInp.dataset.modified = true);
            cInp.addEventListener('input', calc);
            eInp.addEventListener('input', calc);
        }
    });
}

window.submitGrades = function() {
    const cls = document.getElementById('gradeClassSelect').value;
    const sub = document.getElementById('gradeSubjectSelect').value;
    const term = document.getElementById('gradeTermSelect').value;
    const user = DB.getCurrentUser();

    if(!cls || !sub || !term) {
        alert("Selection incomplete.");
        return;
    }

    if(!confirm(`Submit grades for ${cls} - ${sub}? Records will be sent to Admin for approval.`)) return;

    const rows = document.querySelectorAll('#gradeTable tbody tr');
    let savedCount = 0;

    rows.forEach(tr => {
        const classInp = tr.querySelector('.g-class');
        if(classInp.disabled) return; // Skip published results

        const studentId = tr.querySelector('.g-studId').value;
        const studentName = tr.querySelector('.g-studName').value;
        const classScoreStr = classInp.value;
        const examScoreStr = tr.querySelector('.g-exam').value;
        
        if(!classScoreStr && !examScoreStr) return; // skip empty

        const classScore = parseFloat(classScoreStr) || 0;
        const examScore = parseFloat(examScoreStr) || 0;
        const total = classScore + examScore;
        const remark = tr.querySelector('.g-remark').value;

        // Find existing to preserve ID if updating
        const existing = DB.findOne('results', { studentId, subject: sub, term });
        
        const data = {
            studentId, studentName, classId: cls, subject: sub, term,
            classScore, examScore, total, remark,
            teacherId: user.id, teacherName: user.name,
            status: 'submitted' // Reset to submitted for admin review
        };

        if(existing) {
            DB.update('results', existing.id, data);
        } else {
            DB.insert('results', data);
        }
        savedCount++;
    });

    DB.logAction('Submitted Grades', `Class: ${cls}, Subject: ${sub}, Students: ${savedCount}`);
    alert(`Successfully submitted ${savedCount} student grades to Administration for approval.`);
    window.loadGradeEntryGrid(); // Refresh UI
}

function loadAnnouncements() {
    const list = document.getElementById('announcementList');
    if(!list) return;
    list.innerHTML = '';
    const anns = DB.getTable('announcements').filter(a => a.target === 'all' || a.target === 'teachers').sort((a,b) => new Date(b.date) - new Date(a.date));
    
    if(anns.length === 0) {
        list.innerHTML = '<p style="color:#666; padding: 10px 0;">No new announcements.</p>';
        return;
    }

    anns.slice(0, 5).forEach(a => {
        const div = document.createElement('div');
        div.style.padding = '12px 0';
        div.style.borderBottom = '1px solid #eee';
        div.innerHTML = `
            <strong>${a.title}</strong>
            <p style="margin:5px 0; font-size:0.9rem; color:#444">${a.body}</p>
            <small style="color:#888">${new Date(a.date).toLocaleDateString()} from Admin</small>
        `;
        list.appendChild(div);
    });
}

function getGrade(score) {
    if(score >= 80) return 'A';
    if(score >= 70) return 'B';
    if(score >= 60) return 'C';
    if(score >= 50) return 'D';
    if(score >= 40) return 'E';
    return 'F';
}

function getStandardRemark(grade) {
    switch(grade) {
        case 'A': return 'Excellent performance.';
        case 'B': return 'Very good work.';
        case 'C': return 'Good, but room for improvement.';
        case 'D': return 'Fair performance.';
        case 'E': return 'Pass, needs more focus.';
        case 'F': return 'Fail, requires immediate attention.';
        default: return '';
    }
}

window.checkStudentFees = function() {
    const studId = document.getElementById('searchFeeStudId').value.trim();
    const resArea = document.getElementById('feeResultArea');
    const notFound = document.getElementById('feeNotFound');
    const tbody = document.querySelector('#teacherFeeTable tbody');

    if(!studId) {
        alert("Please enter a Student ID.");
        return;
    }

    const student = DB.findOne('students', { studentId: studId });
    if(!student) {
        resArea.style.display = 'none';
        notFound.style.display = 'block';
        return;
    }

    notFound.style.display = 'none';
    resArea.style.display = 'block';
    document.getElementById('feeResName').innerText = student.name;

    // Get tuition fee from class
    let tuitionFee = 0;
    const cls = DB.getTable('classes').find(c => c.id === student.classId || c.name === student.className);
    if (cls && cls.tuitionFee) {
        tuitionFee = cls.tuitionFee;
    }

    const payments = DB.find('payments', { studentId: studId });
    let totalPaid = 0;
    
    tbody.innerHTML = '';
    if(payments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center">No payments recorded for this student.</td></tr>';
    } else {
        payments.forEach(p => {
            totalPaid += parseFloat(p.amountPaid);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${new Date(p.date).toLocaleDateString()}</td>
                <td>${p.receiptNo}</td>
                <td>GHS ${parseFloat(p.amountPaid).toFixed(2)}</td>
                <td><span class="badge ${p.status === 'Paid' ? 'badge-active' : 'badge-pending'}">${p.status}</span></td>
            `;
            tbody.appendChild(tr);
        });
    }

    const balance = (tuitionFee + (student.arrears || 0)) - totalPaid;
    document.getElementById('feeResPaid').innerHTML = `
        <span style="color:var(--success)">Paid: GHS ${totalPaid.toFixed(2)}</span><br>
        <span style="color:var(--gray); font-size: 0.9rem;">Debt/Arrears: GHS ${student.arrears || 0}</span><br>
        <span style="color:var(--danger); font-size: 0.9rem; font-weight:bold;">Total Bal: GHS ${balance.toFixed(2)}</span>
    `;
}

function loadTimetables() {
    const tbody = document.querySelector('#teacherTimetableTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    // Filter for all users or teachers only
    const tts = DB.getTable('timetables').filter(tt => tt.target === 'all' || tt.target === 'teachers').sort((a,b) => new Date(b.date) - new Date(a.date));

    if(tts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center">No timetables published for teachers yet.</td></tr>';
        return;
    }

    tts.forEach(tt => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${tt.title}</strong><br><small>${tt.fileName}</small></td>
            <td>${new Date(tt.date).toLocaleDateString()}</td>
            <td>
                <a href="${tt.content}" target="_blank" class="btn btn-primary" style="text-decoration:none; padding:5px 10px;">View PDF</a>
                <a href="${tt.content}" download="${tt.fileName}" class="btn btn-success" style="text-decoration:none; padding:5px 10px; margin-left:5px;"><i class="fas fa-download"></i></a>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.loadAttendanceGrid = function() {
    const cls = document.getElementById('attClassSelect').value;
    const date = document.getElementById('attDate').value;
    const tbody = document.querySelector('#attendanceTable tbody');
    
    if(!cls || !date) return;

    tbody.innerHTML = '';
    document.getElementById('attendanceGridArea').style.display = 'block';

    const students = DB.find('students', { className: cls });
    
    if(students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center">No students found in this class.</td></tr>';
        return;
    }

    students.forEach(s => {
        // Try to find existing attendance
        const existing = DB.findOne('attendance', { studentId: s.studentId, date: date });
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <strong>${s.name}</strong><br><small>${s.studentId}</small>
                <input type="hidden" class="att-studId" value="${s.studentId}">
                <input type="hidden" class="att-studName" value="${s.name}">
            </td>
            <td>
                <select class="form-control att-status" style="width:120px;">
                    <option value="Present" ${existing && existing.status === 'Present' ? 'selected' : ''}>Present</option>
                    <option value="Absent" ${existing && existing.status === 'Absent' ? 'selected' : ''}>Absent</option>
                    <option value="Late" ${existing && existing.status === 'Late' ? 'selected' : ''}>Late</option>
                </select>
            </td>
            <td><input type="text" class="form-control att-remark" value="${existing ? existing.remark : ''}" placeholder="Optional remark"></td>
        `;
        tbody.appendChild(tr);
    });
}

window.saveAttendance = function() {
    const cls = document.getElementById('attClassSelect').value;
    const date = document.getElementById('attDate').value;
    const user = DB.getCurrentUser();

    if(!cls || !date) return;

    const rows = document.querySelectorAll('#attendanceTable tbody tr');
    let count = 0;

    rows.forEach(tr => {
        const studentId = tr.querySelector('.att-studId').value;
        const studentName = tr.querySelector('.att-studName').value;
        const status = tr.querySelector('.att-status').value;
        const remark = tr.querySelector('.att-remark').value;

        const data = {
            studentId, studentName, className: cls,
            date, status, remark,
            teacherId: user.id
        };

        const existing = DB.findOne('attendance', { studentId, date });
        if(existing) {
            DB.update('attendance', existing.id, data);
        } else {
            DB.insert('attendance', data);
        }
        count++;
    });

    DB.logAction('Marked Attendance', `Class: ${cls}, Date: ${date}, Students: ${count}`);
    alert(`Attendance for ${count} students saved successfully!`);
}
