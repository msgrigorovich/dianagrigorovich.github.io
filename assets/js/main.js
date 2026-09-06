
const el = document.querySelector('.typing-text');
const HELLO_TEXT = 'Hello, World!';
const QUALITY_TEXT = 'Quality is not an act ...';
const HABIT_TEXT = '... it is a habit!';
let currentTypingText = HELLO_TEXT;
let helloIterations = 0;
let index = 0;
let typingForward = true;
let firstTypeDone = false;
let onFirstTypeComplete = null;
let skipIntroAnimations = false;
let typingActive = false;
let typingTimer = null;
let signatureInkEnabled = false;

function typeEffect() {
  if (!el || !typingActive) return;
  el.classList.toggle('typing-quote', currentTypingText !== HELLO_TEXT);
  if (typingForward) {
    if (index <= currentTypingText.length) {
      el.textContent = currentTypingText.substring(0, index);
      index++;
      typingTimer = setTimeout(typeEffect, 100);
    } else {
      typingForward = false;
      if (currentTypingText === HELLO_TEXT) helloIterations++;
      if (!firstTypeDone) {
        firstTypeDone = true;
        if (onFirstTypeComplete) onFirstTypeComplete();
      }
      typingTimer = setTimeout(typeEffect, 2000);
    }
  } else {
    if (index >= 0) {
      el.textContent = currentTypingText.substring(0, index);
      index--;
      typingTimer = setTimeout(typeEffect, 50);
    } else {
      typingForward = true;
      if (currentTypingText === HELLO_TEXT && helloIterations === 2) {
        currentTypingText = QUALITY_TEXT;
      } else if (currentTypingText === QUALITY_TEXT) {
        currentTypingText = HABIT_TEXT;
      } else if (currentTypingText === HABIT_TEXT) {
        currentTypingText = HELLO_TEXT;
        helloIterations = 0;
      }
      const nextDelay = currentTypingText === HABIT_TEXT ? 120 : 500;
      typingTimer = setTimeout(typeEffect, nextDelay);
    }
  }
}

function animateSignature() {
  const svg = document.querySelector('.name-signature');
  if (!svg) {
    document.documentElement.classList.remove('main-intro-pending');
    return Promise.resolve();
  }

  const paths = Array.from(svg.querySelectorAll('.signature-path'));
  if (!paths.length) {
    document.documentElement.classList.remove('main-intro-pending');
    return Promise.resolve();
  }

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const SVG_NS = 'http://www.w3.org/2000/svg';
  let defs = svg.querySelector('defs');
  if (!defs) {
    defs = document.createElementNS(SVG_NS, 'defs');
    svg.insertBefore(defs, svg.firstChild);
  }

  const duration = 250;
  const stagger = 100;
  const maskStrokeWidth = 18;

  const ordered = paths
    .map(p => ({ p, bbox: p.getBBox(), d: p.getAttribute('d') }))
    .sort((a, b) => a.bbox.x - b.bbox.x);

  const traces = [];

  ordered.forEach(({ p, d }, i) => {
    const maskId = `sig-mask-${i}`;
    const mask = document.createElementNS(SVG_NS, 'mask');
    mask.setAttribute('id', maskId);
    mask.setAttribute('maskUnits', 'userSpaceOnUse');

    const tracePath = document.createElementNS(SVG_NS, 'path');
    tracePath.setAttribute('d', d);
    tracePath.setAttribute('fill', 'none');
    tracePath.setAttribute('stroke', '#fff');
    tracePath.setAttribute('stroke-width', maskStrokeWidth);
    tracePath.setAttribute('stroke-linecap', 'round');
    tracePath.setAttribute('stroke-linejoin', 'round');
    mask.appendChild(tracePath);
    defs.appendChild(mask);
    p.setAttribute('mask', `url(#${maskId})`);

    if (!prefersReducedMotion) {
      const length = tracePath.getTotalLength();
      tracePath.style.strokeDasharray = length;
      tracePath.style.strokeDashoffset = length;
      traces.push({ tracePath, length, delay: i * stagger });
    }
  });

  // All paths are masked and reset before the SVG can become visible, so the
  // completed signature can never flash for a frame ahead of the animation.
  document.documentElement.classList.remove('main-intro-pending');
  if (prefersReducedMotion) return Promise.resolve();

  const finished = traces.map(({ tracePath, length, delay }) => {
    try {
      return tracePath.animate(
        [{ strokeDashoffset: length }, { strokeDashoffset: 0 }],
        { duration, delay, easing: 'ease-out', fill: 'forwards' }
      ).finished;
    } catch (e) {
      tracePath.style.strokeDashoffset = '0';
      return Promise.resolve();
    }
  });

  return Promise.all(finished).catch(() => {});
}

