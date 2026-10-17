const makeWebhookUrl = "https://hook.eu1.make.com/kk5lv67txlhlqo1w2wsmftvuxyk62ipm";

document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================================================
    // 0. NAČTENÍ COMMON.JSON (Hlavička & Patička)
    // ==========================================================================
    async function loadCommonData() {
        try {
            const isInSubfolder = window.location.pathname.includes('/public/pages/');
            const pathPrefix = isInSubfolder ? '../../' : '';
            const commonJsonPath = isInSubfolder ? '../../public/data/common.json' : 'public/data/common.json';

            const resCommon = await fetch(commonJsonPath + '?t=' + Date.now());
            if (!resCommon.ok) return;
            const cData = await resCommon.json();

            // Logo
            const logoLink = document.getElementById('header-logo-link');
            if (logoLink) logoLink.href = pathPrefix + 'index.html';

            // Štítky / Popisky
            if (cData.header) {
                if (document.getElementById('label-header-email') && cData.header.labelEmail) {
                    document.getElementById('label-header-email').textContent = cData.header.labelEmail;
                }
                if (document.getElementById('label-header-phone') && cData.header.labelPhone) {
                    document.getElementById('label-header-phone').textContent = cData.header.labelPhone;
                }
                if (document.getElementById('label-header-socials') && cData.header.labelSocials) {
                    document.getElementById('label-header-socials').textContent = cData.header.labelSocials;
                }
            }

            // Email & Telefon
            const emailEl = document.getElementById('header-email');
            if (emailEl && cData.header.email) {
                emailEl.textContent = cData.header.email;
                emailEl.href = 'mailto:' + cData.header.email;
            }

            const phoneEl = document.getElementById('header-phone');
            if (phoneEl && cData.header.phone) {
                phoneEl.textContent = cData.header.phone;
                phoneEl.href = 'tel:' + cData.header.phone.replace(/\s+/g, '');
            }

            // Sociální sítě
            const socialsContainer = document.getElementById('header-socials');
            if (socialsContainer && cData.header.instagram) {
                socialsContainer.innerHTML = `
                    <a href="${cData.header.instagram}" target="_blank">Instagram</a>
                    <a href="${cData.header.facebook}" target="_blank">Facebook</a>
                    <a href="${cData.header.youtube}" target="_blank">YouTube</a>
                `;
            }

            // Navigační lišta
            const navList = document.getElementById('dynamic-nav-list');
            if (navList && cData.header.navLinks) {
                navList.innerHTML = cData.header.navLinks.map((link, idx) => {
                    let finalUrl = link.url;
                    if (!finalUrl.startsWith('http') && !finalUrl.startsWith('#')) {
                        finalUrl = pathPrefix + finalUrl.replace(/^(\.\.\/)+/, '');
                    }
                    const isActive = (idx === 0 && window.location.pathname.endsWith('index.html')) ? 'class="active"' : '';
                    return `<li ${isActive}><a href="${finalUrl}">${link.text}</a></li>`;
                }).join('');
            }

            // Patička
            const footerGrid = document.getElementById('dynamic-footer-grid');
            if (footerGrid && cData.footer.columns) {
                let brandHtml = `
                    <div class="footer-brand">
                        <h3>${cData.footer.brandTitle}</h3>
                        <p>${cData.footer.tagline}</p>
                    </div>
                `;

                let colsHtml = cData.footer.columns.map(col => {
                    let linksList = col.links.map(l => {
                        let fUrl = l.url;
                        if (!fUrl.startsWith('http') && !fUrl.startsWith('#')) {
                            fUrl = pathPrefix + fUrl.replace(/^(\.\.\/)+/, '');
                        }
                        return `<li><a href="${fUrl}">${l.text}</a></li>`;
                    }).join('');

                    return `
                        <div class="footer-column">
                            <h4>${col.title}</h4>
                            <ul>${linksList}</ul>
                        </div>
                    `;
                }).join('');

                footerGrid.innerHTML = brandHtml + colsHtml;
            }

            const copyrightEl = document.getElementById('footer-copyright');
            if (copyrightEl && cData.footer.copyright) {
                copyrightEl.textContent = cData.footer.copyright;
            }

        } catch (err) {
            console.error('Chyba při načítání common.json:', err);
        }
    }

    loadCommonData();

    // ==========================================================================
    // 1. DYNAMICKÉ NAČTENÍ Z index.json
    // ==========================================================================
    async function loadIndexData() {
        try {
            const res = await fetch(`public/data/index.json?t=` + Date.now());
            if (!res.ok) return;
            const data = await res.json();

            // Hero sekce
            const heroEl = document.getElementById('hero-title');
            if (heroEl && data.heroTitle) heroEl.textContent = data.heroTitle;

            const btnDrony = document.getElementById('hero-btn-drony');
            if (btnDrony && data.heroBtnDrony) btnDrony.textContent = data.heroBtnDrony;

            const btnFpv = document.getElementById('hero-btn-fpv');
            if (btnFpv && data.heroBtnFpv) btnFpv.textContent = data.heroBtnFpv;

            // Divize / specializace
            const divSectionTitle = document.getElementById('divisions-section-title');
            if (divSectionTitle && data.divisionsTitle) divSectionTitle.textContent = data.divisionsTitle;

            const divisionsContainer = document.getElementById('divisions-container');
            if (divisionsContainer && data.divisions && Array.isArray(data.divisions)) {
                divisionsContainer.innerHTML = '';
                data.divisions.forEach((div, index) => {
                    const isReverse = index % 2 === 1;
                    const rowClass = isReverse ? 'showcase-row row-reverse' : 'showcase-row';

                    const row = document.createElement('div');
                    row.className = rowClass;
                    row.innerHTML = `
                        <div class="showcase-media">
                            <a href="${div.link}" class="media-container">
                                <img src="${div.image}" alt="${div.title}" class="media-bg-img" loading="lazy" decoding="async" width="800" height="450">
                                <div class="media-overlay"></div>
                                <span class="media-badge">${div.badge}</span>
                            </a>
                        </div>
                        <div class="showcase-text">
                            <div class="huge-bg-number">${div.number}</div>
                            <h3 class="row-title"><a href="${div.link}">${div.title}</a></h3>
                            <p class="row-description">${div.description}</p>
                            <a href="${div.link}" class="btn-drone-action">
                                <span>${div.btnText}</span>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                            </a>
                        </div>
                    `;
                    divisionsContainer.appendChild(row);
                });
            }

            // Trust / Partneři
            const trustTitleEl = document.getElementById('trust-section-title');
            if (trustTitleEl && data.trustTitle) trustTitleEl.textContent = data.trustTitle;

            const trustEl = document.getElementById('trust-text');
            if (trustEl && data.trustText) trustEl.textContent = data.trustText;

            // Booking / Rezervace texty
            const bookingTitleEl = document.getElementById('booking-section-title');
            if (bookingTitleEl && data.bookingTitle) bookingTitleEl.textContent = data.bookingTitle;

            const bookingHeadingEl = document.getElementById('booking-heading');
            if (bookingHeadingEl && data.bookingHeading) bookingHeadingEl.textContent = data.bookingHeading;

            const inputName = document.getElementById('form-jmeno');
            if (inputName && data.formPlaceholderName) inputName.placeholder = data.formPlaceholderName;

            const inputEmail = document.getElementById('form-email');
            if (inputEmail && data.formPlaceholderEmail) inputEmail.placeholder = data.formPlaceholderEmail;

            const inputPhone = document.getElementById('form-telefon');
            if (inputPhone && data.formPlaceholderPhone) inputPhone.placeholder = data.formPlaceholderPhone;

            const inputProj = document.getElementById('form-projekt');
            if (inputProj && data.formPlaceholderProject) inputProj.placeholder = data.formPlaceholderProject;

            const submitBtn = document.getElementById('form-submit-btn');
            if (submitBtn && data.formSubmitBtn) submitBtn.textContent = data.formSubmitBtn;

        } catch (err) {
            console.error('Chyba při načítání index.json:', err);
        }
    }

    loadIndexData();

    // ==========================================================================
    // 2. BOOKING SEKCE - KALENDÁŘ
    // ==========================================================================
    const calendarGrid = document.querySelector('.calendar-grid');
    const monthYearText = document.querySelector('.current-month');
    const prevBtn = document.getElementById('prev-month-btn');
    const nextBtn = document.getElementById('next-month-btn');
    const datePresenter = document.getElementById('selected-date-presenter');

    let selectedStartDate = null;
    let selectedEndDate = null;
    const realTodayMidnight = new Date(); realTodayMidnight.setHours(0,0,0,0);

    if (calendarGrid && monthYearText) {
        const edgeDayCalculation = new Date();
        edgeDayCalculation.setHours(0, 0, 0, 0);
        edgeDayCalculation.setDate(edgeDayCalculation.getDate() + 3); 
        let currentMonth = edgeDayCalculation.getMonth();
        let currentYear = edgeDayCalculation.getFullYear();

        const monthsCZ = [
            "LEDEN", "ÚNOR", "BŘEZEN", "DUBEN", "KVĚTEN", "ČERVEN", 
            "ČERVENEC", "SRPEN", "ZÁŘÍ", "ŘÍJEN", "LISTOPAD", "PROSINEC"
        ];
        
        const daysOfWeekCZ = [
            "Neděle", "Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek", "Sobota"
        ];

        function updateDatePresenter() {
            if (!datePresenter) return;
            
            if (!selectedStartDate) {
                datePresenter.textContent = "";
                datePresenter.className = "date-unselected";
            } else if (selectedStartDate && !selectedEndDate) {
                const dayName = daysOfWeekCZ[selectedStartDate.getDay()];
                const dayNum = selectedStartDate.getDate();
                const monthName = monthsCZ[selectedStartDate.getMonth()].toLowerCase();
                const year = selectedStartDate.getFullYear();
                
                datePresenter.textContent = `${dayName}, ${dayNum}. ${monthname = monthName} ${year}`;
                datePresenter.className = "date-selected";
            } else {
                const startDay = selectedStartDate.getDate();
                const startMonth = monthsCZ[selectedStartDate.getMonth()].toLowerCase();
                const endDay = selectedEndDate.getDate();
                const endMonth = monthsCZ[selectedEndDate.getMonth()].toLowerCase();
                const year = selectedEndDate.getFullYear();

                if (clearTime(selectedStartDate) === clearTime(selectedEndDate)) {
                    const dayName = daysOfWeekCZ[selectedStartDate.getDay()];
                    datePresenter.textContent = `${dayName}, ${startDay}. ${startMonth} ${year}`;
                } else {
                    datePresenter.textContent = `${startDay}. ${startMonth} — ${endDay}. ${endMonth} ${year}`;
                }
                datePresenter.className = "date-selected";
            }
        }

        function clearTime(date) {
            const d = new Date(date.getTime());
            d.setHours(0, 0, 0, 0);
            return d.getTime();
        }

        function renderCalendar() {
            calendarGrid.innerHTML = "";

            const firstDay = new Date(currentYear, currentMonth, 1).getDay();
            const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
            const prevLastDay = new Date(currentYear, currentMonth, 0).getDate();
            const startDayIndex = firstDay === 0 ? 6 : firstDay - 1;

            monthYearText.textContent = `${monthsCZ[currentMonth]} ${currentYear}`;

            let daysHtml = "";
            const edgeDay = new Date();
            edgeDay.setHours(0, 0, 0, 0);
            edgeDay.setDate(edgeDay.getDate() + 3);

            function getDayMeta(y, m, d) {
                const dateObj = new Date(y, m, d, 0, 0, 0, 0);
                const thisTimestamp = dateObj.getTime();
                const startTimestamp = selectedStartDate ? clearTime(selectedStartDate) : null;
                const endTimestamp = selectedEndDate ? clearTime(selectedEndDate) : null;

                let classes = [];
                if (thisTimestamp === realTodayMidnight.getTime()) classes.push("today");
                if (startTimestamp && thisTimestamp === startTimestamp) classes.push("active-day");
                if (endTimestamp && thisTimestamp === endTimestamp) classes.push("active-day");
                if (startTimestamp && endTimestamp && thisTimestamp > startTimestamp && thisTimestamp < endTimestamp) {
                    classes.push("range-day");
                }

                return {
                    classAttr: classes.length > 0 ? ` ${classes.join(" ")}` : "",
                    timestamp: thisTimestamp,
                    isSelectable: dateObj >= edgeDay
                };
            }

            let prevM = currentMonth - 1, prevY = currentYear;
            if (prevM < 0) { prevM = 11; prevY--; }

            for (let x = startDayIndex; x > 0; x--) {
                const dayNum = prevLastDay - x + 1;
                const meta = getDayMeta(prevY, prevM, dayNum);
                if (!meta.isSelectable) {
                    daysHtml += `<span class="prev-month${meta.classAttr}">${dayNum}</span>`;
                } else {
                    daysHtml += `<span class="prev-month${meta.classAttr}" data-time="${meta.timestamp}" data-year="${prevY}" data-month="${prevM}" data-day="${dayNum}">${dayNum}</span>`;
                }
            }

            for (let i = 1; i <= daysInMonth; i++) {
                const meta = getDayMeta(currentYear, currentMonth, i);
                if (!meta.isSelectable) {
                    daysHtml += `<span class="prev-month${meta.classAttr}">${i}</span>`;
                } else {
                    daysHtml += `<span${meta.classAttr ? ` class="${meta.classAttr.trim()}"` : ''} data-time="${meta.timestamp}" data-year="${currentYear}" data-month="${currentMonth}" data-day="${i}">${i}</span>`;
                }
            }

            let nextM = currentMonth + 1, nextY = currentYear;
            if (nextM > 11) { nextM = 0; nextY++; }

            const totalSlotsUsed = startDayIndex + daysInMonth;
            const remainingSlots = totalSlotsUsed % 7 === 0 ? 0 : 7 - (totalSlotsUsed % 7);
            for (let j = 1; j <= remainingSlots; j++) {
                const meta = getDayMeta(nextY, nextM, j);
                if (!meta.isSelectable) {
                    daysHtml += `<span class="prev-month${meta.classAttr}">${j}</span>`;
                } else {
                    daysHtml += `<span class="prev-month${meta.classAttr}" data-time="${meta.timestamp}" data-year="${nextY}" data-month="${nextM}" data-day="${j}">${j}</span>`;
                }
            }

            calendarGrid.innerHTML = daysHtml;

            const selectableSpans = Array.from(calendarGrid.querySelectorAll('span[data-time]'));
            
            selectableSpans.forEach(day => {
                day.style.cursor = 'pointer';

                day.addEventListener('mouseenter', function() {
                    if (!selectedStartDate || selectedEndDate) return;

                    const hoverTimestamp = Number(this.getAttribute('data-time'));
                    const startTimestamp = clearTime(selectedStartDate);
                    const min = Math.min(startTimestamp, hoverTimestamp);
                    const max = Math.max(startTimestamp, hoverTimestamp);

                    selectableSpans.forEach(s => {
                        const t = Number(s.getAttribute('data-time'));
                        if (t > min && t < max) {
                            s.classList.add('hover-range-day');
                        } else {
                            s.classList.remove('hover-range-day');
                        }
                    });
                });

                day.addEventListener('click', function() {
                    const dYear = parseInt(this.getAttribute('data-year'), 10);
                    const dMonth = parseInt(this.getAttribute('data-month'), 10);
                    const dDay = parseInt(this.getAttribute('data-day'), 10);
                    const clickedDate = new Date(dYear, dMonth, dDay);

                    if (!selectedStartDate || (selectedStartDate && selectedEndDate)) {
                        selectedStartDate = clickedDate;
                        selectedEndDate = null;
                    } else if (selectedStartDate && !selectedEndDate) {
                        const clickedTime = clearTime(clickedDate);
                        const startTime = clearTime(selectedStartDate);

                        if (clickedTime < startTime) {
                            selectedEndDate = selectedStartDate;
                            selectedStartDate = clickedDate;
                        } else {
                            selectedEndDate = clickedDate;
                        }
                    }

                    renderCalendar(); 
                    updateDatePresenter();
                    validateTimeOptions();
                });
            });

            calendarGrid.addEventListener('mouseleave', () => {
                if (selectedStartDate && !selectedEndDate) {
                    selectableSpans.forEach(s => s.classList.remove('hover-range-day'));
                }
            });

            const minAllowedDate = new Date();
            minAllowedDate.setHours(0, 0, 0, 0);
            minAllowedDate.setDate(minAllowedDate.getDate() + 3);
            if (currentYear < minAllowedDate.getFullYear() || 
               (currentYear === minAllowedDate.getFullYear() && currentMonth <= minAllowedDate.getMonth())) {
                if (prevBtn) {
                    prevBtn.style.opacity = "0.2";
                    prevBtn.style.pointerEvents = "none";
                }
            } else if (prevBtn) {
                prevBtn.style.opacity = "1";
                prevBtn.style.pointerEvents = "auto";
            }
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                currentMonth--;
                if (currentMonth < 0) {
                    currentMonth = 11;
                    currentYear--;
                }
                renderCalendar();
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                currentMonth++;
                const limitDate = new Date();
                limitDate.setFullYear(limitDate.getFullYear() + 1);
                
                if (currentYear > limitDate.getFullYear() || (currentYear === limitDate.getFullYear() && currentMonth > limitDate.getMonth())) {
                    currentMonth--; 
                    return; 
                }

                if (currentMonth > 11) {
                    currentMonth = 0;
                    currentYear++;
                }
                renderCalendar();
            });
        }

        renderCalendar();
        updateDatePresenter();
    }

    // ==========================================================================
    // 3. CUSTOM SELECT TIME OVLÁDÁNÍ
    // ==========================================================================
    const customSelects = document.querySelectorAll('.custom-select-wrapper');
    
    function validateTimeOptions() {
        const limitDate = new Date();
        limitDate.setHours(0, 0, 0, 0);
        limitDate.setDate(limitDate.getDate() + 3);
        const minAllowedTimestamp = limitDate.getTime();

        const realFromSelect = document.getElementById('real-time-select-from');
        const realToSelect = document.getElementById('real-time-select-to');
        const fromValue = realFromSelect ? realFromSelect.value : "";
        const toValue = realToSelect ? realToSelect.value : "";

        function timeToMinutes(timeStr) {
            if (!timeStr) return 0;
            const [hours, minutes] = timeStr.split(':').map(Number);
            return hours * 60 + minutes;
        }

        const fromMinutes = timeToMinutes(fromValue);

        customSelects.forEach(customSelect => {
            const trigger = customSelect.querySelector('.custom-select-trigger');
            const options = customSelect.querySelectorAll('.custom-options-list li');
            const isFrom = customSelect.id === 'custom-time-select-from';
            const realSelectId = isFrom ? 'real-time-select-from' : 'real-time-select-to';
            const realSelect = document.getElementById(realSelectId);

            let triggerResetNeeded = false;

            options.forEach(option => {
                const timeVal = option.getAttribute('data-value'); 
                if (!timeVal) return;

                const [hours, minutes] = timeVal.split(':').map(Number);
                const optionMinutes = timeToMinutes(timeVal);
                
                if (!selectedStartDate) {
                    option.style.opacity = "0.2";
                    option.style.pointerEvents = "none";
                    return;
                }

                const activeValidationDate = (isFrom || !selectedEndDate) ? selectedStartDate : selectedEndDate;
                const optionDate = new Date(activeValidationDate.getTime());
                optionDate.setHours(hours, minutes, 0, 0);

                if (optionDate.getTime() < minAllowedTimestamp) {
                    option.style.opacity = "0.2";
                    option.style.pointerEvents = "none";
                    option.classList.remove('selection');
                    
                    if (realSelect && realSelect.value === timeVal) {
                        realSelect.value = "";
                        triggerResetNeeded = true;
                    }
                    return;
                }
                
                if (!isFrom && fromValue && optionMinutes <= fromMinutes) {
                    option.style.display = 'none';
                    option.classList.remove('selection');
                    
                    if (realSelect && realSelect.value === timeVal) {
                        realSelect.value = "";
                        triggerResetNeeded = true;
                    }
                } else {
                    option.style.display = 'block';
                    option.style.opacity = "1";
                    option.style.pointerEvents = "auto";
                }
            });

            if (triggerResetNeeded && trigger) {
                trigger.innerText = isFrom ? 'Čas od...' : 'Čas do...';
                customSelect.classList.remove('selected');
            }
        });
            
        if (fromValue && toValue && timeToMinutes(toValue) <= fromMinutes) {
            if (realToSelect) realToSelect.value = "";
            const customToWrapper = document.getElementById('custom-time-select-to');
            if (customToWrapper) {
                const toTrigger = customToWrapper.querySelector('.custom-select-trigger');
                const toOptions = customToWrapper.querySelectorAll('.custom-options-list li');
                if (toTrigger) toTrigger.innerText = 'Čas do...';
                customToWrapper.classList.remove('selected');
                toOptions.forEach(opt => opt.classList.remove('selection'));
            }
        }
    }
    
    customSelects.forEach(customSelect => {
        const trigger = customSelect.querySelector('.custom-select-trigger');
        const options = customSelect.querySelectorAll('.custom-options-list li');
        
        const isFrom = customSelect.id === 'custom-time-select-from';
        const realSelectId = isFrom ? 'real-time-select-from' : 'real-time-select-to';
        const realSelect = document.getElementById(realSelectId);

        if (trigger) {
            trigger.addEventListener('click', function(e) {
                e.stopPropagation();
                
                if (!selectedStartDate) {
                    alert("Nejprve prosím vyberte dostupné datum v kalendáři.");
                    return;
                }
                
                customSelects.forEach(select => {
                    if (select !== customSelect) select.classList.remove('open');
                });
                
                customSelect.classList.toggle('open');
            });
        }

        options.forEach(option => {
            option.addEventListener('click', function(e) {
                e.stopPropagation();
                const chosenValue = this.getAttribute('data-value');
                const chosenText = this.innerText;

                if (trigger) trigger.innerText = chosenText;
                customSelect.classList.add('selected');
                customSelect.classList.remove('open');

                if (realSelect) realSelect.value = chosenValue;

                options.forEach(opt => opt.classList.remove('selection'));
                this.classList.add('selection');

                validateTimeOptions();
            });
        });
    });

    document.addEventListener('click', function(e) {
        customSelects.forEach(customSelect => {
            if (!customSelect.contains(e.target)) {
                customSelect.classList.remove('open');
            }
        });
    });

    validateTimeOptions();

    // ==========================================================================
    // 4. POTVRZENÍ FORMULÁŘE & ODESLÁNÍ NA WEBHOOK
    // ==========================================================================
    const bookingForm = document.getElementById("rezervacni-formular");
    if (bookingForm) {
        bookingForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            if (!selectedStartDate) {
                alert("Vyberte prosím datum a čas.");
                return;
            }

            const btn = this.querySelector('.btn-confirm');
            const originalText = btn ? btn.textContent : 'POTVRDIT REZERVACI';
            
            const presenterElement = document.getElementById("selected-date-presenter");
            const vybraneDatum = presenterElement ? presenterElement.innerText : "Nevybráno";

            const realFromSelect = document.getElementById("real-time-select-from");
            const realToSelect = document.getElementById("real-time-select-to");
            const casFrom = realFromSelect ? realFromSelect.value : "";
            const casTo = realToSelect ? realToSelect.value : "";
            
            const kompletniTermin = `${vybraneDatum} (${casFrom || '--:--'} - ${casTo || '--:--'})`;

            const data = {
                jmeno: document.getElementById("form-jmeno")?.value || "",
                email: document.getElementById("form-email")?.value || "",
                telefon: document.getElementById("form-telefon")?.value || "",
                datum: kompletniTermin,
                projekt: document.getElementById("form-projekt")?.value || ""
            };

            if (btn) {
                btn.textContent = 'ODESÍLÁM...';
                btn.style.pointerEvents = 'none';
            }

            fetch(makeWebhookUrl, {
                method: "POST",
                mode: "no-cors",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(data)
            })
            .then(() => {
                if (btn) {
                    btn.textContent = 'POTVRZENO ✓';
                    btn.style.background = 'var(--accent-tech)';
                    btn.style.color = '#080808'; 
                }

                alert("Rezervace úspěšně odeslána!");
                
                setTimeout(() => {
                    if (btn) {
                        btn.textContent = originalText;
                        btn.style.background = 'transparent';
                        btn.style.color = 'var(--accent-tech)';
                        btn.style.pointerEvents = 'auto';
                    }
                    
                    bookingForm.reset(); 
                    
                    customSelects.forEach(customSelect => {
                        const trigger = customSelect.querySelector('.custom-select-trigger');
                        const options = customSelect.querySelectorAll('.custom-options-list li');
                        const isFrom = customSelect.id === 'custom-time-select-from';
                        
                        if (trigger) trigger.innerText = isFrom ? 'Čas od...' : 'Čas do...';
                        customSelect.classList.remove('selected', 'open');
                        options.forEach(opt => opt.classList.remove('selection'));
                    });

                    selectedStartDate = null;
                    selectedEndDate = null;
                    
                    renderCalendar();
                    updateDatePresenter();
                    validateTimeOptions();

                }, 3000);
            })
            .catch(error => {
                console.error("Chyba:", error);
                alert("Došlo k technické chybě při odesílání.");
                if (btn) {
                    btn.textContent = originalText;
                    btn.style.pointerEvents = 'auto';
                }
            });
        });
    }

    // ==========================================================================
    // 5. HERO VIDEO OBSERVER
    // ==========================================================================
    const heroVideo = document.getElementById('heroVideo');

    if (heroVideo) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    heroVideo.play().catch(() => {});
                } else {
                    heroVideo.pause();
                }
            });
        }, { threshold: 0.05 });

        observer.observe(heroVideo);
    }
});
