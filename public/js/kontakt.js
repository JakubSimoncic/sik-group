document.addEventListener('DOMContentLoaded', () => {
    async function loadKontaktData() {
        try {
            const path = window.location.pathname;
            const isInPagesFolder = path.includes('/pages/');
            const dataPath = isInPagesFolder ? '../data/kontakt.json' : 'public/data/kontakt.json';

            const res = await fetch(`${dataPath}?t=` + Date.now());
            if (!res.ok) return;
            const data = await res.json();

            // 0. Hlavní nadpisy a sekce
            const teamTitleEl = document.getElementById('team-section-title');
            if (teamTitleEl && data.teamSectionTitle) teamTitleEl.textContent = data.teamSectionTitle;

            const faqTitleEl = document.getElementById('faq-section-title');
            if (faqTitleEl && data.faqSectionTitle) faqTitleEl.textContent = data.faqSectionTitle;

            const contactTitleEl = document.getElementById('contact-section-title');
            if (contactTitleEl && data.contactSectionTitle) contactTitleEl.textContent = data.contactSectionTitle;

            const businessTitleEl = document.getElementById('business-block-title');
            if (businessTitleEl && data.businessTitle) businessTitleEl.textContent = data.businessTitle;

            const billingTitleEl = document.getElementById('billing-block-title');
            if (billingTitleEl && data.billingTitle) billingTitleEl.textContent = data.billingTitle;

            // Popisky (labels)
            if (data.labelEmail) { const el = document.getElementById('label-email'); if (el) el.textContent = data.labelEmail; }
            if (data.labelPhone) { const el = document.getElementById('label-phone'); if (el) el.textContent = data.labelPhone; }
            if (data.labelAddress) { const el = document.getElementById('label-address'); if (el) el.textContent = data.labelAddress; }
            if (data.labelIco) { const el = document.getElementById('label-ico'); if (el) el.textContent = data.labelIco; }
            if (data.labelDic) { const el = document.getElementById('label-dic'); if (el) el.textContent = data.labelDic; }
            if (data.labelBank) { const el = document.getElementById('label-bank'); if (el) el.textContent = data.labelBank; }

            // 1. Kontakty a fakturační údaje
            if (data.contactEmail) {
                document.querySelectorAll('#contact-email, .contact-email-target').forEach(el => {
                    el.textContent = data.contactEmail;
                    el.href = `mailto:${data.contactEmail}`;
                });
            }
            if (data.contactPhone) {
                document.querySelectorAll('#contact-phone, .contact-phone-target').forEach(el => {
                    el.textContent = data.contactPhone;
                    el.href = `tel:${data.contactPhone.replace(/\s+/g, '')}`;
                });
            }
            const addressEl = document.getElementById('contact-address');
            if (addressEl && data.contactAddress) addressEl.textContent = data.contactAddress;

            const icoEl = document.getElementById('contact-ico');
            if (icoEl && data.contactIco) icoEl.textContent = data.contactIco;

            const dicEl = document.getElementById('contact-dic');
            if (dicEl && data.contactDic) dicEl.textContent = data.contactDic;

            const bankEl = document.getElementById('contact-bank');
            if (bankEl && data.contactBank) bankEl.textContent = data.contactBank;

            // 2. Tým
            const teamContainer = document.getElementById('team-rows-container');
            if (teamContainer && data.team && Array.isArray(data.team)) {
                teamContainer.innerHTML = '';
                data.team.forEach(member => {
                    const tagsHtml = member.tags ? member.tags.map(tag => `<span>${tag}</span>`).join('') : '';
                    const row = document.createElement('div');
                    row.className = 'team-row';
                    row.innerHTML = `
                        <div class="team-img-col">
                            <img src="${member.image}" alt="${member.name}" class="team-member-img">
                        </div>
                        <div class="team-info-col">
                            <span class="team-role">${member.role}</span>
                            <h3 class="member-name">${member.name}</h3>
                            <p class="team-bio">${member.bio}</p>
                            <div class="specialization-tags">${tagsHtml}</div>
                        </div>
                    `;
                    teamContainer.appendChild(row);
                });
            }

            // 3. FAQ
            const faqContainer = document.getElementById('faq-container');
            if (faqContainer && data.faq && Array.isArray(data.faq)) {
                faqContainer.innerHTML = '';
                data.faq.forEach(item => {
                    const faqItem = document.createElement('div');
                    faqItem.className = 'faq-item';
                    faqItem.innerHTML = `
                        <div class="faq-question">${item.question}</div>
                        <div class="faq-answer">
                            <div class="faq-answer-inner">
                                <p>${item.answer}</p>
                            </div>
                        </div>
                    `;
                    faqContainer.appendChild(faqItem);
                });

                initFaqAccordion();
            }

        } catch (err) {
            console.error('Chyba při načítání kontakt.json:', err);
        }
    }

    function initFaqAccordion() {
        document.querySelectorAll('.faq-question').forEach(question => {
            const newQuestion = question.cloneNode(true);
            question.parentNode.replaceChild(newQuestion, question);

            newQuestion.addEventListener('click', () => {
                const currentItem = newQuestion.parentElement;
                const currentAnswer = currentItem.querySelector('.faq-answer');
                const isOpen = currentItem.classList.contains('active');
                
                document.querySelectorAll('.faq-item').forEach(item => {
                    item.classList.remove('active');
                    const answer = item.querySelector('.faq-answer');
                    if (answer) answer.style.maxHeight = null;
                });
                
                if (!isOpen && currentAnswer) {
                    currentItem.classList.add('active');
                    currentAnswer.style.maxHeight = currentAnswer.scrollHeight + 'px';
                }
            });
        });
    }

    loadKontaktData();
});

// ==========================================================================
// SLOVNÍK ČESKÝCH POPISKŮ PRO PŘEHLEDNOST V CMS (ADMINISTRACI)
// ==========================================================================
const cmsFieldLabels = {
    "teamSectionTitle": "Nadpis sekce: Lidé za kamerou",
    "faqSectionTitle": "Nadpis sekce: Často kladené otázky",
    "contactSectionTitle": "Nadpis sekce: Kontaktní údaje",
    "businessTitle": "Nadpis bloku: Obchodní jednání",
    "labelEmail": "Popisek pole: E-mail",
    "contactEmail": "E-mailová adresa společnosti",
    "labelPhone": "Popisek pole: Telefon",
    "contactPhone": "Telefonní číslo společnosti",
    "billingTitle": "Nadpis bloku: Fakturační údaje",
    "labelAddress": "Popisek pole: Sídlo",
    "contactAddress": "Sídlo / Adresa",
    "labelIco": "Popisek pole: IČO",
    "contactIco": "IČO",
    "labelDic": "Popisek pole: DIČ",
    "contactDic": "DIČ",
    "labelBank": "Popisek pole: Bankovní účet",
    "contactBank": "Bankovní spojení"
};

function getFriendlyCmsLabel(key) {
    if (cmsFieldLabels[key]) return cmsFieldLabels[key];
    if (key.includes('team.')) {
        return key
            .replace('team.', 'Člen týmu – ')
            .replace('.name', 'Jméno')
            .replace('.role', 'Pracovní pozice')
            .replace('.image', 'Obrázek (cesta k fotce)')
            .replace('.bio', 'Biografie / Popis')
            .replace('.tags', 'Dovednosti (štítky)');
    }
    if (key.includes('faq.')) {
        return key
            .replace('faq.', 'FAQ položka – ')
            .replace('.question', 'Otázka')
            .replace('.answer', 'Odpověď');
    }
    return key;
}
