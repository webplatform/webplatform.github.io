
// =========================================================================
// ie8-layout.js
// =========================================================================

if (appVersion < 8) {
  IE7.CSS.addRecalc("border-spacing", NUMERIC, function(element) {
    if (element.currentStyle.borderCollapse !== "collapse") {
      element.cellSpacing = getPixelValue(element, element.currentStyle["ie7-border-spacing"].split(" ")[0]);
    }
  });
  IE7.CSS.addRecalc("box-sizing", "content-box", IE7.Layout.boxSizing);
  IE7.CSS.addRecalc("box-sizing", "border-box", IE7.Layout.borderBox);
}
