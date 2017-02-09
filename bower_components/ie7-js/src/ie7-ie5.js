
if (appVersion < 5.5) {
  undefined = Undefined();

  ANON = "HTML:!"; // for anonymous content
  
  // Fix String.replace (Safari1.x/IE5.0).
  var GLOBAL = /(g|gi)$/;
  var _String_replace = String.prototype.replace; 
  String.prototype.replace = function(expression, replacement) {
    if (typeof replacement == "function") { // Safari doesn't like functions
      if (expression && expression.constructor == RegExp) {
        var regexp = expression;
        var global = regexp.global;
        if (global == null) global = GLOBAL.test(regexp);
        // we have to convert global RexpExps for exec() to work consistently
        if (global) regexp = new RegExp(regexp.source); // non-global
      } else {
        regexp = new RegExp(rescape(expression));
      }
      var match, string = this, result = "";
      while (string && (match = regexp.exec(string))) {
        result += string.slice(0, match.index) + replacement.apply(this, match);
        string = string.slice(match.index + match[0].length);
        if (!global) break;
      }
      return result + string;
    }
    return _String_replace.apply(this, arguments);
  };
  
  Array.prototype.pop = function() {
    if (this.length) {
      var i = this[this.length - 1];
      this.length--;
      return i;
    }
    return undefined;
  };
  
  Array.prototype.push = function() {
    for (var i = 0; i < arguments.length; i++) {
      this[this.length] = arguments[i];
    }
    return this.length;
  };
  
  var ns = this;
  Function.prototype.apply = function(_no_shrink_) {
    var a = arguments[0], b = arguments[1], c = "*apply", d;
    if (typeof a == "undefined") a = ns;
    else if (a == null) a = window;
    else if (typeof a == "string") a = new String(a);
    else if (typeof a == "number") a = new Number(a);
    else if (typeof a == "boolean") a = new Boolean(a);
    if (arguments.length == 1) b = [];
    else if (b[0] && b[0].writeln) b[0] = b[0].documentElement.document || b[0];
    a[c] = this;
    switch (b.length) { // unroll for speed
      case 0: d = a[c](); break;
      case 1: d = a[c](b[0]); break;
      case 2: d = a[c](b[0],b[1]); break;
      case 3: d = a[c](b[0],b[1],b[2]); break;
      case 4: d = a[c](b[0],b[1],b[2],b[3]); break;
      case 5: d = a[c](b[0],b[1],b[2],b[3],b[4]); break;
      default:
        var args = [], i = b.length - 1;
        do args[i] = "b[" + i + "]"; while (i--);
        eval("d=a[c](" + args + ")");
    }
    if (typeof a.valueOf == "function") { // not a COM object
      delete a[c];
    } else {
      a[c] = undefined;
      if (d && d.writeln) d = d.documentElement.document || d;
    }
    return d;
  };
  
  Function.prototype.call = function(o) {
    return this.apply(o, _slice.apply(arguments, [1]));
  };

  // block elements are "inline" according to IE5.0 so we'll fix it
  HEADER += "address,blockquote,body,dd,div,dt,fieldset,form,"+
    "frame,frameset,h1,h2,h3,h4,h5,h6,iframe,noframes,object,p,"+
    "hr,applet,center,dir,menu,pre,dl,li,ol,ul{display:block}";
}
