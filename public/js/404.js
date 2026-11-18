document.addEventListener('DOMContentLoaded', () => {
    const activeLang = localStorage.getItem('sik_web_lang') || 'cz';

    const tagEl = document.getElementById('err-tag');
    const titleEl = document.getElementById('err-title');
    const descEl = document.getElementById('err-desc');
    const pathEl = document.getElementById('err-path');
    const btnHomeEl = document.getElementById('err-btn-home');
    const btnContactEl = document.getElementById('err-btn-contact');

    if (activeLang === 'en') {
        document.documentElement.lang = 'en';
        if (tagEl) tagEl.textContent = 'SIGNAL LOST';
        if (titleEl) titleEl.textContent = 'Page Not Found';
        if (descEl) {
            descEl.textContent = 'The requested URL does not exist or has been moved outside the flight zone. Check the link or return to the main page.';
        }
        if (btnHomeEl) btnHomeEl.textContent = 'Back to Home';
        if (btnContactEl) btnContactEl.textContent = 'Contact';
    }

    if (pathEl && window.location.pathname) {
        pathEl.textContent = `URL: ${window.location.pathname}`;
    }
});
