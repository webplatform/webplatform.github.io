(function annotatorLoader() {
  var ssl = !! document.location.protocol.match(/^https:/),
      embedUrl = 'https://notes.webplatform.org/embed.js',
      showAnnotator = false;

  if (showAnnotator === true) {
    if (ssl && embedUrl.match(/^https:/)) {
      var msg = ('Sorry, but the annotator sidebar is currently unavailable ' + 'on pages that are served through HTTPS.');
      alert(msg);
    } else {
      var embed = document.createElement('script');
      embed.setAttribute('src', embedUrl);
      document.body.appendChild(embed);
    }
  }
})();