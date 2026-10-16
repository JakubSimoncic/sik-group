document.addEventListener('DOMContentLoaded', () => {
    async function loadGdprData() {
        try {
            const path = window.location.pathname;
            const isInPagesFolder = path.includes('/pages/');
            const dataPath = isInPagesFolder ? '../data/gdpr.json' : 'public/data/gdpr.json';

            const res = await fetch(`${dataPath}?t=` + Date.now());
            if (!res.ok) return;
            const data = await res.json();

            const container = document.getElementById('gdpr-container');
            if (!container || !data.sections || !Array.isArray(data.sections)) return;

            container.innerHTML = '';
            data.sections.forEach(section => {
                const block = document.createElement('div');
                block.className = 'gdpr-block';
                block.innerHTML = `
                    <h2>${section.title}</h2>
                    <p>${section.text}</p>
                `;
                container.appendChild(block);
            });

        } catch (err) {
            console.error('Chyba při načítání gdpr.json:', err);
        }
    }

    loadGdprData();
});

// ==========================================================================
// SLOVNÍK ČESKÝCH POPISKŮ PRO PŘEHLEDNOST V CMS (ADMINISTRACI)
// ==========================================================================
function getFriendlyCmsLabel(key) {
    if (key.startsWith('sections.')) {
        const parts = key.split('.');
        const index = parseInt(parts[1], 10) + 1;
        const field = parts[2];
        
        if (field === 'title') return `Bod č. ${index} – Nadpis bodu`;
        if (field === 'text') return `Bod č. ${index} – Textový obsah`;
    }
    return key;
}
