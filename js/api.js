// ============================================================
// LocalStorage-based Data Layer (replaces server-side API)
// All data is persisted in the browser's localStorage.
// ============================================================

class LocalStorageDB {
    constructor(key) {
        this.key = key;
    }

    getAll() {
        return JSON.parse(localStorage.getItem(this.key) || '[]');
    }

    save(data) {
        localStorage.setItem(this.key, JSON.stringify(data));
    }

    findById(id) {
        return this.getAll().find(item => item._id === id) || null;
    }

    insert(record) {
        const all = this.getAll();
        record._id = record._id || generateId();
        record.createdAt = new Date().toISOString();
        record.updatedAt = new Date().toISOString();
        all.push(record);
        this.save(all);
        return record;
    }

    update(id, updates) {
        const all = this.getAll();
        const index = all.findIndex(item => item._id === id);
        if (index === -1) return null;
        all[index] = { ...all[index], ...updates, updatedAt: new Date().toISOString() };
        this.save(all);
        return all[index];
    }

    findBy(predicate) {
        return this.getAll().filter(predicate);
    }
}

// Simple unique ID generator
function generateId() {
    return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
}

// Simple hash for password (NOT secure — just for demo/local use)
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    return 'hash_' + Math.abs(hash).toString(36);
}

// ============================================================
// Database Collections
// ============================================================
const usersDB = new LocalStorageDB('lms_users');
const coursesDB = new LocalStorageDB('lms_courses');
const assignmentsDB = new LocalStorageDB('lms_assignments');
const submissionsDB = new LocalStorageDB('lms_submissions');

