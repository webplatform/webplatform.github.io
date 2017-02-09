
// =========================================================================
// ie7-layout.js
// =========================================================================

var NUMERIC = "[.\\d]";

(function() {
  var layout = IE7.Layout = {};

  // big, ugly box-model hack + min/max stuff

  // #tantek > #erik > #dean { voice-family: hacker; }

  // -----------------------------------------------------------------------
  // "layout"
  // -----------------------------------------------------------------------

  HEADER += "*{boxSizing:content-box}";

  // give an element "layout"
  layout.boxSizing = function(element) {
    if (!element.currentStyle.hasLayout) {
    //#  element.runtimeStyle.fixedHeight =
      element.style.height = "0cm";
      if (element.currentStyle.verticalAlign === "auto")
        element.runtimeStyle.verticalAlign = "top";
      // when an element acquires "layout", margins no longer collapse correctly
      collapseMargins(element);
    }
  };

  // -----------------------------------------------------------------------
  // Margin Collapse
  // -----------------------------------------------------------------------

  function collapseMargins(element) {
    if (element != viewport && element.currentStyle.position !== "absolute") {
      collapseMargin(element, "marginTop");
      collapseMargin(element, "marginBottom");
    }
  };

  function collapseMargin(element, type) {
    if (!element.runtimeStyle[type]) {
      var parentElement = element.parentElement;
      var isTopMargin = type === "marginTop";
      if (parentElement && parentElement.currentStyle.hasLayout && !IE7._getElementSibling(element, isTopMargin ? "previous" : "next")) return;
      var child = element[isTopMargin ? "firstChild" : "lastChild"];
      if (child && child.nodeName < "@") child = IE7._getElementSibling(child, isTopMargin ? "next" : "previous");
      if (child && child.currentStyle.styleFloat === "none" && child.currentStyle.hasLayout) {
        collapseMargin(child, type);
        margin = _getMargin(element, element.currentStyle[type]);
        childMargin = _getMargin(child, child.currentStyle[type]);
        if (margin < 0 || childMargin < 0) {
          element.runtimeStyle[type] = margin + childMargin;
        } else {
          element.runtimeStyle[type] = Math.max(childMargin, margin);
        }
        child.runtimeStyle[type] = "0px";
      }
    }
  };

  function _getMargin(element, value) {
    return value === "auto" ? 0 : getPixelValue(element, value);
  };

  // -----------------------------------------------------------------------
  // box-model
  // -----------------------------------------------------------------------

  // constants
  var UNIT = /^[.\d][\w]*$/, AUTO = /^(auto|0cm)$/;

  var apply = {};
  layout.borderBox = function(element){
    apply.Width(element);
    apply.Height(element);
  };

  var _fixWidth = function(HEIGHT) {
    apply.Width = function(element) {
      if (!PERCENT.test(element.currentStyle.width)) _fixWidth(element);
      if (HEIGHT) collapseMargins(element);
    };

    function _fixWidth(element, value) {
      if (!element.runtimeStyle.fixedWidth) {
        if (!value) value = element.currentStyle.width;
        element.runtimeStyle.fixedWidth = UNIT.test(value) ? Math.max(0, getFixedWidth(element, value)) + "px" : value;
        setOverrideStyle(element, "width", element.runtimeStyle.fixedWidth);
      }
    };

    function layoutWidth(element) {
      if (!isFixed(element)) {
        var layoutParent = element.offsetParent;
        while (layoutParent && !layoutParent.currentStyle.hasLayout) layoutParent = layoutParent.offsetParent;
      }
      return (layoutParent || viewport).clientWidth;
    };

    function getPixelWidth(element, value) {
      if (PERCENT.test(value)) return parseInt(parseFloat(value) / 100 * layoutWidth(element));
      return getPixelValue(element, value);
    };

    var getFixedWidth = function(element, value) {
      var borderBox = element.currentStyle["ie7-box-sizing"] === "border-box";
      var adjustment = 0;
      if (MSIE5 && !borderBox)
        adjustment += getBorderWidth(element) + getWidth(element, "padding");
      else if (!MSIE5 && borderBox)
        adjustment -= getBorderWidth(element) + getWidth(element, "padding");
      return getPixelWidth(element, value) + adjustment;
    };

    // easy way to get border thickness for elements with "layout"
    function getBorderWidth(element) {
      return element.offsetWidth - element.clientWidth;
    };

    // have to do some pixel conversion to get padding/margin thickness :-(
    function getWidth(element, type) {
      return getPixelWidth(element, element.currentStyle[type + "Left"]) + getPixelWidth(element, element.currentStyle[type + "Right"]);
    };

    // -----------------------------------------------------------------------
    // min/max
    // -----------------------------------------------------------------------

    HEADER += "*{minWidth:none;maxWidth:none;min-width:none;max-width:none}";

    // handle min-width property
    layout.minWidth = function(element) {
      // IE6 supports min-height so we frig it here
      //#if (element.currentStyle.minHeight === "auto") element.runtimeStyle.minHeight = 0;
      if (element.currentStyle["min-width"] != null) {
        element.style.minWidth = element.currentStyle["min-width"];
      }
      if (register(arguments.callee, element, element.currentStyle.minWidth !== "none")) {
        layout.boxSizing(element);
        _fixWidth(element);
        resizeWidth(element);
      }
    };

    // clone the minWidth function to make a maxWidth function
    eval("IE7.Layout.maxWidth=" + String(layout.minWidth).replace(/min/g, "max"));

    // apply min/max restrictions
    function resizeWidth(element) {
      // check boundaries
      if (element == document.body) {
        var width = element.clientWidth;
      } else {
        var rect = element.getBoundingClientRect();
        width = rect.right - rect.left;
      }
      if (element.currentStyle.minWidth !== "none" && width < getFixedWidth(element, element.currentStyle.minWidth)) {
        element.runtimeStyle.width = element.currentStyle.minWidth;
      } else if (element.currentStyle.maxWidth !== "none" && width >= getFixedWidth(element, element.currentStyle.maxWidth)) {
        element.runtimeStyle.width = element.currentStyle.maxWidth;
      } else {
        element.runtimeStyle.width = element.runtimeStyle.fixedWidth;
      }
    };

    // -----------------------------------------------------------------------
    // right/bottom
    // -----------------------------------------------------------------------

    function fixRight(element) {
      if (register(fixRight, element, /^(fixed|absolute)$/.test(element.currentStyle.position) &&
        getDefinedStyle(element, "left") !== "auto" &&
        getDefinedStyle(element, "right") !== "auto" &&
        AUTO.test(getDefinedStyle(element, "width")))) {
          resizeRight(element);
          layout.boxSizing(element);
      }
    };
    layout.fixRight = fixRight;

    function resizeRight(element) {
      var left = getPixelWidth(element, element.runtimeStyle._left || element.currentStyle.left);
      var width = layoutWidth(element) - getPixelWidth(element, element.currentStyle.right) -  left - getWidth(element, "margin");
      if (parseInt(element.runtimeStyle.width) === width) return;
      element.runtimeStyle.width = "";
      if (isFixed(element) || HEIGHT || element.offsetWidth < width) {
        if (!MSIE5) width -= getBorderWidth(element) + getWidth(element, "padding");
        if (width < 0) width = 0;
        element.runtimeStyle.fixedWidth = width;
        setOverrideStyle(element, "width", width);
      }
    };

  // -----------------------------------------------------------------------
  // window.onresize
  // -----------------------------------------------------------------------

    // handle window resize
    var clientWidth = 0;
    addResize(function() {
      if (!viewport) return;
      var i, wider = (clientWidth < viewport.clientWidth);
      clientWidth = viewport.clientWidth;
      // resize elements with "min-width" set
      var elements = layout.minWidth.elements;
      for (i in elements) {
        var element = elements[i];
        var fixedWidth = (parseInt(element.runtimeStyle.width) === getFixedWidth(element, element.currentStyle.minWidth));
        if (wider && fixedWidth) element.runtimeStyle.width = "";
        if (wider == fixedWidth) resizeWidth(element);
      }
      // resize elements with "max-width" set
      var elements = layout.maxWidth.elements;
      for (i in elements) {
        var element = elements[i];
        var fixedWidth = (parseInt(element.runtimeStyle.width) === getFixedWidth(element, element.currentStyle.maxWidth));
        if (!wider && fixedWidth) element.runtimeStyle.width = "";
        if (wider !== fixedWidth) resizeWidth(element);
      }
      // resize elements with "right" set
      for (i in fixRight.elements) resizeRight(fixRight.elements[i]);
    });

  // -----------------------------------------------------------------------
  // fix CSS
  // -----------------------------------------------------------------------
    if (MSIE5) {
      IE7.CSS.addRecalc("width", NUMERIC, apply.Width);
    }
    if (appVersion < 7) {
      IE7.CSS.addRecalc("max-width", NUMERIC, layout.maxWidth);
      IE7.CSS.addRecalc("right", NUMERIC, fixRight);
    } else if (appVersion == 7) {
      if (HEIGHT) IE7.CSS.addRecalc("height", "[\\d.]+%", function(element) {
        element.runtimeStyle.pixelHeight = parseInt(layoutWidth(element) * element.currentStyle["ie7-height"].slice(0, -1) / 100);
      });
    }
  };

  eval("var _fixHeight=" + rotate(_fixWidth));

  // apply box-model + min/max fixes
  _fixWidth();
  _fixHeight(true);
  
  if (appVersion < 7) {
    IE7.CSS.addRecalc("min-width", NUMERIC, layout.minWidth);
    IE7.CSS.addFix(/\bmin-height\s*/, "height");
  }
})();
