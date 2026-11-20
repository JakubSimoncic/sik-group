document.addEventListener('DOMContentLoaded', () => {
    const browserLang = (navigator.language || navigator.userLanguage || 'cs').toLowerCase();
    const isCzechOrSlovak = browserLang.startsWith('cs') || browserLang.startsWith('sk');

    const titleEl = document.getElementById('err-title');
    const btnHomeEl = document.getElementById('err-btn-home');

    if (isCzechOrSlovak) {
        document.documentElement.lang = 'cs';
        if (titleEl) titleEl.textContent = 'Tady nenatáčíme :(';
        if (btnHomeEl) btnHomeEl.textContent = 'Zpět na úvod';
    } else {
        document.documentElement.lang = 'en';
        if (titleEl) titleEl.textContent = "We don't shoot here :(";
        if (btnHomeEl) btnHomeEl.textContent = 'Back to home';
    }
});
