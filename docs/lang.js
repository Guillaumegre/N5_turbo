// French / English switch shared by every page. Remembers the choice; defaults to the browser language.
(function () {
  var KEY = 'n5turbo-site-lang';
  var btnFr = document.getElementById('btn-fr');
  var btnEn = document.getElementById('btn-en');

  function setLang(lang) {
    document.querySelectorAll('section.doc').forEach(function (el) {
      el.dataset.active = String(el.dataset.lang === lang);
    });
    document.querySelectorAll('[data-t]').forEach(function (el) {
      el.classList.toggle('on', el.dataset.t === lang);
    });
    btnFr.setAttribute('aria-pressed', String(lang === 'fr'));
    btnEn.setAttribute('aria-pressed', String(lang === 'en'));
    document.documentElement.lang = lang;
    try { localStorage.setItem(KEY, lang); } catch (e) {}
  }

  btnFr.addEventListener('click', function () { setLang('fr'); });
  btnEn.addEventListener('click', function () { setLang('en'); });

  var lang = (navigator.language || '').toLowerCase().indexOf('fr') === 0 ? 'fr' : 'en';
  try {
    var saved = localStorage.getItem(KEY);
    if (saved === 'fr' || saved === 'en') lang = saved;
  } catch (e) {}
  setLang(lang);

  // support.html#delete-account is the account-deletion link given to Google Play:
  // scroll to that answer in whichever language is showing.
  if (location.hash === '#delete-account') {
    var target = document.getElementById(lang === 'fr' ? 'delete-account' : 'delete-account-en');
    if (target) target.scrollIntoView();
  }
})();
