document.addEventListener('DOMContentLoaded', () => {
    const activeLang = localStorage.getItem('sik_web_lang') || 'cz';

    if (activeLang === 'en') {
        document.documentElement.lang = 'en';
        const titleEl = document.getElementById('err-title');
        const btnHomeEl = document.getElementById('err-btn-home');

        if (titleEl) titleEl.textContent = "We don't shoot here.";
        if (btnHomeEl) btnHomeEl.textContent = 'Back to home';
    }
});
