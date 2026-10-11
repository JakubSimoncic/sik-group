document.addEventListener('DOMContentLoaded', () => {
    async function loadKontaktData() {
        try {
            const path = window.location.pathname;
            const isInPagesFolder = path.includes('/pages/');
            const dataPath = isInPagesFolder ? '../data/kontakt.json' : 'public/data/kontakt.json';

            const res = await fetch(`${dataPath}?t=` + Date.now());
            if (!res.ok) return;
            const data = await res.json();

            // 0. Hlavní nadpisy a popisky stránek z CMS (contactPage)
            const cPage = data.contactPage;
            if (cPage) {
                const teamTitleEl = document.getElementById('team-section-title');
                if (teamTitleEl && cPage.teamSectionTitle) teamTitleEl.textContent = cPage.teamSectionTitle;

                const faqTitleEl = document.getElementById('faq-section-title');
                if (faqTitleEl && cPage.faqSectionTitle) faqTitleEl.textContent = cPage.faqSectionTitle;

                const contactTitleEl = document.getElementById('contact-section-title');
                if (contactTitleEl && cPage.contactSectionTitle) contactTitleEl.textContent = cPage.contactSectionTitle;

                const businessTitleEl = document.getElementById('business-block-title');
                if (businessTitleEl && cPage.businessTitle) businessTitleEl.textContent = cPage.businessTitle;

                const billingTitleEl = document.getElementById('billing-block-title');
                if (billingTitleEl && cPage.billingTitle) billingTitleEl.textContent = cPage.billingTitle;

                if (cPage.labels) {
                    const l = cPage.labels;
                    if (l.email) { const el = document.getElementById('label-email'); if (el) el.textContent = l.email; }
                    if (l.phone) { const el = document.getElementById('label-phone'); if (el) el.textContent = l.phone; }
                    if (l.address) { const el = document.getElementById('label-address'); if (el) el.textContent = l.address; }
                    if (l.ico) { const el = document.getElementById('label-ico'); if (el) el.textContent = l.ico; }
                    if (l.dic) { const el = document.getElementById('label-dic'); if (el) el.textContent = l.dic; }
                    if (l.bank) { const el = document.getElementById('label-bank'); if (el) el.textContent = l.bank; }
                }
            }

            // 1. Kontakty a fakturační údaje
            const contactData = data.contact;
            if (contactData) {
                if (contactData.email) {
                    document.querySelectorAll('#contact-email, .contact-email-target').forEach(el => {
                        el.textContent = contactData.email;
                        el.href = `mailto:${contactData.email}`;
                    });
                }
                if (contactData.phone) {
                    document.querySelectorAll('#contact-phone, .contact-phone-target').forEach(el => {
                        el.textContent = contactData.phone;
                        el.href = `tel:${contactData.phone.replace(/\s+/g, '')}`;
                    });
                }
                const addressEl = document.getElementById('contact-address');
                if (addressEl && contactData.address) addressEl.textContent = contactData.address;

                const icoEl = document.getElementById('contact-ico');
                if (icoEl && contactData.ico) icoEl.textContent = contactData.ico;

                const dicEl = document.getElementById('contact-dic');
                if (dicEl && contactData.dic) dicEl.textContent = contactData.dic;

                const bankEl = document.getElementById('contact-bank');
                if (bankEl && contactData.bank) bankEl.textContent = contactData.bank;
            }

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
