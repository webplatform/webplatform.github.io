
// This is a cut-down version of base2 (http://code.google.com/p/base2/)

var _slice = Array.prototype.slice;

// private
var _FORMAT = /%([1-9])/g;
var _LTRIM = /^\s\s*/;
var _RTRIM = /\s\s*$/;
var _RESCAPE = /([\/()[\]{}|*+-.,^$?\\])/g;           // safe regular expressions
var _BASE = /\bbase\b/;
var _HIDDEN = ["constructor", "toString"];            // only override these when prototyping

var prototyping;

function Base(){};
Base.extend = function(_instance, _static) {
  // Build the prototype.
  prototyping = true;
  var _prototype = new this;
  extend(_prototype, _instance);
  prototyping = false;

  // Create the wrapper for the constructor function.
  var _constructor = _prototype.constructor;
  function klass() {
    // Don't call the constructor function when prototyping.
    if (!prototyping) _constructor.apply(this, arguments);
  };
  _prototype.constructor = klass;

  // Build the static interface.
  klass.extend = arguments.callee;
  extend(klass, _static);
  klass.prototype = _prototype;
  return klass;
};
Base.prototype.extend = function(source) {
  return extend(this, source);
};


// A collection of regular expressions and their associated replacement values.
// A Base class for creating parsers.

var HASH     = "#";
var ITEMS    = "#";
var KEYS     = ".";
var COMPILED = "/";

