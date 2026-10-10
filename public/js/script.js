const makeWebhookUrl = "https://hook.eu1.make.com/kk5lv67txlhlqo1w2wsmftvuxyk62ipm";

document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================================================
    // 0. DYNAMICKÉ NAČTENÍ Z CMS (PODLE AKTUÁLNÍ STRÁNKY)
    // ==========================================================================
    async function loadCMSContent() {
        try {
            // Zjistíme, jestli jsme v kořenu (index.html) nebo ve složce /pages/ (kontakt.html apod.)
            const isInPagesFolder = window.location.pathname.includes('/pages/');
            const dataPath = isInPagesFolder ? '../data/pages.json' : 'data/pages.json';

            const res = await fetch(`${dataPath}?t=` + Date.now());
            if (!res.ok) return;
            const pages = await res.json();

            // A) Pokud jsme na kontaktní stránce
            const contactData = pages.find(p => p.id === 'contact');
            if (contactData && document.getElementById('contact-email')) {
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
                if (contactData.address) {
                    const el = document.getElementById('contact-address');
                    if (el) el.textContent = contactData.address;
                }
                if (contactData.ico) {
                    const el = document.getElementById('contact-ico');
                    if (el) el.textContent = contactData.ico;
                }
                if (contactData.dic) {
                    const el = document.getElementById('contact-dic');
                    if (el) el.textContent = contactData.dic;
                }
                if (contactData.bank) {
                    const el = document.getElementById('contact-bank');
                    if (el) el.textContent = contactData.bank;
                }
            }

            // B) Pokud jsme na úvodní stránce (index.html)
            const homeData = pages.find(p => p.id === 'home');
            if (homeData) {
                const titleEl = document.querySelector('.tech-main-title') || document.getElementById('main-title');
                if (titleEl && homeData.mainTitle) {
                    titleEl.textContent = homeData.mainTitle;
                }
                const subtitleEl = document.querySelector('.tech-subtitle') || document.getElementById('main-subtitle');
                if (subtitleEl && homeData.mainSubtitle) {
                    subtitleEl.textContent = homeData.mainSubtitle;
                }
            }

        } catch (err) {
            console.error('Chyba při načítání dat z CMS:', err);
        }
    }

    // Spustíme načtení dat
    loadCMSContent();
    
    // ==========================================================================
    // 1. NAVIGACE & OVLÁDÁNÍ MOBILNÍHO MENU
    // ==========================================================================
    
    const menuToggle = document.getElementById('mobile-menu');
    const navPanel = document.getElementById('nav-panel');
    const dimOverlay = document.getElementById('nav-overlay');
    const mainNav = document.getElementById('main-nav');
    const navWrapper = document.getElementById('nav-wrapper');
    
    let lastScrollTop = 0;
    let scrollAtMenuOpen = 0;
    const threshold = 40; 
    const scrollCloseLimit = 80; 

    if (menuToggle && navPanel && dimOverlay) {
        
        function closeMenu() {
            menuToggle.classList.remove('active');
            navPanel.classList.remove('active');
            dimOverlay.classList.remove('active');
        }

        function toggleMenu() {
            const isOpening = !navPanel.classList.contains('active');
            
            if (isOpening) {
                scrollAtMenuOpen = window.scrollY || document.documentElement.scrollTop;
            }

            menuToggle.classList.toggle('active');
            navPanel.classList.toggle('active');
            dimOverlay.classList.toggle('active');
        }

        menuToggle.addEventListener('click', toggleMenu);
        dimOverlay.addEventListener('click', toggleMenu);

        document.querySelectorAll('.nav-list a, .side-socials a').forEach(link => {
            link.addEventListener('click', closeMenu);
        });
    }

    // ==========================================================================
    // 2. SCROLL CHOVÁNÍ (OPTIMALIZOVÁNO)
    // ==========================================================================

    let isScrolling = false;
    let navHeight = mainNav ? mainNav.offsetHeight : 0;
    let isScrolledClass = false;
    let isNavHidden = false;

    window.addEventListener('resize', () => {
        if (mainNav) navHeight = mainNav.offsetHeight;
    }, { passive: true });

    window.addEventListener('scroll', () => {
        if (!isScrolling) {
            window.requestAnimationFrame(() => {
                handleScroll();
                isScrolling = false;
            });
            isScrolling = true;
        }
    }, { passive: true });

    function handleScroll() {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        
        if (navPanel && navPanel.classList.contains('active')) {
            if (Math.abs(scrollTop - scrollAtMenuOpen) > scrollCloseLimit) {
                menuToggle.classList.remove('active');
                navPanel.classList.remove('active');
                dimOverlay.classList.remove('active');
                if (navWrapper) {
                    navWrapper.style.transform = `translateY(-${navHeight}px)`;
                    isNavHidden = true;
                }
                lastScrollTop = scrollTop;
            }
            return;
        }

        if (!navWrapper || !mainNav) return;

        // Zamezení zbytečného přepisování DOMu, pokud se stav nezměnil
        const shouldBeScrolled = scrollTop > 80;
        if (shouldBeScrolled !== isScrolledClass) {
            navWrapper.classList.toggle('scrolled', shouldBeScrolled);
            isScrolledClass = shouldBeScrolled;
        }

        if (scrollTop <= 0) {
            if (isNavHidden) {
                navWrapper.style.transform = "translateY(0)";
                isNavHidden = false;
            }
            lastScrollTop = scrollTop;
            return;
        }

        const scrollDistance = Math.abs(scrollTop - lastScrollTop);

        if (scrollDistance > threshold) {
            if (scrollTop > lastScrollTop && !isNavHidden) {
                navWrapper.style.transform = `translateY(-${navHeight}px)`; 
                isNavHidden = true;
            } else if (scrollTop < lastScrollTop && isNavHidden) {
                navWrapper.style.transform = "translateY(0)";
                isNavHidden = false;
            }
            lastScrollTop = scrollTop;
        }
    }

    // ==========================================================================
    // 3. BOOKING SEKCE - KALENDÁŘ (OPTIMALIZOVANÝ RENDERING)
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
                
                datePresenter.textContent = `${dayName}, ${dayNum}. ${monthName} ${year}`;
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

            // Předchozí měsíc
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

            // Aktuální měsíc
            for (let i = 1; i <= daysInMonth; i++) {
                const meta = getDayMeta(currentYear, currentMonth, i);
                if (!meta.isSelectable) {
                    daysHtml += `<span class="prev-month${meta.classAttr}">${i}</span>`;
                } else {
                    daysHtml += `<span${meta.classAttr ? ` class="${meta.classAttr.trim()}"` : ''} data-time="${meta.timestamp}" data-year="${currentYear}" data-month="${currentMonth}" data-day="${i}">${i}</span>`;
                }
            }

            // Následující měsíc
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

            // Bleskový hover efektivně přes timestampy bez přepočítávání Date objektů
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
    // 4. CUSTOM SELECT TIME OVLÁDÁNÍ
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
    // 5. POTVRZENÍ FORMULÁŘE & ODESLÁNÍ NA WEBHOOK
    // ==========================================================================
    
    const bookingForm = document.getElementById("rezervacni-formular") || document.querySelector('.booking-form');
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
    // 6. FAQ AKORDEON
    // ==========================================================================

    document.querySelectorAll('.faq-question').forEach(question => {
        question.addEventListener('click', () => {
            const currentItem = question.parentElement;
            const currentAnswer = currentItem.querySelector('.faq-answer');
            const isOpen = currentItem.classList.contains('active');
            
            document.querySelectorAll('.faq-item').forEach(item => {
                item.classList.remove('active');
                const answer = item.querySelector('.faq-answer');
                if (answer) {
                    answer.style.maxHeight = null;
                }
            });
            
            if (!isOpen && currentAnswer) {
                currentItem.classList.add('active');
                currentAnswer.style.maxHeight = currentAnswer.scrollHeight + 'px';
            }
        });
    });

    // ==========================================================================
    // 7. HERO VIDEO OBSERVER
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
