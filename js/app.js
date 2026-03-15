document.addEventListener('DOMContentLoaded', () => {
    // Check Auth Status for protected pages
    const isAuthPage = document.body.classList.contains('auth-page');
    const isLandingPage = window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/');
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));

    if (!token && !isAuthPage && !isLandingPage) {
        window.location.href = 'login.html';
    }

    if (token && (isAuthPage || isLandingPage)) {
        window.location.href = 'dashboard.html';
    }

    // Initialize UI features (Dark mode toggle, etc)
    initTheme();

    if (user) {
        updateUserInfo(user);
    }
});

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);

    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.checked = savedTheme === 'dark';

        themeToggle.addEventListener('change', (e) => {
            const theme = e.target.checked ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);
        });
    }
}

function updateUserInfo(user) {
    const userNameEls = document.querySelectorAll('.user-name-display');
    const userRoleEls = document.querySelectorAll('.user-role-display');

    userNameEls.forEach(el => el.textContent = user.name);
    userRoleEls.forEach(el => {
        el.textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1);
    });

    // Handle logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('lms_active_token');
            localStorage.removeItem('lms_active_user_id');
            window.location.href = 'index.html';
        });
    }
}

// Utility: Format Date
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// Utility: Show generic notification/toast (simple implementation)
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    Object.assign(toast.style, {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        background: type === 'success' ? 'var(--success)' : 'var(--danger)',
        color: 'white',
        padding: '1rem',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-md)',
        zIndex: '9999',
        animation: 'slideUp 0.3s ease forwards'
    });

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideDown 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Add keyframes dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    @keyframes slideDown { from { transform: translateY(0); opacity: 1; } to { transform: translateY(100%); opacity: 0; } }
`;
document.head.appendChild(style);
