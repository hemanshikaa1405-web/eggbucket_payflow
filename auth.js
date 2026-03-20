// Simple client-side auth guard — stores a lightweight flag in sessionStorage.
(function () {
    const TOKEN_KEY = 'sc_token';
    const PUBLIC = ['login.html', 'reset.html'];
    const p = window.location.pathname.split('/').pop() || 'index.html';

    if (PUBLIC.includes(p)) return;

    // Validate token
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) {
        const redirect = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `login.html?redirect=${redirect}`;
        return;
    }

    // Reject legacy dummy token (migration from pre–Supabase Auth)
    if (token === 'dummy-admin-token') {
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem('sc_user');
        window.location.href = 'login.html';
        return;
    }

    // Get user data from sessionStorage
    const userData = JSON.parse(sessionStorage.getItem('sc_user') || '{}');
    if (!userData || !userData.username) {
        const redirect = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `login.html?redirect=${redirect}`;
        return;
    }

    // Supervisor can ONLY access calculator page
    const role = userData.role || 'admin';
    const supervisorOnlyPages = ['calculator.html'];
    const supervisorBlockedPages = ['dashboard.html', 'records.html', 'index.html'];
    if (role === 'supervisor' && (supervisorBlockedPages.includes(p) || !supervisorOnlyPages.includes(p))) {
        window.location.href = 'calculator.html';
        return;
    }

    handleLoggedIn(userData);

    // shared handler inserts logout/dashboard buttons etc
    function handleLoggedIn(userData) {
        const role = userData.role || 'admin';
        try { sessionStorage.setItem('sc_user', JSON.stringify(userData)); } catch (e) { }

        // Hide Employees and Records nav for Supervisor
        if (role === 'supervisor') {
            document.querySelectorAll('a[href="dashboard.html"], a[href="records.html"]').forEach(el => {
                if (el.closest('.dash-nav')) el.style.display = 'none';
            });
        }

        try {
            const header = document.querySelector('.header');
            if (header && !document.getElementById('sc-auth-actions')) {
                const existingDash = header.querySelector('a[href="dashboard.html"], a.dash-nav-item[href="dashboard.html"], a.btn[href="dashboard.html"]');
                const createLogoutBtn = (className) => {
                    const btn = document.createElement('button');
                    btn.id = 'sc-logout-btn';
                    btn.className = className || '';
                    btn.classList.add('btn', 'btn-primary');
                    btn.type = 'button';
                    btn.style.cursor = 'pointer';
                    btn.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                            <polyline points="16 17 21 12 16 7"></polyline>
                            <line x1="21" y1="12" x2="9" y2="12"></line>
                        </svg>
                        <span style="margin-left:6px;">Logout</span>
                    `;
                    btn.addEventListener('click', async () => {
                        try {
                            if (window.supabaseClient) await window.supabaseClient.auth.signOut();
                        } catch (e) { /* ignore */ }
                        sessionStorage.removeItem(TOKEN_KEY);
                        sessionStorage.removeItem('sc_user');
                        window.location.href = 'login.html';
                    });
                    return btn;
                };

                if (existingDash) {
                    if (p === 'index.html') {
                        const wrapper = document.createElement('div');
                        wrapper.id = 'sc-auth-actions';
                        wrapper.style.display = 'inline-flex';
                        wrapper.style.alignItems = 'center';
                        wrapper.style.gap = '6px';
                        wrapper.style.marginLeft = '12px';

                        const parent = existingDash.parentNode;
                        parent.insertBefore(wrapper, existingDash);
                        wrapper.appendChild(existingDash);

                        const logoutBtn = createLogoutBtn(existingDash.className || 'btn btn-primary');
                        wrapper.appendChild(logoutBtn);
                    } else {
                        let wrapper = document.getElementById('sc-auth-actions');
                        if (!wrapper) {
                            wrapper = document.createElement('div');
                            wrapper.id = 'sc-auth-actions';
                            wrapper.style.display = 'inline-flex';
                            wrapper.style.alignItems = 'center';
                            wrapper.style.gap = '6px';
                            wrapper.style.marginLeft = '12px';
                            header.appendChild(wrapper);
                        }
                        const logoutBtn = createLogoutBtn(existingDash.className || 'btn btn-primary');
                        wrapper.appendChild(logoutBtn);
                    }
                } else {
                    if (p !== 'index.html') {
                        let wrapper = document.getElementById('sc-auth-actions');
                        if (!wrapper) {
                            wrapper = document.createElement('div');
                            wrapper.id = 'sc-auth-actions';
                            wrapper.style.display = 'inline-flex';
                            wrapper.style.alignItems = 'center';
                            wrapper.style.gap = '6px';
                            wrapper.style.marginLeft = '12px';
                            header.appendChild(wrapper);
                        }
                        wrapper.appendChild(createLogoutBtn('btn btn-primary'));
                    } else {
                        const wrapper = document.createElement('div');
                        wrapper.id = 'sc-auth-actions';
                        wrapper.style.display = 'inline-flex';
                        wrapper.style.alignItems = 'center';
                        wrapper.style.gap = '6px';
                        wrapper.style.marginLeft = '12px';

                        const dash = document.createElement('a');
                        dash.href = 'dashboard.html';
                        dash.className = 'btn btn-primary';
                        dash.textContent = 'Dashboard';
                        dash.style.textDecoration = 'none';

                        const btn = createLogoutBtn('btn btn-primary');

                        wrapper.appendChild(dash);
                        wrapper.appendChild(btn);
                        header.appendChild(wrapper);
                    }
                }
            }
        } catch (e) { /* ignore */ }
    }
})();
