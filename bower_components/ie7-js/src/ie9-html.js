
var HTML5 = "article,aside,audio,canvas,details,figcaption,figure,footer,header,hgroup,mark,menu,meter,nav,output,progress,section,summary,time,video".split(",");
for (var i = 0, tagName; tagName = HTML5[i]; i++) document.createElement(tagName);

HEADER += "datalist{display:none}\
details{padding-left:40px;display:block;margin:1em 0}\
meter,progress{vertical-align:-0.2em;width:5em;height:1em;display:inline-block}\
progress{width:10em;}\
article,aside,figcaption,footer,header,hgroup,summary,section,nav{display:block;margin:1em 0}\
figure{margin:1em 40px;display:block}\
mark{background:yellow}";