function revealRestOfPage() {
  document.querySelectorAll('.fade-in-content').forEach(section => {
    section.classList.add('visible');
  });
}

function startTyping() {
  if (skipIntroAnimations || typingActive) return;
  signatureInkEnabled = true;
  typingActive = true;
  if (el) el.classList.add('typing-active');
  onFirstTypeComplete = revealRestOfPage;
  typeEffect();
}

function runIntro() {
  const block = document.querySelector('.signature-block');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!block || prefersReducedMotion) {
    animateSignature().then(startTyping);
    return;
  }

  const naturalRect = block.getBoundingClientRect();
  const centerLeft = (window.innerWidth - naturalRect.width) / 2;
  const centerTop = (window.innerHeight - naturalRect.height) / 2;

  // The safety clamp is based on the actual visible signature graphic, not
  // `.signature-block`'s own box (which stretches to fill its container and is
  // mostly invisible empty space around the centered svg) - otherwise the clamp
  // kicked in even on wide desktop screens and killed the enlargement almost entirely.
  const svg = block.querySelector('.name-signature');
  const svgWidth = svg ? svg.getBoundingClientRect().width : naturalRect.width;
  const viewportMargin = 24;
  const maxScaleForViewport = (window.innerWidth - viewportMargin * 2) / svgWidth;
  const introScale = Math.min(1.2, Math.max(1, maxScaleForViewport));
  const dx = centerLeft - naturalRect.left;
  const dy = centerTop - naturalRect.top;

  // Position is fixed at the true final (natural) spot from the very start and never
  // changes; the centered/enlarged look during writing is done purely via `transform`
  // (translate + scale), which the browser can animate on the compositor without
  // recomputing layout every frame. Animating `left`/`top` directly was prone to jank
  // that showed up as the signature "snapping" the last bit of the way at the end.
  block.style.position = 'fixed';
  block.style.margin = '0';
  block.style.width = `${naturalRect.width}px`;
  block.style.left = `${naturalRect.left}px`;
  block.style.top = `${naturalRect.top}px`;
  block.style.zIndex = '10';
  block.style.transform = `translate(${dx}px, ${dy}px) scale(${introScale})`;

  animateSignature().then(() => {
    setTimeout(() => {
      const finish = () => {
        block.style.position = '';
        block.style.margin = '';
        block.style.width = '';
        block.style.left = '';
        block.style.top = '';
        block.style.zIndex = '';
        block.style.transform = '';
        startTyping();
      };

      try {
        const anim = block.animate(
          [
            { transform: `translate(${dx}px, ${dy}px) scale(${introScale})` },
            { transform: 'translate(0px, 0px) scale(1)' }
          ],
          { duration: 700, easing: 'ease-in-out', fill: 'forwards' }
        );
        anim.finished.then(finish).catch(finish);
      } catch (e) {
        finish();
      }
    }, 150);
  });
}

const MAIN_PATHS = ['/', '/index.html'];
const SKIP_MAIN_INTRO_KEY = 'skip-main-intro-once';
const MAIN_RETURN_TINT_KEY = 'main-return-tint';

