
// =========================================================================
// ie9-css.js
// =========================================================================

var NOT_NEXT_BY_TYPE     = "!IE7._getElementSiblingByType(e,'next')&&",
    NOT_PREVIOUS_BY_TYPE = NOT_NEXT_BY_TYPE.replace("next", "previous");

if (IE7.CSS.pseudoClasses) IE7.CSS.pseudoClasses += "|";
IE7.CSS.pseudoClasses += "(?:first|last|only)\\-(?:child|of\\-type)|empty|root|target|" +
  ("not|nth\\-child|nth\\-last\\-child|nth\\-of\\-type|nth\\-last\\-of\\-type".split("|").join(BRACKETS + "|") + BRACKETS);
  
// :checked
var Checked = new DynamicPseudoClass("checked", function(element) {
  if (typeof element.checked !== "boolean") return;
  var instance = arguments;
  IE7.CSS.addEventHandler(element, "onpropertychange", function() {
    if (event.propertyName === "checked") {
      if (element.checked === true) Checked.register(instance);
      else Checked.unregister(instance);
    }
  });
  // check current checked state
  if (element.checked === true) Checked.register(instance);
});

// :enabled
var Enabled = new DynamicPseudoClass("enabled", function(element) {
  if (typeof element.disabled !== "boolean") return;
  var instance = arguments;
  IE7.CSS.addEventHandler(element, "onpropertychange", function() {
    if (event.propertyName === "disabled") {
      if (element.disabled === false) Enabled.register(instance);
      else Enabled.unregister(instance);
    }
  });
  // check current disabled state
  if (element.disabled === false) Enabled.register(instance);
});

// :disabled
var Disabled = new DynamicPseudoClass("disabled", function(element) {
  if (typeof element.disabled !== "boolean") return;
  var instance = arguments;
  IE7.CSS.addEventHandler(element, "onpropertychange", function() {
    if (event.propertyName === "disabled") {
      if (element.disabled === true) Disabled.register(instance);
      else Disabled.unregister(instance);
    }
  });
  // check current disabled state
  if (element.disabled === true) Disabled.register(instance);
});

// :indeterminate (Kevin Newman)
var Indeterminate = new DynamicPseudoClass("indeterminate", function(element) {
  if (typeof element.indeterminate !== "boolean") return;
  var instance = arguments;
  IE7.CSS.addEventHandler(element, "onpropertychange", function() {
    if (event.propertyName === "indeterminate") {
      if (element.indeterminate === true) Indeterminate.register(instance);
      else Indeterminate.unregister(instance);
    }
  });
  IE7.CSS.addEventHandler(element, "onclick", function() {
    Indeterminate.unregister(instance);
  });
  // clever Kev says no need to check this up front
});

// :target
var Target = new DynamicPseudoClass("target", function(element) {
  var instance = arguments;
  // if an element has a tabIndex then it can become "active".
  //  The default is zero anyway but it works...
  if (!element.tabIndex) element.tabIndex = 0;
  // this doesn't detect the back button. I don't know how to do that without adding an iframe :-(
  IE7.CSS.addEventHandler(document, "onpropertychange", function() {
    if (event.propertyName === "activeElement") {
      if (element.id && element.id === location.hash.slice(1)) Target.register(instance);
      else Target.unregister(instance);
    }
  });
  // check the current location
  if (element.id && element.id === location.hash.slice(1)) Target.register(instance);
});

// Register a node and index its siblings.
var _currentIndex = 1, // -@DRE
    allIndexes = {_currentIndex: 1};

IE7._indexOf = function(element, last, ofType) {
  var parent = element.parentNode;
  if (!parent || parent.nodeType !== 1) return NaN;

  var tagName = ofType ? element.nodeName : "";
  if (tagName === "TR" && element.sectionRowIndex >= 0) {
    var index = element.sectionRowIndex;
    return last ? element.parentNode.rows.length - index + 1 : index;
  }
  if ((tagName === "TD" || tagName === "TH") && element.cellIndex >= 0) {
    index = element.cellIndex;
    return last ? element.parentNode.cells.length - index + 1 : index;
  }
  if (allIndexes._currentIndex !== _currentIndex) {
    allIndexes = {_currentIndex: _currentIndex};
  }
  var id = (parent.uniqueID) + "-" + tagName,
      indexes = allIndexes[id];
  if (!indexes) {
    indexes = {};
    var index = 0,
        child = parent.firstChild;
    while (child) {
      if (ofType ? child.nodeName === tagName : child.nodeName > "@") {
        indexes[child.uniqueID] = ++index;
      }
      child = child.nextSibling;
    }
    indexes.length = index;
    allIndexes[id] = indexes;
  }
  index = indexes[element.uniqueID];
  return last ? indexes.length - index + 1 : index;
};

IE7._isEmpty = function(node) {
  node = node.firstChild;
  while (node) {
    if (node.nodeType === 3 || node.nodeName > "@") return false;
    node = node.nextSibling;
  }
  return true;
};

IE7._getElementSiblingByType = function(node, direction) {
  var tagName = node.nodeName;
  direction += "Sibling";
  do {
    node = node[direction];
    if (node && node.nodeName === tagName) break;
  } while (node);
  return node;
};

var ONE = {"+": 1, "-": -1}, SPACES = / /g;

FILTER = extend(extend({
  ":nth(-last)?-(?:child|(of-type))\\((<#nth_arg>)\\)(<#filter>)?": function(match, last, ofType, args, filters) { // :nth- pseudo classes
    args = args.replace(SPACES, "");

    var index = "IE7._indexOf(e," + !!last + "," + !!ofType + ")";

    if (args === "even") args = "2n";
    else if (args === "odd") args = "2n+1";
    else if (!isNaN(args)) args = "0n" + ~~args;

    args = args.split("n");
    var a = ~~(ONE[args[0]] || args[0] || 1),
        b = ~~args[1];
    if (a === 0) {
      var expr = index + "===" + b;
    } else {
      expr = "((ii=" + index + ")-(" + b + "))%" + a + "===0&&ii" + (a < 0 ? "<" : ">") + "=" + b;
    }
    return this.parse(filters) + expr + "&&";
  },

  "<#negation>": function(match, simple) {
    if (/:not/i.test(simple)) throwSelectorError();

    if (/^[#.:\[]/.test(simple)) {
      simple = "*" + simple;
    }
    return "!(" + MATCHER.parse(simple).slice(3, -2) + ")&&";
  }
}, FILTER), {
  ":checked":         "e.checked===true&&",
  ":disabled":        "e.disabled===true&&",
  ":enabled":         "e.disabled===false&&",
  ":last-child":      "!" + NEXT_SIBLING + "&&",
  ":only-child":      "!" + PREVIOUS_SIBLING + "&&!" + NEXT_SIBLING + "&&",
  ":first-of-type":   NOT_PREVIOUS_BY_TYPE,
  ":last-of-type":    NOT_NEXT_BY_TYPE,
  ":only-of-type":    NOT_PREVIOUS_BY_TYPE + NOT_NEXT_BY_TYPE,

  ":empty":          "IE7._isEmpty(e)&&",
  ":root":           "e==R&&",
  ":target":         "H&&" + ID_ATTRIBUTE + "===H&&"
});