// ============================================================
// Seed default data on first load
// ============================================================
function seedDataIfNeeded() {
    if (localStorage.getItem('lms_seeded')) return;

    // Create a default teacher account
    const teacher = {
        _id: generateId(),
        name: 'Prof. Smith',
        email: 'teacher@lms.com',
        password: simpleHash('teacher123'),
        role: 'teacher',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    usersDB.insert(teacher);

    // Create a default student account
    const student = {
        _id: generateId(),
        name: 'John Student',
        email: 'student@lms.com',
        password: simpleHash('student123'),
        role: 'student',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    usersDB.insert(student);

    // Create some sample courses
    const course1 = {
        _id: generateId(),
        title: 'Introduction to Web Development',
        description: 'Learn the fundamentals of HTML, CSS, and JavaScript to build modern websites.',
        teacherId: teacher._id,
        students: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    coursesDB.insert(course1);

    const course2 = {
        _id: generateId(),
        title: 'Data Structures & Algorithms',
        description: 'Master essential data structures and algorithm design for competitive programming.',
        teacherId: teacher._id,
        students: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    coursesDB.insert(course2);

    // Create sample assignments
    const futureDate1 = new Date();
    futureDate1.setDate(futureDate1.getDate() + 14);
    assignmentsDB.insert({
        _id: generateId(),
        title: 'Build a Personal Portfolio',
        description: 'Create a responsive portfolio site with at least 3 sections using HTML, CSS, and JS.',
        dueDate: futureDate1.toISOString(),
        courseId: course1._id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    });

    const futureDate2 = new Date();
    futureDate2.setDate(futureDate2.getDate() + 21);
    assignmentsDB.insert({
        _id: generateId(),
        title: 'Implement a Linked List',
        description: 'Implement a singly linked list with insert, delete, and search operations in JavaScript.',
        dueDate: futureDate2.toISOString(),
        courseId: course2._id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    });

    localStorage.setItem('lms_seeded', 'true');
}

// Run seed
seedDataIfNeeded();

// ============================================================
// API Service (localStorage-backed, same interface as before)
// ============================================================

class ApiService {
    constructor() {
        this.token = localStorage.getItem('token');
    }

    // ------ Auth ------

    async login(email, password) {
        const users = usersDB.getAll();
        const user = users.find(u => u.email === email);
        if (!user) throw new Error('User not found. Please register first.');
        if (user.password !== simpleHash(password)) throw new Error('Invalid password.');

        const token = 'tok_' + generateId();
        const userData = {
            token,
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
        };
        // Store the active session token
        localStorage.setItem('lms_active_token', token);
        localStorage.setItem('lms_active_user_id', user._id);
        return userData;
    }

    async register(name, email, password, role) {
        const users = usersDB.getAll();
        if (users.find(u => u.email === email)) {
            throw new Error('An account with this email already exists.');
        }

        const newUser = usersDB.insert({
            name,
            email,
            password: simpleHash(password),
            role: role || 'student'
        });

        const token = 'tok_' + generateId();
        const userData = {
            token,
            id: newUser._id,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role
        };
        localStorage.setItem('lms_active_token', token);
        localStorage.setItem('lms_active_user_id', newUser._id);
        return userData;
    }

    async getProfile() {
        const userId = localStorage.getItem('lms_active_user_id');
        const user = usersDB.findById(userId);
        if (!user) throw new Error('User not found.');
        return { id: user._id, name: user.name, email: user.email, role: user.role };
    }

    // ------ Courses ------

    async getCourses() {
        const courses = coursesDB.getAll();
        // Populate teacherId with teacher info
        return courses.map(c => {
            const teacher = usersDB.findById(c.teacherId);
            return {
                ...c,
                teacherId: teacher ? { _id: teacher._id, name: teacher.name } : { _id: c.teacherId, name: 'Unknown' }
            };
        });
    }

    async getCourse(id) {
        const course = coursesDB.findById(id);
        if (!course) throw new Error('Course not found.');
        const teacher = usersDB.findById(course.teacherId);
        return {
            ...course,
            teacherId: teacher ? { _id: teacher._id, name: teacher.name } : { _id: course.teacherId, name: 'Unknown' }
        };
    }

    async createCourse(data) {
        const user = JSON.parse(localStorage.getItem('user'));
        const course = coursesDB.insert({
            title: data.title,
            description: data.description,
            teacherId: user.id,
            students: []
        });
        return course;
    }

    async enrollCourse(id) {
        const user = JSON.parse(localStorage.getItem('user'));
        const course = coursesDB.findById(id);
        if (!course) throw new Error('Course not found.');
        if (course.students.includes(user.id)) throw new Error('Already enrolled.');

        course.students.push(user.id);
        coursesDB.update(id, { students: course.students });
        return { message: 'Enrolled successfully' };
    }

    // ------ Assignments ------

    async getAssignmentsByCourse(courseId) {
        return assignmentsDB.findBy(a => a.courseId === courseId);
    }

    async createAssignment(data) {
        const assignment = assignmentsDB.insert({
            title: data.title,
            description: data.description,
            dueDate: data.dueDate,
            courseId: data.courseId
        });
        return assignment;
    }

    // ------ Submissions ------

    async submitAssignment(assignmentId, formData) {
        const user = JSON.parse(localStorage.getItem('user'));

        // Since we can't store actual files in localStorage, we store the file name
        let fileName = 'uploaded_file';
        if (formData instanceof FormData) {
            const file = formData.get('file');
            if (file && file.name) {
                fileName = file.name;
            }
        }

        const submission = submissionsDB.insert({
            assignmentId: assignmentId,
            studentId: user.id,
            fileUrl: fileName,
            status: 'submitted',
            grade: null,
            feedback: null
        });
        return submission;
    }

    async getMySubmissions() {
        const user = JSON.parse(localStorage.getItem('user'));
        const submissions = submissionsDB.findBy(s => s.studentId === user.id);

        // Populate assignmentId with assignment info
        return submissions.map(s => {
            const assignment = assignmentsDB.findById(s.assignmentId);
            return {
                ...s,
                assignmentId: assignment ? { _id: assignment._id, title: assignment.title } : { _id: s.assignmentId, title: 'Unknown Assignment' }
            };
        });
    }

    async getSubmissionsByAssignment(assignmentId) {
        const submissions = submissionsDB.findBy(s => s.assignmentId === assignmentId);

        // Populate studentId with student info
        return submissions.map(s => {
            const student = usersDB.findById(s.studentId);
            return {
                ...s,
                studentId: student ? { _id: student._id, name: student.name } : { _id: s.studentId, name: 'Unknown' }
            };
        });
    }

    async gradeSubmission(id, grade, feedback) {
        const updated = submissionsDB.update(id, {
            grade: Number(grade),
            feedback: feedback || '',
            status: 'graded'
        });
        if (!updated) throw new Error('Submission not found.');
        return updated;
    }
}

const api = new ApiService();
