(() => {
  const PAGE_NAMES = {
    '/': 'main',
    '/index.html': 'main',
    '/resume': 'resume',
    '/resume.html': 'resume',
    '/projects': 'projects',
    '/projects.html': 'projects',
    '/contact': 'contact',
    '/contact.html': 'contact'
  };
  const ANALYTICS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbxTP5h06kKleZrbuAGIvBIMYhaFSfuWZUpurZnpfcuxDAOZAdnMMdRNUvrKFbfTGseVTg/exec';
  const OWNER_USER_AGENT_MARKER = 'Win64; x64';

  const sanitize = value => {
    if (value === null || value === undefined) return 'unknown';
    if (typeof value === 'string' && value.trim() === '') return 'hidden';
    return value;
  };

  const page = PAGE_NAMES[window.location.pathname] || window.location.pathname;
  const isOwner = navigator.userAgent.includes(OWNER_USER_AGENT_MARKER);

  const sendAnalytics = () => {
    fetch('https://ipwho.is/')
      .then(response => response.json())
      .then(ipData => fetch(ANALYTICS_ENDPOINT, {
        method: 'POST',
        keepalive: true,
        body: JSON.stringify({
          ip: sanitize(ipData.ip),
          country: sanitize(ipData.country),
          region: sanitize(ipData.region),
          city: sanitize(ipData.city),
          page,
          ua: navigator.userAgent,
          org: sanitize(ipData.connection?.org),
          isp: sanitize(ipData.connection?.isp),
          is_me: isOwner
        })
      }))
      .catch(() => {
        // Analytics is optional and must never affect the page experience.
      });
  };

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(sendAnalytics, { timeout: 2000 });
  } else {
    window.setTimeout(sendAnalytics, 0);
  }
})();
