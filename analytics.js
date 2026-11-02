// 도파# analytics: one Google Tag Manager container for the hub and every game.
// The hub pages load this file directly; each game's dopasharp/dopasharp.js loads it from the hub.
// GA4 itself is set up inside the GTM container (Google tag + a GA4 event tag on the custom events below).
// Events reach GTM as dataLayer pushes: { event: 'game_start', game_id: 'croc-chomp', ... }
//   game_view, game_start, game_complete, game_retry, share_click, more_games_click, hub_game_click
(function () {
  var GTM_ID = 'GTM-PRJKW5FZ';
  if (!GTM_ID || window.__dopaGA) return;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });

  // dopasharp.js sends with gtag('event', name, params); turn that into a GTM custom event.
  window.gtag = function (command, name, params) {
    if (command !== 'event') return;
    var e = { event: name };
    for (var k in params) e[k] = params[k];
    window.dataLayer.push(e);
  };
  window.__dopaGA = true;

  // Events a game fired before this file arrived (game_view on load, mostly).
  (window.__dopaPending || []).splice(0).forEach(function (e) { window.gtag('event', e[0], e[1]); });

  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtm.js?id=' + GTM_ID;
  document.head.appendChild(s);

  // On the hub (home and /games/), which game card people pick.
  if (location.hostname === 'dopasharp.github.io' && /^\/(games\/)?$/.test(location.pathname)) {
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href]');
      var m = a && a.href.match(/^https:\/\/dopasharp\.github\.io\/([\w-]+)\/(?:[?#]|$)/);
      if (!m || m[1] === 'games') return;
      window.gtag('event', 'hub_game_click', { game_id: m[1], placement: a.id === 'pick' ? 'today_pick' : 'grid', page: location.pathname });
    });
  }
})();