const PAGE_TINTS = {
  resume: '184, 211, 233',
  projects: '252, 183, 172',
  contact: '198, 246, 200'
};

function isMainPath(pathname) {
  return MAIN_PATHS.includes(pathname);
}

function pageNameFromPath(pathname) {
  if (pathname.includes('resume')) return 'resume';
  if (pathname.includes('projects')) return 'projects';
  if (pathname.includes('contact')) return 'contact';
  return '';
}

function revealReturnTint() {
  if (!isMainPath(window.location.pathname)) return;
  const sourcePage = sessionStorage.getItem(MAIN_RETURN_TINT_KEY);
  sessionStorage.removeItem(MAIN_RETURN_TINT_KEY);
  if (!PAGE_TINTS[sourcePage]) return;

  const tintWasPreparedBeforePaint = document.documentElement.classList.contains('return-page-tint-pending');
  if (!tintWasPreparedBeforePaint) {
    document.body.style.setProperty('--return-page-tint', PAGE_TINTS[sourcePage]);
    document.body.classList.add('return-page-tint');
  }
  setTimeout(() => {
    document.body.classList.remove('return-page-tint');
    document.documentElement.classList.remove('return-page-tint-pending');
  }, 1200);
}

function showMainPageImmediately() {
  // The typing heading starts empty and the remaining sections start hidden in CSS.
  // Put everything directly into its final state when returning from an inner page.
  document.documentElement.classList.add('return-page-ready');
  document.documentElement.classList.remove('main-intro-pending');
  skipIntroAnimations = true;
  typingActive = false;
  clearTimeout(typingTimer);
  typingTimer = null;
  index = 0;
  typingForward = true;
  currentTypingText = HELLO_TEXT;
  firstTypeDone = true;
  onFirstTypeComplete = null;
  if (el) {
    el.textContent = '';
    el.classList.add('typing-active');
  }

  const signatureBlock = document.querySelector('.signature-block');
  if (signatureBlock) {
    signatureBlock.getAnimations().forEach(animation => animation.cancel());
    signatureBlock.style.position = '';
    signatureBlock.style.margin = '';
    signatureBlock.style.width = '';
    signatureBlock.style.left = '';
    signatureBlock.style.top = '';
    signatureBlock.style.zIndex = '';
    signatureBlock.style.transform = '';
  }

  document.querySelectorAll('.name-signature mask path').forEach(path => {
    path.getAnimations().forEach(animation => animation.cancel());
    path.style.strokeDashoffset = '0';
  });

  revealRestOfPage();
  signatureInkEnabled = true;
  typingActive = true;
  typeEffect();
}

const shouldSkipMainIntro =
  isMainPath(window.location.pathname) &&
  sessionStorage.getItem(SKIP_MAIN_INTRO_KEY) === 'true';

const currentInnerPage = pageNameFromPath(window.location.pathname);
if (currentInnerPage) {
  sessionStorage.setItem(MAIN_RETURN_TINT_KEY, currentInnerPage);
}

if (shouldSkipMainIntro) {
  sessionStorage.removeItem(SKIP_MAIN_INTRO_KEY);
  showMainPageImmediately();
} else {
  const startIntroWithStableLayout = () => runIntro();
  if (document.fonts?.ready) {
    document.fonts.ready.then(startIntroWithStableLayout, startIntroWithStableLayout);
  } else {
    startIntroWithStableLayout();
  }
}

revealReturnTint();

// When the browser restores the main page from its back/forward cache, the script
// is not executed again. Consume the same flag on `pageshow` and stop any intro
// callbacks that may still be pending from before the user left the page.
window.addEventListener('pageshow', () => {
  if (
    isMainPath(window.location.pathname) &&
    sessionStorage.getItem(SKIP_MAIN_INTRO_KEY) === 'true'
  ) {
    sessionStorage.removeItem(SKIP_MAIN_INTRO_KEY);
    showMainPageImmediately();
    revealReturnTint();
  }
});

const logo = document.querySelector('.logo');

