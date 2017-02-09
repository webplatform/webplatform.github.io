
// =========================================================================
// ie7-graphics.js
// =========================================================================

// a small transparent image used as a placeholder
var BLANK_GIF = makePath("blank.gif", path);

var ALPHA_IMAGE_LOADER = "DXImageTransform.Microsoft.AlphaImageLoader";
var PNG_FILTER = "progid:" + ALPHA_IMAGE_LOADER + "(src='%1',sizingMethod='%2')";
  
// regular expression version of the above
var PNG;

var filtered = [];

function fixImage(element) {
  if (PNG.test(element.src)) {
    // we have to preserve width and height
    var image = new Image(element.width, element.height);
    image.onload = function() {
      element.width = image.width;
      element.height = image.height;
      image = null;
    };
    image.src = element.src;
    // store the original url (we'll put it back when it's printed)
    element.pngSrc = element.src;
    // add the AlphaImageLoader thingy
    addFilter(element);
  }
};

if (appVersion < 7) {
  // ** IE7 VARIABLE
  // e.g. apply the hack to all files ending in ".png"
  // IE7_PNG_SUFFIX = ".png";
  // You can also set it to a RegExp
  // IE7_PNG_SUFFIX = /\d+\.png$/;

  // replace background(-image): url(..) ..  with background(-image): .. ;filter: ..;
  IE7.CSS.addFix(/background(-image)?\s*:\s*([^};]*)?url\(([^\)]+)\)([^;}]*)?/, function(match, $1, $2, url, $4) {
    url = getString(url);
    return PNG.test(url) ? "filter:" + format(PNG_FILTER, url, $4.indexOf("no-repeat") === -1 ? "scale" : "crop") +
      ";zoom:1;background" + ($1||"") + ":" + ($2||"") + "none" + ($4||"") : match;
  });

  // list-style-image
  IE7.CSS.addRecalc(/list\-style(\-image)?/, "[^};]*url", function(element) {
    var url = element.currentStyle.listStyleImage.slice(5, -2);
    if (PNG.test(url)) {
      if (element.nodeName === "LI") {
        fixListStyleImage(element, url)
      } else if (element.nodeName === "UL") {
        for (var i = 0, li; li = element.childNodes[i]; i++) {
          if (li.nodeName === "LI") fixListStyleImage(li, url);
        }
      }
    }
  });

  function fixListStyleImage(element, src) {
    var style = element.runtimeStyle;
    var originalHeight = element.offsetHeight;
    var image = new Image;
    image.onload = function() {
      var paddingLeft = element.currentStyle.paddingLeft;
      paddingLeft = paddingLeft === "0px" ? 0 : getPixelValue(element, paddingLeft);
      style.paddingLeft = (paddingLeft + this.width) + "px";
      style.marginLeft = -this.width + "px";
      style.listStyleType = "none";
      style.listStyleImage = "none";
      style.paddingTop = Math.max(originalHeight - element.offsetHeight, 0) + "px";
      addFilter(element, "crop", src);
      element.style.zoom = "100%";
    };
    image.src = src;
  };
  
  // -----------------------------------------------------------------------
  //  fix PNG transparency (HTML images)
  // -----------------------------------------------------------------------

  IE7.HTML.addRecalc("img,input", function(element) {
    if (element.nodeName === "INPUT" && element.type !== "image") return;
    fixImage(element);
    addEventHandler(element, "onpropertychange", function() {
      if (!printing && event.propertyName === "src" &&
        element.src.indexOf(BLANK_GIF) === -1) fixImage(element);
    });
  });

  // assume that background images should not be printed
  //  (if they are not transparent then they'll just obscure content)
  // but we'll put foreground images back...
  var printing = false;
  addEventHandler(window, "onbeforeprint", function() {
    printing = true;
    for (var i = 0; i < filtered.length; i++) removeFilter(filtered[i]);
  });
  addEventHandler(window, "onafterprint", function() {
    for (var i = 0; i < filtered.length; i++) addFilter(filtered[i]);
    printing = false;
  });
}

// apply a filter
function addFilter(element, sizingMethod, src) {
  var filter = element.filters[ALPHA_IMAGE_LOADER];
  if (filter) {
    filter.src = src || element.src;
    filter.enabled = true;
  } else {
    element.runtimeStyle.filter = format(PNG_FILTER, src || element.src, sizingMethod || "scale");
    filtered.push(element);
  }
  // remove the real image
  element.src = BLANK_GIF;
};

function removeFilter(element) {
  element.src = element.pngSrc;
  element.filters[ALPHA_IMAGE_LOADER].enabled = false;
};