var REGGRP_BACK_REF        = /\\(\d+)/g,
    REGGRP_ESCAPE_COUNT    = /\[(\\.|[^\]\\])+\]|\\.|\(\?/g,
    REGGRP_PAREN           = /\(/g,
    REGGRP_LOOKUP          = /\$(\d+)/,
    REGGRP_LOOKUP_SIMPLE   = /^\$\d+$/,
    REGGRP_LOOKUPS         = /(\[(\\.|[^\]\\])+\]|\\.|\(\?)|\(/g,
    REGGRP_DICT_ENTRY      = /^<#\w+>$/,
    REGGRP_DICT_ENTRIES    = /<#(\w+)>/g;

var RegGrp = Base.extend({
  constructor: function(values) {
    this[KEYS] = [];
    this[ITEMS] = {};
    this.merge(values);
  },

  //dictionary: null,
  //ignoreCase: false,

  add: function(expression, replacement) {
    delete this[COMPILED];
    if (expression instanceof RegExp) {
      expression = expression.source;
    }
    if (!this[HASH + expression]) this[KEYS].push(String(expression));
    return this[ITEMS][HASH + expression] = new RegGrp.Item(expression, replacement, this);
  },

  compile: function(recompile) {
    if (recompile || !this[COMPILED]) {
      this[COMPILED] = new RegExp(this, this.ignoreCase ? "gi" : "g");
    }
    return this[COMPILED];
  },

  merge: function(values) {
    for (var i in values) this.add(i, values[i]);
  },

  exec: function(string) {
    var group = this,
        patterns = group[KEYS],
        items = group[ITEMS], item;
    var result = this.compile(true).exec(string);
    if (result) {
      // Loop through the RegGrp items.
      var i = 0, offset = 1;
      while ((item = items[HASH + patterns[i++]])) {
        var next = offset + item.length + 1;
        if (result[offset]) { // do we have a result?
          if (item.replacement === 0) {
            return group.exec(string);
          } else {
            var args = result.slice(offset, next), j = args.length;
            while (--j) args[j] = args[j] || ""; // some platforms return null/undefined for non-matching sub-expressions
            args[0] = {match: args[0], item: item};
            return args;
          }
        }
        offset = next;
      }
    }
    return null;
  },

  parse: function(string) {
    string += ""; // type safe
    var group = this,
        patterns = group[KEYS],
        items = group[ITEMS];
    return string.replace(this.compile(), function(match) {
      var args = [], item, offset = 1, i = arguments.length;
      while (--i) args[i] = arguments[i] || ""; // some platforms return null/undefined for non-matching sub-expressions
      // Loop through the RegGrp items.
      while ((item = items[HASH + patterns[i++]])) {
        var next = offset + item.length + 1;
        if (args[offset]) { // do we have a result?
          var replacement = item.replacement;
          switch (typeof replacement) {
            case "function":
              return replacement.apply(group, args.slice(offset, next));
            case "number":
              return args[offset + replacement];
            default:
              return replacement;
          }
        }
        offset = next;
      }
      return match;
    });
  },

  toString: function() {
    var strings = [],
        keys = this[KEYS],
        items = this[ITEMS], item;
    for (var i = 0; item = items[HASH + keys[i]]; i++) {
      strings[i] = item.source;
    }
    return "(" + strings.join(")|(") + ")";
  }
}, {
  IGNORE: null, // a null replacement value means that there is no replacement.

  Item: Base.extend({
    constructor: function(source, replacement, owner) {
      var length = source.indexOf("(") === -1 ? 0 : RegGrp.count(source);

      var dictionary = owner.dictionary;
      if (dictionary && source.indexOf("<#") !== -1) {
        if (REGGRP_DICT_ENTRY.test(source)) {
          var entry = dictionary[ITEMS][HASH + source.slice(2, -1)];
          source = entry.replacement;
          length = entry._length;
        } else {
          source = dictionary.parse(source);
        }
      }

      if (typeof replacement == "number") replacement = String(replacement);
      else if (replacement == null) replacement = 0;

      // Does the expression use sub-expression lookups?
      if (typeof replacement == "string" && REGGRP_LOOKUP.test(replacement)) {
        if (REGGRP_LOOKUP_SIMPLE.test(replacement)) { // A simple lookup? (e.g. "$2").
          // Store the index (used for fast retrieval of matched strings).
          var index = replacement.slice(1) - 0;
          if (index && index <= length) replacement = index;
        } else {
          // A complicated lookup (e.g. "Hello $2 $1.").
          var lookup = replacement, regexp;
          replacement = function(match) {
            if (!regexp) {
              regexp = new RegExp(source, "g" + (this.ignoreCase ? "i": ""));
            }
            return match.replace(regexp, lookup);
          };
        }
      }

      this.length = length;
      this.source = String(source);
      this.replacement = replacement;
    }
  }),

  count: function(expression) {
    return (String(expression).replace(REGGRP_ESCAPE_COUNT, "").match(REGGRP_PAREN) || "").length;
  }
});

var Dictionary = RegGrp.extend({
  parse: function(phrase) {
    // Prevent sub-expressions in dictionary entries from capturing.
    var entries = this[ITEMS];
    return phrase.replace(REGGRP_DICT_ENTRIES, function(match, entry) {
      entry = entries[HASH + entry];
      return entry ? entry._nonCapturing : match;
    });
  },

  add: function(expression, replacement) {
    // Get the underlying replacement value.
    if (replacement instanceof RegExp) {
      replacement = replacement.source;
    }
    // Translate the replacement.
    // The result is the original replacement recursively parsed by this dictionary.
    var nonCapturing = replacement.replace(REGGRP_LOOKUPS, _nonCapture);
    if (replacement.indexOf("(") !== -1) {
      var realLength = RegGrp.count(replacement);
    }
    if (replacement.indexOf("<#") !== -1) {
      replacement = this.parse(replacement);
      nonCapturing = this.parse(nonCapturing);
    }
    var item = this.base(expression, replacement);
    item._nonCapturing = nonCapturing;
    item._length = realLength || item.length; // underlying number of sub-groups
    return item;
  },

  toString: function() {
    return "(<#" + this[PATTERNS].join(">)|(<#") + ">)";
  }
});

function _nonCapture(match, escaped) {
  return escaped || "(?:"; // non-capturing
};

// =========================================================================
// lang/extend.js
// =========================================================================

function extend(object, source) { // or extend(object, key, value)
  if (object && source) {
    var proto = (typeof source == "function" ? Function : Object).prototype;
    // Add constructor, toString etc
    var i = _HIDDEN.length, key;
    if (prototyping) while (key = _HIDDEN[--i]) {
      var value = source[key];
      if (value != proto[key]) {
        if (_BASE.test(value)) {
          _override(object, key, value)
        } else {
          object[key] = value;
        }
      }
    }
    // Copy each of the source object's properties to the target object.
    for (key in source) if (typeof proto[key] == "undefined") {
      var value = source[key];
      // Check for method overriding.
      if (object[key] && typeof value == "function" && _BASE.test(value)) {
        _override(object, key, value);
      } else {
        object[key] = value;
      }
    }
  }
  return object;
};

function _override(object, name, method) {
  // Override an existing method.
  var ancestor = object[name];
  object[name] = function() {
    var previous = this.base;
    this.base = ancestor;
    var returnValue = method.apply(this, arguments);
    this.base = previous;
    return returnValue;
  };
};

function combine(keys, values) {
  // Combine two arrays to make a hash.
  if (!values) values = keys;
  var hash = {};
  for (var i in keys) hash[i] = values[i];
  return hash;
};

function format(string) {
  // Replace %n with arguments[n].
  // e.g. format("%1 %2%3 %2a %1%3", "she", "se", "lls");
  // ==> "she sells sea shells"
  // Only %1 - %9 supported.
  var args = arguments;
  var _FORMAT = new RegExp("%([1-" + arguments.length + "])", "g");
  return String(string).replace(_FORMAT, function(match, index) {
    return index < args.length ? args[index] : match;
  });
};

function match(string, expression) {
  // Same as String.match() except that this function will return an empty
  // array if there is no match.
  return String(string).match(expression) || [];
};

function rescape(string) {
  // Make a string safe for creating a RegExp.
  return String(string).replace(_RESCAPE, "\\$1");
};

// http://blog.stevenlevithan.com/archives/faster-trim-javascript
function trim(string) {
  return String(string).replace(_LTRIM, "").replace(_RTRIM, "");
};

function K(k) {
  return function() {
    return k;
  };
};
