
var MATCHER;

var cssQuery = (function() {
  var CONTEXT = /^[>+~]/;
  
  var useContext = false;
  
  // This is not a selector engine in the strictest sense. So it's best to silently error.
  function cssQuery(selector, context, single) {
    selector = trim(selector);
    if (!context) context = document;
    var ref = context;
    useContext = CONTEXT.test(selector);
    if (useContext) {
      context = context.parentNode;
      selector = "*" + selector;
    }
    try {
      return selectQuery.create(selector, useContext)(context, single ? null : [], ref);
    } catch (ex) {
      return single ? null : [];
    }
  };

  var VALID_SELECTOR = /^(\\.|[' >+~#.\[\]:*(),\w-\^|$=]|[^\x00-\xa0])+$/;

  var _EVALUATED = /^(href|src)$/;
  var _ATTRIBUTES = {
    "class": "className",
    "for": "htmlFor"
  };

  var IE7_CLASS_NAMES = /\sie7_\w+/g;

  var USE_IFLAG = /^(action|cite|codebase|data|dynsrc|href|longdesc|lowsrc|src|usemap|url)$/i;

  IE7._getAttribute = function(element, name) {
    if (element.getAttributeNode) {
      var attribute = element.getAttributeNode(name);
    }
    name = _ATTRIBUTES[name.toLowerCase()] || name;
    if (!attribute) attribute = element.attributes[name];
    var specified = attribute && attribute.specified;

    if (element[name] && typeof element[name] == "boolean") return name.toLowerCase();
    if ((specified && USE_IFLAG.test(name)) || (!attribute && MSIE5) || name === "value" || name === "type") {
      return element.getAttribute(name, 2);
    }
    if (name === "style") return element.style.cssText.toLowerCase() || null;

    return specified ? String(attribute.nodeValue) : null;
  };

  var names = "colSpan,rowSpan,vAlign,dateTime,accessKey,tabIndex,encType,maxLength,readOnly,longDesc";
  // Convert the list of strings to a hash, mapping the lowercase name to the camelCase name.
  extend(_ATTRIBUTES, combine(names.toLowerCase().split(","), names.split(",")));

  IE7._getElementSibling = function(node, direction) {
    direction += "Sibling";
    do {
      node = node[direction];
      if (node && node.nodeName > "@") break;
    } while (node);
    return node;
  };

  var IMPLIED_ASTERISK    = /(^|[, >+~])([#.:\[])/g,
      BLOCKS              = /\)\{/g,
      COMMA               = /,/,
      QUOTED              = /^['"]/,
      HEX_ESCAPE          = /\\([\da-f]{2,2})/gi,
      LAST_CHILD          = /last/i;

  IE7._byId = function(document, id) {
    var result = document.all[id] || null;
    // Returns a single element or a collection.
    if (!result || (result.nodeType && IE7._getAttribute(result, "id") === id)) return result;
    // document.all has returned a collection of elements with name/id
    for (var i = 0; i < result.length; i++) {
      if (IE7._getAttribute(result[i], "id") === id) return result[i];
    }
    return null;
  };

  // =========================================================================
  // dom/selectors-api/CSSSelectorParser.js
  // =========================================================================

  // http://www.w3.org/TR/css3-selectors/#w3cselgrammar (kinda)
  var CSSSelectorParser = RegGrp.extend({
    dictionary: new Dictionary({
      ident:           /\-?(\\.|[_a-z]|[^\x00-\xa0])(\\.|[\w-]|[^\x00-\xa0])*/,
      combinator:      /[\s>+~]/,
      operator:        /[\^~|$*]?=/,
      nth_arg:         /[+-]?\d+|[+-]?\d*n(?:\s*[+-]\s*\d+)?|even|odd/,
      tag:             /\*|<#ident>/,
      id:              /#(<#ident>)/,
      'class':         /\.(<#ident>)/,
      pseudo:          /\:([\w-]+)(?:\(([^)]+)\))?/,
      attr:            /\[(<#ident>)(?:(<#operator>)((?:\\.|[^\[\]#.:])+))?\]/,
      negation:        /:not\((<#tag>|<#id>|<#class>|<#attr>|<#pseudo>)\)/,
      sequence:        /(\\.|[~*]=|\+\d|\+?\d*n\s*\+\s*\d|[^\s>+~,\*])+/,
      filter:          /[#.:\[]<#sequence>/,
      selector:        /[^>+~](\\.|[^,])*?/,
      grammar:         /^(<#selector>)((,<#selector>)*)$/
    }),

    ignoreCase: true
  });

  var normalizer = new CSSSelectorParser({
    "\\\\.|[~*]\\s+=|\\+\\s+\\d": RegGrp.IGNORE,
    "\\[\\s+": "[",
    "\\(\\s+": "(",
    "\\s+\\)": ")",
    "\\s+\\]": "]",
    "\\s*([,>+~]|<#operator>)\\s*": "$1",
    "\\s+$": "",
    "\\s+": " "
  });

  function normalize(selector) {
    selector = normalizer.parse(selector.replace(HEX_ESCAPE, "\\x$1"))
      .replace(UNESCAPE, "$1")
      .replace(IMPLIED_ASTERISK, "$1*$2");
    if (!VALID_SELECTOR.test(selector)) throwSelectorError();
    return selector;
  };

  function unescape(query) {
    // put string values back
    return query.replace(ESCAPED, unescapeString);
  };

  function unescapeString(match, index) {
    return strings[index];
  };

  var BRACES = /\{/g, BRACES_ESCAPED = /\\{/g;

  function closeBlock(group) {
    return Array((group.replace(BRACES_ESCAPED, "").match(BRACES) || "").length + 1).join("}");
  };

  FILTER = new CSSSelectorParser(FILTER);

  var TARGET = /:target/i, ROOT = /:root/i;

  function getConstants(selector) {
    var constants = "";
    if (ROOT.test(selector)) constants += ",R=d.documentElement";
    if (TARGET.test(selector)) constants += ",H=d.location;H=H&&H.hash.replace('#','')";
    if (constants || selector.indexOf("#") !== -1) {
      constants = ",t=c.nodeType,d=t===9?c:c.ownerDocument||(c.document||c).parentWindow.document" + constants;
    }
    return "var ii" + constants + ";";
  };

  var COMBINATOR = {
    " ":   ";while(e!=s&&(e=e.parentNode)&&e.nodeType===1){",
    ">":   ".parentElement;if(e){",
    "+":   ";while((e=e.previousSibling)&&!(" + IS_ELEMENT + "))continue;if(e){",
    "~":   ";while((e=e.previousSibling)){" + IF_ELEMENT
  };

  var TOKEN = /\be\b/g;

  MATCHER = new CSSSelectorParser({
    "(?:(<#selector>)(<#combinator>))?(<#tag>)(<#filter>)?$": function(match, before, combinator, tag, filters) {
      var group = "";
      if (tag !== "*") {
        var TAG = tag.toUpperCase();
        group += "if(e.nodeName==='" + TAG + (TAG === tag ? "" : "'||e.nodeName==='" + tag) + "'){";
      }
      if (filters) {
        group += "if(" + FILTER.parse(filters).slice(0, -2) + "){";
      }
      group = group.replace(TOKEN, "e" + this.index);
      if (combinator) {
        group += "var e=e" + (this.index++) + COMBINATOR[combinator];
        group = group.replace(TOKEN, "e" + this.index);
      }
      if (before) {
        group += this.parse(before);
      }
      return group;
    }
  });
  
  var BY_ID       = "e0=IE7._byId(d,'%1');if(e0){",
      BY_TAG_NAME = "var n=c.getElementsByTagName('%1');",
      STORE       = "if(r==null)return e0;r[k++]=e0;";

  var TAG_NAME = 1;

  var SELECTOR = new CSSSelectorParser({
    "^((?:<#selector>)?(?:<#combinator>))(<#tag>)(<#filter>)?$": true
  });

  var cache = {};

  var selectById = new CSSSelectorParser({
    "^(<#tag>)#(<#ident>)(<#filter>)?( [^,]*)?$": function(match, tagName, id, filters, after) {
      var block = format(BY_ID, id), endBlock = "}";
      if (filters) {
        block += MATCHER.parse(tagName + filters);
        endBlock = closeBlock(block);
      }
      if (after) {
        block += "s=c=e0;" + selectQuery.parse("*" + after);
      } else {
        block += STORE;
      }
      return block + endBlock;
    },

    "^([^#,]+)#(<#ident>)(<#filter>)?$": function(match, before, id, filters) {
      var block = format(BY_ID, id);
      if (before === "*") {
        block += STORE;
      } else {
        block += MATCHER.parse(before + filters) + STORE + "break";
      }
      return block + closeBlock(block);
    },

    "^.*$": ""
  });

  var selectQuery = new CSSSelectorParser({
    "<#grammar>": function(match, selector, remainingSelectors) {
      if (!this.groups) this.groups = [];

      var group = SELECTOR.exec(" " + selector);

      if (!group) throwSelectorError();

      this.groups.push(group.slice(1));

      if (remainingSelectors) {
        return this.parse(remainingSelectors.replace(COMMA, ""));
      }

      var groups = this.groups,
          tagName = groups[0][TAG_NAME]; // first tag name

      for (var i = 1; group = groups[i]; i++) { // search tag names
        if (tagName !== group[TAG_NAME]) {
          tagName = "*"; // mixed tag names, so use "*"
          break;
        }
      }

      var matcher = "", store = STORE + "continue filtering;";

      for (var i = 0; group = groups[i]; i++) {
        MATCHER.index = 0;
        if (tagName !== "*") group[TAG_NAME] = "*"; // we are already filtering by tagName
        group = group.join("");
        if (group === " *") { // select all
          matcher = store;
          break;
        } else {
          group = MATCHER.parse(group);
          if (useContext) group += "if(e" + MATCHER.index + "==s){";
          matcher += group + store + closeBlock(group);
        }
      }

      // reduce to a single loop
      var isWild = tagName === "*";
      return (isWild ? "var n=c.all;" : format(BY_TAG_NAME, tagName)) +
        "filtering:while((e0=n[i++]))" +
        (isWild ? IF_ELEMENT.replace(TOKEN, "e0") : "{") +
          matcher +
        "}";
    },

    "^.*$": throwSelectorError
  });

  var REDUNDANT_NODETYPE_CHECKS = /\&\&(e\d+)\.nodeType===1(\)\{\s*if\(\1\.nodeName=)/g;

  selectQuery.create = function(selector) {
    if (!cache[selector]) {
      selector = normalize(selector);
      this.groups = null;
      MATCHER.index = 0;
      var block = this.parse(selector);
      this.groups = null;
      MATCHER.index = 0;
      if (selector.indexOf("#") !== -1) {
        var byId  = selectById.parse(selector);
        if (byId) {
          block =
            "if(t===1||t===11|!c.getElementById){" +
              block +
            "}else{" +
              byId +
            "}";
        }
      }
      // remove redundant nodeType==1 checks
      block = block.replace(REDUNDANT_NODETYPE_CHECKS, "$2");
      block = getConstants(selector) + decode(block);
      cache[selector] = new Function("return function(c,r,s){var i=0,k=0,e0;" + block + "return r}")();
    }
    return cache[selector];
  };

  return cssQuery;
})();

function throwSelectorError() {
  throw new SyntaxError("Invalid selector.");
};
