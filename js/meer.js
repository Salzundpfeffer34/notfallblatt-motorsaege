// Meeres-Animation (Wellen + Tiere auf den Karten): pro Box eine zufällige Phase,
// damit bei jedem Seitenaufruf nicht alle Boxen synchron laufen.
;
// Meeres-Animation (Wellen + Tiere auf den Karten): pro Box eine zufällige Phase,
// damit bei jedem Seitenaufruf nicht alle Boxen synchron laufen.
(function () {
  function zufallsPhase() {
    try {
      if (!document.querySelectorAll || !Element.prototype.getAnimations) { return; }
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { return; }
      var cards = document.querySelectorAll('.card:not(.help)');
      for (var i = 0; i < cards.length; i++) {
        var anims = cards[i].getAnimations({ subtree: true });
        for (var j = 0; j < anims.length; j++) {
          var a = anims[j];
          var t = a.effect && a.effect.getTiming ? a.effect.getTiming() : null;
          var dur = t && t.duration;
          if (dur && isFinite(dur) && dur > 0) { a.currentTime = Math.random() * dur; }
        }
      }
    } catch (e) {}
  }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', zufallsPhase); }
  else { zufallsPhase(); }
})();
