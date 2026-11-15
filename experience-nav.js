(() => {
  if (location.protocol === 'file:') return;
  const pages = [
    ['Mission explorer', '/'],
    ['Opportunity story', '/story.html#mer-b-opportunity/launch'],
    ['Mission atlas', '/atlas.html'],
    ['Ride with Opportunity', '/ride.html'],
    ['Apollo 11 Moon site', '/surface.html?body=moon&mission=apollo-11&event=landing'],
    ['Viking 1 Mars site', '/surface.html?body=mars&mission=viking-1&event=landing'],
    ['Viking 1 orbit', '/orbit.html?mission=viking-1'],
    ['Sources and accuracy', '/atlas-method.html']
  ];
  const nav = document.createElement('nav');
  nav.className = 'experience-nav';
  nav.setAttribute('aria-label', 'Explore the experience');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'experience-nav-button';
  button.textContent = 'Explore all pages ☰';
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', 'experience-pages');
  const list = document.createElement('div');
  list.id = 'experience-pages';
  list.className = 'experience-nav-list';
  list.hidden = true;
  for (const [title, href] of pages) {
    const link = document.createElement('a');
    link.href = href;
    link.textContent = title;
    if (location.pathname + location.search === href.split('#')[0]) link.setAttribute('aria-current', 'page');
    list.append(link);
  }
  button.addEventListener('click', () => {
    list.hidden = !list.hidden;
    button.setAttribute('aria-expanded', String(!list.hidden));
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !list.hidden) {
      list.hidden = true;
      button.setAttribute('aria-expanded', 'false');
      button.focus();
    }
  });
  document.addEventListener('click', event => {
    if (!nav.contains(event.target) && !list.hidden) {
      list.hidden = true;
      button.setAttribute('aria-expanded', 'false');
    }
  });
  nav.append(button, list);
  document.body.append(nav);
})();
