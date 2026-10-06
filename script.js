(function () {
    'use strict';

    const body = document.body;
    const header = document.querySelector('.site-header');
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    const navItems = navLinks ? [...navLinks.querySelectorAll('a[href^="#"]')] : [];
    const navSectionIds = new Set(navItems.map(link => link.hash.slice(1)));
    const themeToggle = document.querySelector('.theme-toggle');
    const contactForm = document.getElementById('contact-form');
    const formStatus = document.getElementById('form-status');
    const successMessage = document.getElementById('form-success-message');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    body.classList.add('js-enabled');

    function setTheme(isDark) {
        body.classList.toggle('dark-mode', isDark);
        body.classList.toggle('light-mode', !isDark);
        if (!themeToggle) return;

        themeToggle.setAttribute('aria-pressed', String(isDark));
        themeToggle.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
    }

    function initializeTheme() {
        let isDark = false;
        try {
            isDark = localStorage.getItem('theme') === 'dark';
        } catch (error) {
            console.warn('The saved theme preference could not be read.', error);
        }
        setTheme(isDark);

        themeToggle?.addEventListener('click', () => {
            const nextThemeIsDark = !body.classList.contains('dark-mode');
            setTheme(nextThemeIsDark);
            try {
                localStorage.setItem('theme', nextThemeIsDark ? 'dark' : 'light');
            } catch (error) {
                console.warn('The theme preference could not be saved.', error);
            }
        });
    }

    function closeMenu(returnFocus = false) {
        if (!menuToggle || !navLinks) return;
        menuToggle.setAttribute('aria-expanded', 'false');
        navLinks.classList.remove('is-open');
        if (returnFocus) menuToggle.focus();
    }

    function initializeNavigation() {
        if (!header) return;

        menuToggle?.addEventListener('click', () => {
            const isOpen = menuToggle.getAttribute('aria-expanded') !== 'true';
            menuToggle.setAttribute('aria-expanded', String(isOpen));
            navLinks?.classList.toggle('is-open', isOpen);
        });

        navItems.forEach(link => link.addEventListener('click', () => closeMenu()));

        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && menuToggle?.getAttribute('aria-expanded') === 'true') {
                closeMenu(true);
            }
        });

        const mobileBreakpoint = window.matchMedia('(max-width: 820px)');
        mobileBreakpoint.addEventListener('change', () => closeMenu());

        let scrollQueued = false;
        function updateHeader() {
            header.classList.toggle('scrolled', window.scrollY > 20);

            let currentSection = 'home';
            const offset = header.offsetHeight + 40;
            document.querySelectorAll('main section[id]').forEach(section => {
                if (navSectionIds.has(section.id) && section.getBoundingClientRect().top <= offset) {
                    currentSection = section.id;
                }
            });

            navItems.forEach(link => {
                if (link.hash === `#${currentSection}`) {
                    link.setAttribute('aria-current', 'location');
                } else {
                    link.removeAttribute('aria-current');
                }
            });
            scrollQueued = false;
        }

        window.addEventListener('scroll', () => {
            if (scrollQueued) return;
            scrollQueued = true;
            window.requestAnimationFrame(updateHeader);
        }, { passive: true });
        updateHeader();
    }

    function initializeReveals() {
        const revealItems = document.querySelectorAll('[data-reveal]');
        if (reducedMotion.matches || !('IntersectionObserver' in window)) {
            revealItems.forEach(item => item.classList.add('is-visible'));
            return;
        }

        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            });
        }, { threshold: 0.12 });

        revealItems.forEach(item => observer.observe(item));
    }

    function initializeContactForm() {
        if (!contactForm || !formStatus || !successMessage) return;

        contactForm.addEventListener('submit', async event => {
            event.preventDefault();
            if (!contactForm.reportValidity()) return;

            const submitButton = contactForm.querySelector('[type="submit"]');
            if (!submitButton || submitButton.disabled) return;

            submitButton.disabled = true;
            contactForm.setAttribute('aria-busy', 'true');
            formStatus.dataset.state = 'pending';
            formStatus.setAttribute('role', 'status');
            formStatus.setAttribute('aria-live', 'polite');
            formStatus.textContent = 'Sending your message…';

            try {
                const response = await fetch(contactForm.action, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(Object.fromEntries(new FormData(contactForm)))
                });
                const result = await response.json();

                if (!response.ok || !result || result.success !== true) {
                    const message = result && typeof result.message === 'string'
                        ? result.message
                        : 'Your message could not be sent. Please try again.';
                    throw new Error(message);
                }

                formStatus.textContent = '';
                delete formStatus.dataset.state;
                contactForm.hidden = true;
                successMessage.hidden = false;
                successMessage.focus();
            } catch (error) {
                console.warn('Contact form submission failed.', error);
                formStatus.dataset.state = 'error';
                formStatus.setAttribute('role', 'alert');
                formStatus.setAttribute('aria-live', 'assertive');
                formStatus.textContent = error.message || 'Your message could not be sent. Check your connection and try again.';
            } finally {
                submitButton.disabled = false;
                contactForm.removeAttribute('aria-busy');
            }
        });
    }

    function initializeFluidBackground() {
        const canvas = document.getElementById('fluid-canvas');
        if (!canvas || reducedMotion.matches || typeof startFluidAnimation !== 'function') return;

        const lowMemory = typeof navigator.deviceMemory === 'number' && navigator.deviceMemory <= 4;
        const lowCoreCount = typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency <= 4;
        if (window.matchMedia('(max-width: 768px)').matches || lowMemory || lowCoreCount) return;

        startFluidAnimation(canvas);
    }

    const year = document.getElementById('current-year');
    if (year) year.textContent = String(new Date().getFullYear());

    initializeTheme();
    initializeNavigation();
    initializeReveals();
    initializeContactForm();
    initializeFluidBackground();
})();
