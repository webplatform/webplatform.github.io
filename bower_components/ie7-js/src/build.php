<?php
header('Content-Type: application/x-javascript');
header('Expires: ' . gmdate('D, d M Y H:i:s') . ' GMT');
header('Cache-Control: no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
?>
/*
  IE7/IE8/IE9.js - copyright 2004-2010, Dean Edwards
  http://code.google.com/p/ie7-js/
  http://www.opensource.org/licenses/mit-license.php
*/

/* W3C compliance for Microsoft Internet Explorer */

/* credits/thanks:
  Shaggy, Martijn Wargers, Jimmy Cerra, Mark D Anderson,
  Lars Dieckow, Erik Arvidsson, Gellért Gyuris, James Denny,
  Unknown W Brackets, Benjamin Westfarer, Rob Eberhardt,
  Bill Edney, Kevin Newman, James Crompton, Matthew Mastracci,
  Doug Wright, Richard York, Kenneth Kolano, MegaZone,
  Thomas Verelst, Mark 'Tarquin' Wilton-Jones, Rainer Åhlfors,
  David Zulaica, Ken Kolano, Kevin Newman, Sjoerd Visscher,
  Ingo Chao
*/

<?php
print("// timestamp: ".gmdate('D, d M Y H:i:s')."\r\n");
?>

(function(window, document) {

var IE7 = window.IE7 = {
  version: "2.1(beta4)",
  toString: K("[IE7]")
};
<?php
if (preg_match('/ie9/', $_SERVER['QUERY_STRING'])) {
  $compat = 9;
} else if (preg_match('/ie8/', $_SERVER['QUERY_STRING'])) {
  $compat = 8;
} else {
  $compat = 7;
}
?>
IE7.compat = <?php echo $compat ?>;
var appVersion = IE7.appVersion = navigator.appVersion.match(/MSIE (\d\.\d)/)[1] - 0;

if (/ie7_off/.test(top.location.search) || appVersion < 5.5 || appVersion >= IE7.compat) return;

var MSIE5 = appVersion < 6;

var Undefined = K();
var documentElement = document.documentElement, body, viewport;
var ANON = "!";
var HEADER = ":link{ie7-link:link}:visited{ie7-link:visited}";

// -----------------------------------------------------------------------
// external
// -----------------------------------------------------------------------

var RELATIVE = /^[\w\.]+[^:]*$/;
function makePath(href, path) {
  if (RELATIVE.test(href)) href = (path || "") + href;
  return href;
};

function getPath(href, path) {
  href = makePath(href, path);
  return href.slice(0, href.lastIndexOf("/") + 1);
};

// Get the path to this script
var script = document.scripts[document.scripts.length - 1];
var path = getPath(script.src);

// Use microsoft's http request object to load external files
try {
  var httpRequest = new ActiveXObject("Microsoft.XMLHTTP");
} catch (ex) {
  // ActiveX disabled
}

var fileCache = {};
function loadFile(href, path) {
  try {
    href = makePath(href, path);
    if (!fileCache[href]) {
      httpRequest.open("GET", href, false);
      httpRequest.send();
      if (httpRequest.status == 0 || httpRequest.status == 200) {
        fileCache[href] = httpRequest.responseText;
      }
    }
  } catch (ex) {
    // ignore errors
  }
  return fileCache[href] || "";
};

// -----------------------------------------------------------------------
// OO support
// -----------------------------------------------------------------------

<?php include("base2.js") ?>

// -----------------------------------------------------------------------
// parsing
// -----------------------------------------------------------------------

var Parser = RegGrp.extend({ignoreCase: true});

var SINGLE_QUOTES       = /'/g,
    ESCAPED             = /'(\d+)'/g,
    ESCAPE              = /\\/g,
    UNESCAPE            = /\\([nrtf'"])/g;

var strings = [];

var encoder = new Parser({
  // comments
  "<!\\-\\-|\\-\\->": "",
  "\\/\\*[^*]*\\*+([^\\/][^*]*\\*+)*\\/": "",
  // get rid
  "@(namespace|import)[^;\\n]+[;\\n]": "",
  // strings
  "'(\\\\.|[^'\\\\])*'": encodeString,
  '"(\\\\.|[^"\\\\])*"': encodeString,
  // white space
  "\\s+": " "
});

function encode(selector) {
  return encoder.parse(selector).replace(UNESCAPE, "$1");
};

function decode(query) {
  // put string values back
  return query.replace(ESCAPED, decodeString);
};

function encodeString(string) {
  var index = strings.length;
  strings[index] = string.slice(1, -1)
    .replace(UNESCAPE, "$1")
    .replace(SINGLE_QUOTES, "\\'");
  return "'" + index + "'";
};

function decodeString(match, index) {
  var string = strings[index];
  if (string == null) return match;
  return "'" + strings[index] + "'";
};

function getString(value) {
  return value.indexOf("'") === 0 ? strings[value.slice(1, - 1)] : value;
};

// clone a "width" function to create a "height" function
var rotater = new RegGrp({
  Width: "Height",
  width: "height",
  Left:  "Top",
  left:  "top",
  Right: "Bottom",
  right: "bottom",
  onX:   "onY"
});

function rotate(fn) {
  return rotater.parse(fn);
};

// -----------------------------------------------------------------------
// event handling
// -----------------------------------------------------------------------

var eventHandlers = [];

function addResize(handler) {
  addRecalc(handler);
  addEventHandler(window, "onresize", handler);
};

// add an event handler (function) to an element
function addEventHandler(element, type, handler) {
  element.attachEvent(type, handler);
  // store the handler so it can be detached later
  eventHandlers.push(arguments);
};

// remove an event handler assigned to an element by IE7
function removeEventHandler(element, type, handler) {
  try {
    element.detachEvent(type, handler);
  } catch (ex) {
    // write a letter of complaint to microsoft..
  }
};

// remove event handlers (they eat memory)
addEventHandler(window, "onunload", function() {
  var handler;
  while (handler = eventHandlers.pop()) {
    removeEventHandler(handler[0], handler[1], handler[2]);
  }
});

function register(handler, element, condition) { // -@DRE
  //var set = handler[element.uniqueID];
  if (!handler.elements) handler.elements = {};
  if (condition) handler.elements[element.uniqueID] = element;
  else delete handler.elements[element.uniqueID];
  //return !set && condition;
  return condition;
};

addEventHandler(window, "onbeforeprint", function() {
  if (!IE7.CSS.print) new StyleSheet("print");
  IE7.CSS.print.recalc();
});

// -----------------------------------------------------------------------
// pixel conversion
// -----------------------------------------------------------------------

// this is handy because it means that web developers can mix and match
//  measurement units in their style sheets. it is not uncommon to
//  express something like padding in "em" units whilst border thickness
//  is most often expressed in pixels.

var PIXEL = /^\d+(px)?$/i;
var PERCENT = /^\d+%$/;
var getPixelValue = function(element, value) {
  if (PIXEL.test(value)) return parseInt(value);
  var style = element.style.left;
  var runtimeStyle = element.runtimeStyle.left;
  element.runtimeStyle.left = element.currentStyle.left;
  element.style.left = value || 0;
  value = element.style.pixelLeft;
  element.style.left = style;
  element.runtimeStyle.left = runtimeStyle;
  return value;
};

// -----------------------------------------------------------------------
// generic
// -----------------------------------------------------------------------

var $IE7 = "ie7-";

var Fix = Base.extend({
  constructor: function() {
    this.fixes = [];
    this.recalcs = [];
  },
  init: Undefined
});

// a store for functions that will be called when refreshing IE7
var recalcs = [];
function addRecalc(recalc) {
  recalcs.push(recalc);
};

IE7.recalc = function() {
  IE7.HTML.recalc();
  // re-apply style sheet rules (re-calculate ie7 classes)
  IE7.CSS.recalc();
  // apply global fixes to the document
  for (var i = 0; i < recalcs.length; i++) recalcs[i]();
};

function isFixed(element) {
  return element.currentStyle["ie7-position"] == "fixed";
};

// original style
function getDefinedStyle(element, propertyName) {
  return element.currentStyle[$IE7 + propertyName] || element.currentStyle[propertyName];
};

function setOverrideStyle(element, propertyName, value) {
  if (element.currentStyle[$IE7 + propertyName] == null) {
    element.runtimeStyle[$IE7 + propertyName] = element.currentStyle[propertyName];
  }
  element.runtimeStyle[propertyName] = value;
};

// Create a temporary element which is used to inherit styles
// from the target element.
function createTempElement(tagName) {
  var element = document.createElement(tagName || "object");
  element.style.cssText = "position:absolute;padding:0;display:block;border:none;clip:rect(0 0 0 0);left:-9999";
  element.ie7_anon = true;
  return element;
};

<?php
include('ie7-css.js');
include('ie7-html.js');
include('ie7-layout.js');
include('ie7-graphics.js');
include('ie7-fixed.js');
include('ie7-overflow.js');
include('ie7-quirks.js');
if ($compat >= 8) {
  include('ie8-css.js');
  include('ie8-html.js');
  include('ie8-layout.js');
  include('ie8-graphics.js');
  if ($compat == 9) {
    include('ie9-css.js');
    include('ie9-html.js');
    include('ie9-layout.js');
    include('ie9-graphics.js');
  }
}
include("cssQuery.js");
?>

// -----------------------------------------------------------------------
// initialisation
// -----------------------------------------------------------------------

IE7.loaded = true;

(function() {
  try {
    // http://javascript.nwbox.com/IEContentLoaded/
    if (!document.body) throw "continue";
    documentElement.doScroll("left");
  } catch (ex) {
    setTimeout(arguments.callee, 1);
    return;
  }
  // execute the inner text of the IE7 script
  try {
    eval(script.innerHTML);
  } catch (ex) {
    // ignore errors
  }
  if (typeof IE7_PNG_SUFFIX == "object") {
    PNG = IE7_PNG_SUFFIX;
  } else {
    PNG = new RegExp(rescape(window.IE7_PNG_SUFFIX || "-trans.png") + "(\\?.*)?$", "i");
  }

  // frequently used references
  body = document.body;
  viewport = MSIE5 ? body : documentElement;

  // classes
  body.className += " ie7_body";
  documentElement.className += " ie7_html";

  if (MSIE5) ie7Quirks();

  IE7.CSS.init();
  IE7.HTML.init();

  IE7.HTML.apply();
  IE7.CSS.apply();

  IE7.recalc();
})();

})(this, document);