if (logo) {
  logo.addEventListener('click', function (e) {
    sessionStorage.removeItem('pixel-cursor-color');
    const current = window.location.pathname;
    if (isMainPath(current)) {
      e.preventDefault();
      // Clicking the logo while already on the main page intentionally replays
      // the intro, just like refreshing the page.
      window.location.reload();
    }
  });
}

document.querySelectorAll('a').forEach(link => {
  const href = link.getAttribute('href');
  const current = window.location.pathname;

  if (!href || href.startsWith('http')) return;

  const linkPath = new URL(href, window.location.origin).pathname;

  if (isMainPath(current) && !isMainPath(linkPath)) {
    link.addEventListener('click', () => {
      sessionStorage.setItem(SKIP_MAIN_INTRO_KEY, 'true');
    });
  }

  if (isMainPath(linkPath) && !isMainPath(current)) {
    link.addEventListener('click', () => {
      sessionStorage.setItem(SKIP_MAIN_INTRO_KEY, 'true');
      sessionStorage.setItem(MAIN_RETURN_TINT_KEY, pageNameFromPath(current));
    });
  }

  if (linkPath === current || (linkPath.endsWith('/') && current === '/')) {
    link.addEventListener('click', e => e.preventDefault());
  }
});

document.querySelectorAll('.buttons .circle').forEach(circle => {
  circle.addEventListener('pointerenter', () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    circle.classList.remove('droplet-impact', 'droplet-release');
    void circle.offsetWidth;
    circle.classList.add('droplet-impact');
  });
  circle.addEventListener('pointerleave', event => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = circle.getBoundingClientRect();
    const angle = Math.atan2(
      event.clientY - (rect.top + rect.height / 2),
      event.clientX - (rect.left + rect.width / 2)
    ) * 180 / Math.PI;

    circle.style.setProperty('--droplet-release-angle', `${angle}deg`);
    circle.style.setProperty('--droplet-release-angle-reverse', `${-angle}deg`);
    circle.classList.remove('droplet-impact', 'droplet-release');
    void circle.offsetWidth;
    circle.classList.add('droplet-release');
  });
  circle.addEventListener('animationend', () => {
    circle.classList.remove('droplet-impact', 'droplet-release');
  });
});

const cursorDot = document.querySelector('.cursor-dot');
const cursorOutline = document.querySelector('.cursor-outline');
const cursorOutlineInner = document.querySelector('.cursor-outline-inner');

sessionStorage.removeItem('cursor-effect');

const navigationEntry = performance.getEntriesByType('navigation')[0];
if (navigationEntry?.type === 'reload') {
  sessionStorage.removeItem('pixel-cursor-color');
}
const isResumePage = pageNameFromPath(window.location.pathname) === 'resume';
const isProjectsPage = pageNameFromPath(window.location.pathname) === 'projects';
const isContactPage = pageNameFromPath(window.location.pathname) === 'contact';
const isHomePage = isMainPath(window.location.pathname);
const resumeCursorColor = '143,169,190';
const projectsCursorColor = '17,17,17';
let pixelCursorColor = isResumePage
  ? resumeCursorColor
  : isProjectsPage || isContactPage || isHomePage
    ? projectsCursorColor
    : sessionStorage.getItem('pixel-cursor-color') || '120,0,255';

cursorDot.style.backgroundColor = `rgb(${pixelCursorColor})`;
cursorOutlineInner.style.backgroundColor = `rgba(${pixelCursorColor}, 0.08)`;
cursorOutlineInner.style.borderColor = `rgb(${pixelCursorColor})`;

function interactionColorFor(element) {
  const styles = window.getComputedStyle(element);
  const background = styles.backgroundColor;
  const backgroundParts = background.match(/[\d.]+/g)?.map(Number) || [];
  const backgroundAlpha = backgroundParts.length > 3 ? backgroundParts[3] : 1;
  const hasVisibleBackground = backgroundParts.length >= 3 && backgroundAlpha > 0.18;
  const sourceParts = hasVisibleBackground
    ? backgroundParts
    : styles.color.match(/[\d.]+/g)?.map(Number) || [17, 17, 17];
  const contrastFactor = hasVisibleBackground ? 0.78 : 1;

  return sourceParts
    .slice(0, 3)
    .map(channel => Math.round(channel * contrastFactor))
    .join(',');
}

