document.addEventListener('DOMContentLoaded', () => {
    const activeLang = localStorage.getItem('sik_web_lang') || 'cz';

    if (activeLang === 'en') {
        document.documentElement.lang = 'en';
        const titleEl = document.getElementById('err-title');
        const descEl = document.getElementById('err-desc');
        const btnHomeEl = document.getElementById('err-btn-home');

        if (titleEl) titleEl.textContent = 'Page Not Found';
        if (descEl) descEl.textContent = 'The requested page does not exist or has been moved.';
        if (btnHomeEl) btnHomeEl.textContent = 'Back to Home';
    }
});
