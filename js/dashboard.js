// Dashboard Core Logic
const state = {
    user: JSON.parse(localStorage.getItem('user')),
    currentView: 'overview', // overview, courses, assignments
    courses: [],
    assignments: [],
    submissions: []
};

document.addEventListener('DOMContentLoaded', async () => {
    if (!state.user) return; // app.js handles redirect

    initNavigation();
    await loadInitialData();
    renderView();
});

function initNavigation() {
    const navLinks = document.querySelectorAll('#navLinks a');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navLinks.forEach(l => l.classList.remove('active'));
            e.currentTarget.classList.add('active');
            state.currentView = e.currentTarget.dataset.view;
            renderView();
        });
    });
}

async function loadInitialData() {
    try {
        state.courses = await api.getCourses();
        if (state.user.role === 'student') {
            state.submissions = await api.getMySubmissions();
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
}

function renderView() {
    const titleEl = document.getElementById('pageTitle');
    const contentEl = document.getElementById('mainContent');
    const actionsEl = document.getElementById('topbarActions');

    contentEl.innerHTML = ''; // Clear current
    actionsEl.innerHTML = ''; // Clear actions

    if (state.currentView === 'overview') {
        titleEl.textContent = `Welcome, ${state.user.name}`;
        renderOverview(contentEl);
    } else if (state.currentView === 'courses') {
        titleEl.textContent = 'Courses';
        renderCourses(contentEl, actionsEl);
    } else if (state.currentView === 'assignments') {
        titleEl.textContent = 'Assignments & Submissions';
        renderAssignments(contentEl);
    }
}

// ==========================
// RENDER VIEWS
// ==========================

function renderOverview(container) {
    const statsHTML = `
        <div class="grid-container" style="margin-bottom: 2rem;">
            <div class="card glass-panel text-center">
                <h3>Total Courses</h3>
                <h2 class="accent" style="font-size: 3rem;">${state.courses.length}</h2>
            </div>
            ${state.user.role === 'student' ? `
            <div class="card glass-panel text-center">
                <h3>Total Submissions</h3>
                <h2 class="accent" style="font-size: 3rem;">${state.submissions.length}</h2>
            </div>
            ` : ''}
        </div>
    `;
    container.innerHTML = statsHTML;
}

function renderCourses(container, actionsEl) {
    // Add Course Action for Admin/Teacher
    if (state.user.role === 'admin' || state.user.role === 'teacher') {
        const addBtn = document.createElement('button');
        addBtn.className = 'btn btn-primary';
        addBtn.textContent = '+ Create Course';
        addBtn.onclick = () => openCreateCourseModal();
        actionsEl.appendChild(addBtn);
    }

    let relevantCourses = state.courses;
    if (state.user.role === 'teacher') {
        relevantCourses = state.courses.filter(c => {
            const teacherId = typeof c.teacherId === 'object' ? c.teacherId._id : c.teacherId;
            return teacherId === state.user.id;
        });
    } else if (state.user.role === 'student') {
        relevantCourses = state.courses;
    }

    if (relevantCourses.length === 0) {
        container.innerHTML = '<p class="text-muted">No courses available.</p>';
        return;
    }

    const grid = document.createElement('div');
    grid.className = 'grid-container';

    relevantCourses.forEach(course => {
        const isEnrolled = state.user.role === 'student' && course.students.includes(state.user.id);
        const teacherName = typeof course.teacherId === 'object' ? course.teacherId.name : 'Unknown';
        const courseId = course._id;
        const card = document.createElement('div');
        card.className = 'card glass-panel';
        card.innerHTML = `
            <h3 class="card-title">${course.title}</h3>
            <p class="card-desc">${course.description}</p>
            <div class="card-meta">
                <span>By ${teacherName}</span>
                <span>${course.students.length} Students</span>
            </div>
            <div style="margin-top: 1.5rem; display: flex; gap: 0.5rem;">
                <button class="btn btn-outline btn-full" onclick="viewCourseDetails('${courseId}')">View Details</button>
                ${state.user.role === 'student' && !isEnrolled ?
                `<button class="btn btn-primary btn-full" onclick="enrollCourse('${courseId}')">Enroll</button>`
                : ''}
                ${state.user.role === 'student' && isEnrolled ?
                `<span class="badge badge-success" style="display:flex; align-items:center;">Enrolled</span>`
                : ''}
            </div>
        `;
        grid.appendChild(card);
    });

    container.appendChild(grid);
}

function renderAssignments(container) {
    if (state.user.role === 'student') {
        container.innerHTML = `<h3>My Submissions</h3>`;
        if (state.submissions.length === 0) {
            container.innerHTML += '<p>No submissions yet.</p>';
            return;
        }

        const list = document.createElement('div');
        list.className = 'grid-container';
        state.submissions.forEach(sub => {
            const assignTitle = typeof sub.assignmentId === 'object' ? sub.assignmentId.title : 'Unknown Assignment';
            list.innerHTML += `
                <div class="card glass-panel">
                    <h4>${assignTitle}</h4>
                    <p>Status: <span class="badge ${sub.status === 'graded' ? 'badge-success' : 'badge-warning'}">${sub.status}</span></p>
                    ${sub.grade != null ? `<p><strong>Grade:</strong> ${sub.grade}</p>` : ''}
                    ${sub.feedback ? `<p><strong>Feedback:</strong> ${sub.feedback}</p>` : ''}
                </div>
            `;
        });
        container.appendChild(list);
    } else {
        container.innerHTML = '<p>Select a course to view and grade assignments.</p>';
    }
}

// ==========================
// ACTIONS
// ==========================

async function enrollCourse(courseId) {
    try {
        await api.enrollCourse(courseId);
        showToast('Enrolled successfully!');
        await loadInitialData(); // reload
        renderView();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function viewCourseDetails(courseId) {
    // Basic navigation to course view inside dashboard
    const contentEl = document.getElementById('mainContent');
    contentEl.innerHTML = '<p>Loading course details...</p>';

    try {
        const course = await api.getCourse(courseId);
        const assignments = await api.getAssignmentsByCourse(courseId);
        const teacherName = typeof course.teacherId === 'object' ? course.teacherId.name : 'Unknown';

        let html = `
            <div class="glass-panel" style="padding: 2rem; margin-bottom: 2rem;">
                <button class="btn btn-outline" style="margin-bottom: 1rem;" onclick="renderView()">← Back</button>
                <h2>${course.title}</h2>
                <p>${course.description}</p>
                <div class="card-meta" style="justify-content: flex-start; gap: 2rem;">
                    <span><strong>Teacher:</strong> ${teacherName}</span>
                    <span><strong>Enrolled:</strong> ${course.students.length}</span>
                </div>
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h3>Assignments</h3>
                ${(state.user.role === 'teacher' || state.user.role === 'admin') ?
                `<button class="btn btn-primary" onclick="openCreateAssignmentModal('${course._id}')">+ Add Assignment</button>`
                : ''}
            </div>
            <div class="grid-container">
        `;

        if (assignments.length === 0) {
            html += '<p>No assignments yet.</p>';
        }

        assignments.forEach(hw => {
            html += `
                <div class="card glass-panel">
                    <h4 class="card-title">${hw.title}</h4>
                    <p class="card-desc">${hw.description}</p>
                    <div class="card-meta">
                        <span>Due: ${formatDate(hw.dueDate)}</span>
                    </div>
                    <div style="margin-top: 1.5rem;">
                        ${state.user.role === 'student' ?
                    `<button class="btn btn-primary btn-full" onclick="openSubmitModal('${hw._id}')">Submit Work</button>`
                    : `<button class="btn btn-outline btn-full" onclick="viewSubmissions('${hw._id}')">View Submissions</button>`
                }
                    </div>
                </div>
            `;
        });

        html += `</div>`;
        contentEl.innerHTML = html;

    } catch (error) {
        showToast(error.message, 'error');
        renderView();
    }
}

// ==========================
// MODALS
// ==========================

function openModal(title, contentHTML) {
    const container = document.getElementById('modalContainer');
    container.innerHTML = `
        <div class="modal-overlay" onclick="closeModal(event)">
            <div class="modal-content glass-panel" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="close-btn" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    ${contentHTML}
                </div>
            </div>
        </div>
    `;
}

function closeModal(e) {
    if (e && e.target !== e.currentTarget) return;
    document.getElementById('modalContainer').innerHTML = '';
}

function openCreateCourseModal() {
    openModal('Create New Course', `
        <form id="createCourseForm">
            <div class="form-group">
                <label>Title</label>
                <input type="text" id="courseTitle" required>
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea id="courseDesc" rows="4" required></textarea>
            </div>
            <button type="submit" class="btn btn-primary btn-full">Create</button>
        </form>
    `);

    document.getElementById('createCourseForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('courseTitle').value;
        const description = document.getElementById('courseDesc').value;
        try {
            await api.createCourse({ title, description });
            showToast('Course created!');
            closeModal();
            await loadInitialData();
            renderView();
        } catch (error) {
            showToast(error.message, 'error');
        }
    });
}

function openCreateAssignmentModal(courseId) {
    openModal('Add Assignment', `
        <form id="createAssignmentForm">
            <div class="form-group">
                <label>Title</label>
                <input type="text" id="hwTitle" required>
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea id="hwDesc" rows="3" required></textarea>
            </div>
            <div class="form-group">
                <label>Due Date</label>
                <input type="date" id="hwDue" required>
            </div>
            <button type="submit" class="btn btn-primary btn-full">Add</button>
        </form>
    `);

    document.getElementById('createAssignmentForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('hwTitle').value;
        const description = document.getElementById('hwDesc').value;
        const dueDate = document.getElementById('hwDue').value;

        try {
            await api.createAssignment({ title, description, dueDate, courseId });
            showToast('Assignment added!');
            closeModal();
            viewCourseDetails(courseId); // refresh current view
        } catch (error) {
            showToast(error.message, 'error');
        }
    });
}

function openSubmitModal(assignmentId) {
    openModal('Submit Assignment', `
        <form id="submitForm">
            <div class="form-group">
                <label>Upload File (PDF, DOCX, etc)</label>
                <input type="file" id="hwFile" required style="background: none; border: none; padding: 0;">
            </div>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">
                <em>Note: File name will be recorded. Files are stored locally in your browser.</em>
            </p>
            <button type="submit" class="btn btn-primary btn-full">Submit</button>
        </form>
    `);

    document.getElementById('submitForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fileInput = document.getElementById('hwFile');
        if (fileInput.files.length === 0) return;

        const formData = new FormData();
        formData.append('file', fileInput.files[0]);

        try {
            await api.submitAssignment(assignmentId, formData);
            showToast('Assignment submitted successfully!');
            closeModal();
            // Refresh submissions
            state.submissions = await api.getMySubmissions();
        } catch (error) {
            showToast(error.message, 'error');
        }
    });
}

async function viewSubmissions(assignmentId) {
    try {
        const submissions = await api.getSubmissionsByAssignment(assignmentId);

        let html = '<div class="grid-container" style="max-height: 400px; overflow-y: auto;">';
        if (submissions.length === 0) {
            html += '<p>No submissions yet.</p>';
        }

        submissions.forEach(sub => {
            const studentName = typeof sub.studentId === 'object' ? sub.studentId.name : 'Unknown';

            html += `
                <div class="card" style="padding: 1rem;">
                    <h4>${studentName}</h4>
                    <p class="accent" style="font-size: 0.9rem;">📄 ${sub.fileUrl}</p>
                    <div style="margin-top: 1rem;">
                        ${sub.status === 'graded' ?
                    `<p><strong>Grade:</strong> ${sub.grade}</p>` :
                    `<button class="btn btn-primary btn-full" onclick="openGradeModal('${sub._id}')">Grade</button>`
                }
                    </div>
                </div>
            `;
        });
        html += '</div>';

        openModal('Student Submissions', html);
    } catch (error) {
        showToast(error.message, 'error');
    }
}

function openGradeModal(submissionId) {
    openModal('Grade Submission', `
        <form id="gradeForm">
            <div class="form-group">
                <label>Grade (0-100)</label>
                <input type="number" id="gradeVal" min="0" max="100" required>
            </div>
            <div class="form-group">
                <label>Feedback (optional)</label>
                <textarea id="gradeFeedback" rows="2"></textarea>
            </div>
            <button type="submit" class="btn btn-success btn-full">Submit Grade</button>
        </form>
    `);

    document.getElementById('gradeForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const grade = document.getElementById('gradeVal').value;
        const feedback = document.getElementById('gradeFeedback').value;

        try {
            await api.gradeSubmission(submissionId, grade, feedback);
            showToast('Graded successfully!');
            closeModal();
        } catch (error) {
            showToast(error.message, 'error');
        }
    });
}