function setupSignatureInkInteraction() {
  const signature = document.querySelector('.name-signature');
  const signatureBlock = document.querySelector('.signature-block');
  if (!signature || !signatureBlock || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  signature.classList.add('signature-ink-original');

  let inactivityTimer;
  let recoveryTimer;
  let lastPoint = null;
  let lastColor = '';
  const inkLayers = new Map();

  const getInkLayer = color => {
    if (inkLayers.has(color)) return inkLayers.get(color);

    const element = signature.cloneNode(true);
    element.classList.add('signature-ink-clone');
    element.classList.remove('name-signature');
    element.setAttribute('aria-hidden', 'true');
    element.querySelector('defs')?.remove();
    element.querySelectorAll('[mask]').forEach(path => path.removeAttribute('mask'));
    element.style.setProperty('--signature-ink-color', `rgb(${color})`);
    signatureBlock.appendChild(element);

    const layer = { element, points: [] };
    inkLayers.set(color, layer);
    return layer;
  };

  signature.addEventListener('mousemove', event => {
    if (!signatureInkEnabled) return;

    const rect = signature.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const cursorChannels = pixelCursorColor.split(',').map(Number);
    const inkChannels = [26, 26, 26];
    const mixedInkColor = inkChannels
      .map((channel, index) => Math.round((channel + cursorChannels[index]) / 2))
      .join(',');

    const layer = getInkLayer(mixedInkColor);
    if (lastColor !== mixedInkColor || !lastPoint || Math.hypot(x - lastPoint.x, y - lastPoint.y) >= 8) {
      layer.points.push({ x, y });
      lastPoint = { x, y };
      lastColor = mixedInkColor;
    }

    const inkMask = layer.points.map(point => (
      `radial-gradient(circle 54px at ${point.x}px ${point.y}px, `
      + '#000 0 42%, rgba(0, 0, 0, 0.76) 68%, transparent 100%)'
    )).join(',');

    clearTimeout(inactivityTimer);
    clearTimeout(recoveryTimer);
    signatureBlock.classList.remove('signature-ink-recovering');
    signatureBlock.classList.add('signature-ink-active');
    layer.element.style.webkitMaskImage = inkMask;
    layer.element.style.maskImage = inkMask;

    inactivityTimer = setTimeout(() => {
      signatureBlock.classList.add('signature-ink-recovering');
      recoveryTimer = setTimeout(() => {
        signatureBlock.classList.remove('signature-ink-active', 'signature-ink-recovering');
        inkLayers.forEach(layerToRemove => layerToRemove.element.remove());
        inkLayers.clear();
        lastPoint = null;
        lastColor = '';
      }, 2050);
    }, 2000);
  });
}

setupSignatureInkInteraction();


let mouseX = 0, mouseY = 0;
let outlineX = 0, outlineY = 0;
let mouseInitialized = false;
let isHoveringClickable = false;
let outlineTickerActive = false;

function updateCursorOutline() {
  if (!mouseInitialized) return;
  const speed = isHoveringClickable ? 0.18 : 0.12;
  outlineX += (mouseX - outlineX) * speed;
  outlineY += (mouseY - outlineY) * speed;
  gsap.set(cursorOutline, { x: outlineX, y: outlineY });

  if (Math.abs(mouseX - outlineX) < 0.05 && Math.abs(mouseY - outlineY) < 0.05) {
    outlineX = mouseX;
    outlineY = mouseY;
    gsap.set(cursorOutline, { x: outlineX, y: outlineY });
    gsap.ticker.remove(updateCursorOutline);
    outlineTickerActive = false;
  }
}

function startCursorOutlineTicker() {
  if (outlineTickerActive) return;
  outlineTickerActive = true;
  gsap.ticker.add(updateCursorOutline);
}

if (cursorDot && cursorOutline) {
  window.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;

    if (!mouseInitialized) {

      gsap.set(cursorDot, { x: mouseX, y: mouseY });
      gsap.set(cursorOutline, { x: mouseX, y: mouseY });
      outlineX = mouseX;
      outlineY = mouseY;
      mouseInitialized = true;
    }

    startCursorOutlineTicker();

   
    gsap.to(cursorDot, {
      x: mouseX,
      y: mouseY,
      duration: 0.1,
      ease: 'power3.out'
    });
  });

}

