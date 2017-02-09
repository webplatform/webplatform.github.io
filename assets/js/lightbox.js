if (document.querySelector) {
  (function () {
    /**
     * Expected markup
     *
     *   <p class="intro">
     *     <a href="http://www.youtube.com/embed/Ug6XAw6hzaw?autoplay=1" target="_blank" rel="lightbox">
     *     <img src="http://img.youtube.com/vi/Ug6XAw6hzaw/0.jpg" alt="video preview" />
     *     <span class="description">Opening the Web Platform</span>
     *     </a>
     *   </p>
     *   <div id="lightbox">
     *     <a href="#" title="Close">&times;</a>
     *     <iframe src="about:blank" id="video" name="video" frameborder="0" allowfullscreen></iframe>
     *   </div>
     *
     *   @TODO make it reusable without id singleton (id=video and id=lightbox)
     *
     *   Also requires:
     *     - /css/lightbox.css
     */

    var lightbox = document.getElementById('lightbox'),
        iframe = lightbox.querySelector('iframe'),
        close = lightbox.querySelector('a');

    var links = document.querySelectorAll('[rel="lightbox"]');
    var onClickHandler = function () {
      lightbox.className = 'open';

      var me = this;
      setTimeout(function () {
        iframe.src = me.href;
      }, 1500);

      return false;
    };
    for (var i = 0, link; link = links[i++];) {
      link.onclick = onClickHandler;
    }

    close.onclick = function () {
      lightbox.className = 'closed';
      iframe.src = 'about:blank';
      return false;
    };

  })();
}