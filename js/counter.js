(function () {
  try {
    if (location.protocol !== 'http:' && location.protocol !== 'https:') { return; }
    var data = {
      site: 'notfallblatt',
      tz: (Intl.DateTimeFormat().resolvedOptions().timeZone || ''),
      lang: (navigator.language || ''),
      ref: (document.referrer || '')
    };
    if (navigator.sendBeacon) {
      var fd = new FormData();
      for (var k in data) { fd.append(k, data[k]); }
      navigator.sendBeacon('counter.php', fd);
    } else {
      fetch('counter.php', { method: 'POST', keepalive: true, body: new URLSearchParams(data) }).catch(function () {});
    }
  } catch (e) {}
})();