document.querySelectorAll('a, button').forEach(el => {
el.addEventListener('mouseenter', () => {
    isHoveringClickable = true;

    pixelCursorColor = interactionColorFor(el);
    sessionStorage.setItem('pixel-cursor-color', pixelCursorColor);

    const dotRect = cursorDot.getBoundingClientRect();

    mouseX = dotRect.left + dotRect.width / 2;
    mouseY = dotRect.top + dotRect.height / 2;

    gsap.to(cursorDot, {
      backgroundColor: `rgb(${pixelCursorColor})`,
      duration: 0.2,
      ease: 'power2.out'
    });

    gsap.to(cursorOutlineInner, {
      backgroundColor: `rgba(${pixelCursorColor}, 0.2)`,
      duration: 0.2,
      ease: 'power2.out'
    });

    gsap.to(cursorOutlineInner, {
      borderColor: `rgb(${pixelCursorColor})`,
      duration: 0.2,
      ease: 'power2.out'
    });

    gsap.to(cursorOutline, {
      scale: 1.8,
      duration: 0.3,
      ease: 'power2.out'
    });
  });

  el.addEventListener('mouseleave', () => {
    isHoveringClickable = false;
    if (isResumePage) {
      pixelCursorColor = resumeCursorColor;
    }

    gsap.to(cursorDot, {
      backgroundColor: `rgb(${pixelCursorColor})`,
      duration: 0.2,
      ease: 'power2.out'
    });

    gsap.to(cursorOutlineInner, {
      backgroundColor: `rgba(${pixelCursorColor}, 0.08)`,
      duration: 0.2,
      ease: 'power2.out'
    });

    gsap.to(cursorOutlineInner, {
      borderColor: `rgb(${pixelCursorColor})`,
      duration: 0.2,
      ease: 'power2.out'
    });

    gsap.to(cursorOutline, {
      scale: 1,
      duration: 0.3,
      ease: 'power2.out'
    });
  });
});

const canvas = document.querySelector('.cursor-trail');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

let trail = [];
const TRAIL_LIFETIME = 280;
const TRAIL_FADE_DURATION = 180;
const TRAIL_POINT_INTERVAL = 14;
let lastTrailPointAt = 0;
let trailFrame = 0;

function requestTrailFrame() {
  if (!trailFrame) trailFrame = requestAnimationFrame(drawTrail);
}

window.addEventListener('mousemove', (e) => {
  const now = performance.now();
  if (now - lastTrailPointAt < TRAIL_POINT_INTERVAL) return;
  lastTrailPointAt = now;

  trail.push({
    x: e.clientX,
    y: e.clientY,
    alpha: 0.72,
    color: pixelCursorColor,
    createdAt: now,
    lifetime: TRAIL_LIFETIME,
    fadeDuration: TRAIL_FADE_DURATION
  });

  if (trail.length > 2000) {
    trail.splice(0, trail.length - 2000);
  }

  requestTrailFrame();
});

