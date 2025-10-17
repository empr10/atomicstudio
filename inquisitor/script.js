// ===== Theme Toggle =====
const themeToggle = document.getElementById('themeToggle');
const htmlElement = document.documentElement;

// Check for saved theme preference or default to 'dark'
const currentTheme = localStorage.getItem('theme') || 'dark';
htmlElement.setAttribute('data-theme', currentTheme);

themeToggle.addEventListener('click', () => {
    const theme = htmlElement.getAttribute('data-theme');
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    
    htmlElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Add animation effect
    themeToggle.style.transform = 'rotate(360deg)';
    setTimeout(() => {
        themeToggle.style.transform = '';
    }, 300);
});

// ===== Particle Effect =====
const particlesContainer = document.getElementById('particles');
const particleCount = window.innerWidth < 768 ? 30 : 50;

function createParticle() {
    const particle = document.createElement('div');
    particle.className = 'particle';
    
    // Random starting position
    const startX = Math.random() * window.innerWidth;
    particle.style.left = startX + 'px';
    
    // Random animation duration
    const duration = 10 + Math.random() * 20;
    particle.style.animationDuration = duration + 's';
    
    // Random delay
    const delay = Math.random() * 5;
    particle.style.animationDelay = delay + 's';
    
    // Random size
    const size = 1 + Math.random() * 2;
    particle.style.width = size + 'px';
    particle.style.height = size + 'px';
    
    particlesContainer.appendChild(particle);
    
    // Remove and recreate particle after animation
    setTimeout(() => {
        particle.remove();
        createParticle();
    }, (duration + delay) * 1000);
}

// Create initial particles
for (let i = 0; i < particleCount; i++) {
    setTimeout(() => createParticle(), i * 100);
}

// ===== Smooth Scroll with Offset =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const offset = 80;
            const targetPosition = target.offsetTop - offset;
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// ===== Active Navigation Link =====
const sections = document.querySelectorAll('.chapter');
const navLinks = document.querySelectorAll('.nav-link');

function updateActiveLink() {
    let current = '';
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (window.pageYOffset >= sectionTop - 100) {
            current = section.getAttribute('id');
        }
    });
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === '#' + current) {
            link.classList.add('active');
        }
    });
}

window.addEventListener('scroll', updateActiveLink);

// ===== Reading Progress Bar =====
const progressBar = document.createElement('div');
progressBar.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    height: 3px;
    background: linear-gradient(90deg, var(--accent-primary), var(--accent-secondary));
    z-index: 1001;
    transition: width 0.1s ease;
    box-shadow: var(--glow-effect);
`;
document.body.appendChild(progressBar);

function updateProgressBar() {
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight - windowHeight;
    const scrolled = window.pageYOffset;
    const progress = (scrolled / documentHeight) * 100;
    progressBar.style.width = progress + '%';
}

window.addEventListener('scroll', updateProgressBar);
updateProgressBar();

// ===== Fade In on Scroll Animation =====
// Disabled to ensure all chapters are visible immediately
sections.forEach(section => {
    section.style.opacity = '1';
    section.style.transform = 'none';
});

// ===== Keyboard Navigation =====
document.addEventListener('keydown', (e) => {
    // Press 'T' to toggle theme
    if (e.key === 't' || e.key === 'T') {
        themeToggle.click();
    }
    
    // Press 'Escape' to scroll to top
    if (e.key === 'Escape') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
});

// ===== Performance Optimization =====
let ticking = false;

function requestTick(callback) {
    if (!ticking) {
        window.requestAnimationFrame(() => {
            callback();
            ticking = false;
        });
        ticking = true;
    }
}

window.addEventListener('scroll', () => {
    requestTick(() => {
        updateProgressBar();
        updateActiveLink();
    });
});

// Initialize state on load
updateActiveLink();

// ===== Mobile Menu Toggle (if needed) =====
if (window.innerWidth < 768) {
    const navChapters = document.querySelector('.nav-chapters');
    let isMenuOpen = false;
    
    const menuToggle = document.createElement('button');
    menuToggle.innerHTML = '☰';
    menuToggle.style.cssText = `
        background: none;
        border: none;
        color: var(--text-primary);
        font-size: 1.5rem;
        cursor: pointer;
        padding: 0.5rem;
    `;
    
    const navContainer = document.querySelector('.nav-container');
    navContainer.insertBefore(menuToggle, navChapters);
    
    navChapters.style.display = 'none';
    
    menuToggle.addEventListener('click', () => {
        isMenuOpen = !isMenuOpen;
        navChapters.style.display = isMenuOpen ? 'flex' : 'none';
        menuToggle.innerHTML = isMenuOpen ? '✕' : '☰';
    });
    
    // Close menu when clicking a link
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navChapters.style.display = 'none';
            isMenuOpen = false;
            menuToggle.innerHTML = '☰';
        });
    });
}

// ===== Console Easter Egg =====
console.log('%c🔥 Инквизитор 🔥', 'font-size: 20px; font-weight: bold; color: #8b5cf6;');
console.log('%cДобро пожаловать в мир темного фэнтези...', 'font-size: 14px; color: #b8b8c8;');
console.log('%cНажмите "T" для переключения темы', 'font-size: 12px; color: #808090;');
