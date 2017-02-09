
// =========================================================================
// ie8-css.js
// =========================================================================

var BRACKETS = "\\([^)]+\\)";

// pseudo-elements can be declared with a double colon
encoder.add(/::(before|after)/, ":$1");

if (appVersion < 8) {

  if (IE7.CSS.pseudoClasses) IE7.CSS.pseudoClasses += "|";
  IE7.CSS.pseudoClasses += "before|after|lang" + BRACKETS;

  // -----------------------------------------------------------------------
  // propertyName: inherit;
  // -----------------------------------------------------------------------
  
  function parseInherited(cssText) {
    return cssText.replace(new RegExp("([{;\\s])(" + inheritedProperties.join("|") + ")\\s*:\\s*([^;}]+)", "g"), "$1$2:$3;ie7-$2:$3");
  };

  var INHERITED = /[\w-]+\s*:\s*inherit/g;
  var STRIP_IE7_FLAGS = /ie7\-|\s*:\s*inherit/g;
  var DASH_LOWER = /\-([a-z])/g;
  function toUpper(match, chr) {return chr.toUpperCase()};
  
  IE7.CSS.addRecalc("[\\w-]+", "inherit", function(element, cssText) {
    if (element.parentElement) {
      var inherited = cssText.match(INHERITED);
      for (var i = 0; i < inherited.length; i++) {
        var propertyName = inherited[i].replace(STRIP_IE7_FLAGS, "");
        if (element.currentStyle["ie7-" + propertyName] === "inherit") {
          propertyName = propertyName.replace(DASH_LOWER, toUpper);
          element.runtimeStyle[propertyName] = element.parentElement.currentStyle[propertyName];
        }
      }
    }
  }, function(match) {
    inheritedProperties.push(rescape(match.slice(1).split(":")[0]));
    return match;
  });

  // -----------------------------------------------------------------------
  // dynamic pseudo-classes
  // -----------------------------------------------------------------------

  var Focus = new DynamicPseudoClass("focus", function(element) {
    var instance = arguments;

    IE7.CSS.addEventHandler(element, "onfocus", function() {
      Focus.unregister(instance); // in case it starts with focus
      Focus.register(instance);
    });

    IE7.CSS.addEventHandler(element, "onblur", function() {
      Focus.unregister(instance);
    });

    // check the active element for initial state
    if (element == document.activeElement) {
      Focus.register(instance)
    }
  });

  var Active = new DynamicPseudoClass("active", function(element) {
    var instance = arguments;
    IE7.CSS.addEventHandler(element, "onmousedown", function() {
      Active.register(instance);
    });
  });

  // globally trap the mouseup event (thanks Martijn!)
  addEventHandler(document, "onmouseup", function() {
    var instances = Active.instances;
    for (var i in instances) Active.unregister(instances[i]);
  });

  // -----------------------------------------------------------------------
  // IE7 pseudo elements
  // -----------------------------------------------------------------------

  // constants
  var URL = /^url\s*\(\s*([^)]*)\)$/;
  var POSITION_MAP = {
    before0: "beforeBegin",
    before1: "afterBegin",
    after0: "afterEnd",
    after1: "beforeEnd"
  };

  var PseudoElement = IE7.PseudoElement = Rule.extend({
    constructor: function(selector, position, cssText) {
      // initialise object properties
      this.position = position;
      var content = cssText.match(PseudoElement.CONTENT), match, entity;
      if (content) {
        content = content[1];
        match = content.split(/\s+/);
        for (var i = 0; (entity = match[i]); i++) {
          match[i] = /^attr/.test(entity) ? {attr: entity.slice(5, -1)} :
            entity.charAt(0) === "'" ? getString(entity) : decode(entity);
        }
        content = match;
      }
      this.content = content;
      // CSS text needs to be decoded immediately
      this.base(selector, decode(cssText));
    },

    init: function() {
      // execute the underlying css query for this class
      this.match = cssQuery(this.selector);
      for (var i = 0; i < this.match.length; i++) {
        var runtimeStyle = this.match[i].runtimeStyle;
        if (!runtimeStyle[this.position]) runtimeStyle[this.position] = {cssText:""};
        runtimeStyle[this.position].cssText += ";" + this.cssText;
        if (this.content != null) runtimeStyle[this.position].content = this.content;
      }
    },

    create: function(target) {
      var generated = target.runtimeStyle[this.position];
      if (generated) {
        // copy the array of values
        var content = [].concat(generated.content || "");
        for (var j = 0; j < content.length; j++) {
          if (typeof content[j] == "object") {
            content[j] = target.getAttribute(content[j].attr);
          }
        }
        content = content.join("");
        var url = content.match(URL);
        var cssText = "overflow:hidden;" + generated.cssText.replace(/'/g, '"');
        var position = POSITION_MAP[this.position + Number(target.canHaveChildren)];
        var id = 'ie7_pseudo' + PseudoElement.count++;
        target.insertAdjacentHTML(position, format(PseudoElement.ANON, this.className, id, cssText, url ? "" : content));
        if (url) {
          var src = getString(url[1]);
          var pseudoElement = document.getElementById(id);
          pseudoElement.src = src;
          addFilter(pseudoElement, "crop");
          var targetIsFloated = target.currentStyle.styleFloat !== "none";
          if (pseudoElement.currentStyle.display === "inline" || targetIsFloated) {
            if (appVersion < 7 && targetIsFloated && target.canHaveChildren) {
              target.runtimeStyle.display = "inline";
              target.runtimeStyle.position = "relative";
              pseudoElement.runtimeStyle.position = "absolute";
            }
            pseudoElement.style.display = "inline-block";
            if (target.currentStyle.styleFloat !== "none") {
              pseudoElement.style.pixelWidth = target.offsetWidth;
            }
            var image = new Image;
            image.onload = function() {
              pseudoElement.style.pixelWidth = this.width;
              pseudoElement.style.pixelHeight = Math.max(this.height, pseudoElement.offsetHeight);
            };
            image.src = src;
          }
        }
        target.runtimeStyle[this.position] = null;
      }
    },

    recalc: function() {
      if (this.content == null) return;
      for (var i = 0; i < this.match.length; i++) {
        this.create(this.match[i]);
      }
    },

    toString: function() {
      return "." + this.className + "{display:inline}";
    }
  }, {
    CONTENT: /content\s*:\s*([^;]*)(;|$)/,
    ANON: "<ie7:! class='ie7_anon %1' id=%2 style='%3'>%4</ie7:!>",
    MATCH: /(.*):(before|after).*/,

    count: 0
  });

  IE7._getLang = function(element) {
    var lang = "";
    while (element && element.nodeType === 1) {
      lang = element.lang || element.getAttribute("lang") || "";
      if (lang) break;
      element = element.parentNode;
    }
    return lang;
  };

  FILTER = extend(FILTER, {
    ":lang\\(([^)]+)\\)":    "((ii=IE7._getLang(e))==='$1'||ii.indexOf('$1-')===0)&&"
  });
}