function drawTrail(now = performance.now()) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  trail.forEach(p => {
    const age = now - p.createdAt;
    const fadeStart = p.lifetime - p.fadeDuration;
    const fadeProgress = Math.max(0, (age - fadeStart) / p.fadeDuration);
    const visibleAlpha = p.alpha * (1 - Math.min(fadeProgress, 1));
    const size = 7;
    ctx.fillStyle = `rgba(${p.color},${visibleAlpha})`;
    ctx.fillRect(
      Math.round(p.x / size) * size,
      Math.round(p.y / size) * size,
      size,
      size
    );
  });

  trail = trail.filter(p => now - p.createdAt < p.lifetime);
  trailFrame = trail.length ? requestAnimationFrame(drawTrail) : 0;
}

function animateProgressBar() {
  const container = document.querySelector('.progress-bar-fill');
  const percentText = document.querySelector('.progress-percentage');

  if (!container || !percentText) return;

  const startDate = new Date('2021-09-15');
  const endDate = new Date('2027-12-01');
  const today = new Date();

  const totalDays = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
  const passedDays = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
  const percent = Math.min((passedDays / totalDays) * 100, 100);
  const rounded = parseFloat(percent.toFixed(2));
  const progressSection = container.closest('[data-progress-mode]');
  const isCompact = progressSection?.dataset.progressMode === 'compact';

  if (isCompact) {
    container.style.width = `${rounded}%`;
    percentText.textContent = `${rounded.toFixed(2)}%`;
    const daysLeft = Math.max(Math.ceil((endDate - today) / (1000 * 60 * 60 * 24)), 0);
    const daysText = progressSection.querySelector('.portfolio-build-days');
    if (daysText) daysText.textContent = `Full portfolio in ${daysLeft} days`;
    progressSection.setAttribute(
      'aria-label',
      `Portfolio build ${rounded.toFixed(2)} percent complete. ${daysLeft} days until December 1, 2027.`
    );
    return;
  }

  const totalSegments = 40;
  const filledSegments = Math.round((percent / 100) * totalSegments);

  // Segment Animation
  for (let i = 0; i < filledSegments; i++) {
    const segment = document.createElement('div');
    segment.classList.add('progress-segment');
    segment.style.animationDelay = `${i * 0.05}s`;
    container.appendChild(segment);
  }

  let currentPercent = 0;
  const duration = filledSegments * 50;
  const stepTime = 10;
  const totalSteps = duration / stepTime;
  const increment = rounded / totalSteps;

  // Calculate days left
  const daysLeft = Math.max(Math.ceil((endDate - today) / (1000 * 60 * 60 * 24)), 0);

  // Create element for days left message
  let daysLeftMsg = document.querySelector('.progress-days-left');
  if (!daysLeftMsg) {
    daysLeftMsg = document.createElement('div');
    daysLeftMsg.className = 'progress-days-left';
    percentText.parentNode.insertBefore(daysLeftMsg, percentText.nextSibling);
  }
  daysLeftMsg.textContent = '';

  const counter = setInterval(() => {
    currentPercent += increment;
    if (currentPercent >= rounded) {
      percentText.textContent = `${rounded.toFixed(2)}% COMPLETE`;
      clearInterval(counter);
      // Show days left message
      daysLeftMsg.textContent = `I am very grateful for the presence of this page, however it is in the waiting stage of my projects. There is an end date for this development and it is ${daysLeft} days away. I believe that you will return to this page.`;
      // Fade-in
      setTimeout(() => {
        daysLeftMsg.style.opacity = '1';
      }, 100);
    } else {
      percentText.textContent = `${currentPercent.toFixed(2)}% COMPLETE`;
    }
  }, stepTime);
}


window.addEventListener('DOMContentLoaded', animateProgressBar);

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contactForm');
  const successMessage = document.getElementById('formSuccess');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());

      try {
        const response = await fetch('https://formspree.io/f/mkgjybaz', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        });

        if (response.ok) {
          form.reset();
          successMessage.style.display = 'block';
          setTimeout(() => {
            successMessage.style.opacity = 1;
          }, 100);
        } else {
          alert('Something went wrong. Please try again later.');
        }
      } catch (error) {
        alert('Error: ' + error.message);
      }
    });
  }
});
