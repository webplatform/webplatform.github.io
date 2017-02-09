
// =========================================================================
// ie8-graphics.js
// =========================================================================

if (appVersion < 8) {
  // fix object[type=image/*]
  var IMAGE = /^image/i;
  IE7.HTML.addRecalc("object", function(element) {
    if (IMAGE.test(element.type)) {
      element.body.style.cssText = "margin:0;padding:0;border:none;overflow:hidden";
      return element;
    }
  });
}
