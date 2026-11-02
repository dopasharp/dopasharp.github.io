// 도파# analytics: the one GA4 property for the hub and every game.
// The hub pages load this file directly; each game's dopasharp/dopasharp.js loads it from the hub.
// Events: game_view, game_start, game_complete, game_retry, share_click, more_games_click, hub_game_click
// (params game_id, method, placement, from are registered as custom dimensions in GA4).
(function () {
  var GA_ID = 'G-FHBYZVH7QP';
  // Only the live site counts; local previews would pollute the numbers.
  if (!GA_ID || window.__dopaGA || location.hostname !== 'dopasharp.github.io') return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', GA_ID);
  window.__dopaGA = true;

  // Events a game fired before this file arrived (game_view on load, mostly).
  (window.__dopaPending || []).splice(0).forEach(function (e) { window.gtag('event', e[0], e[1]); });

  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
  document.head.appendChild(s);

  // On the hub (home and /games/), which game card people pick.
  if (/^\/(games\/)?$/.test(location.pathname)) {
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href]');
      var m = a && a.href.match(/^https:\/\/dopasharp\.github\.io\/([\w-]+)\/(?:[?#]|$)/);
      if (!m || m[1] === 'games') return;
      window.gtag('event', 'hub_game_click', { game_id: m[1], placement: a.id === 'pick' ? 'today_pick' : 'grid', page: location.pathname });
    });
  }
})();
