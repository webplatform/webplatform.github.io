/*!
 * WebPlatform Docs
 */

/**
 * WebPlatform Docs JavaScript
 *
 * Notice that functions that starts by "mw." were originally
 * managed by MediaWiki ("MW"), but this project doesn't use MW at all.
 *
 * If you refactor, please ensure we remove any requirement for them.
 *
 * In the meantime, the following will let any MW code to work
 * without breaking.
 *
 * ```js
 * var mw = {loader:{state:function getState(){console.log('mw loader state',arguments);return null;}},config:{get:function getConfig(){console.log('mw config get',arguments); return {};}}};
 * ``
 *
 * The following scripts were extracted from MW with the following requests
 *
 * - /docs/w/load.php?debug=true&lang=en&modules=jquery&only=scripts&skin=webplatform&version=20150623T190654Z
 * - /docs/w/load.php?debug=false&lang=en&modules=skins.webplatform&only=scripts&skin=webplatform&*
 */

/*
 * Add Hypothes.is sidebar
 */
function annotatorLoader() {
    var ssl = !!document.location.protocol.match(/^https:/),
        embedUrl = '//notes.webplatform.org/embed.js',
        mwContentNamespaces = mw.config.get('wgContentNamespaces'),
        showAnnotator = false;
    if (showAnnotator === true) {
        if (ssl && embedUrl.match(
                /^https:/)) {
            var msg = ('Sorry, but the annotator sidebar is currently unavailable ' + 'on pages that are served through HTTPS.');
            mw.notify(msg, {
                title: "Cannot load annotation sidebar"
            });
        } else {
            var embed = document.createElement('script');
            embed.setAttribute('src', embedUrl);
            document.body.appendChild(embed);
        }
    }
}




/*
 * Generate Table of Contents on any page
 */
function mainToc () {
    var readinessBlock = document.querySelectorAll('#main-content .readiness-state')[0] || {};
    if(!!readinessBlock.tagName && readinessBlock.tagName.toLowerCase() === 'div') {
        document.body.appendChild(readinessBlock);
    }

    var mainContent = document.getElementById('main-content');
    if (mainContent === null) {
        return;
    }
    var headings = Array.prototype.slice.apply(mainContent.querySelectorAll('h2, h3, h4, h5, h6'));
    if (headings.length < 2) {
        return;
    }
    document.body.classList.add('with-toc');
    var ol = document.createElement('ol'),
        li, rootOl = ol;
    for (var i = 0, h; h = headings[i++];) {
        var level = hLevel(h);
        if (level > previousLevel) {
            ol = li.appendChild(document.createElement('ol'));
        } else if (level < previousLevel) {
            ol = ol.
            parentNode.parentNode;
        }
        li = tocItem(h);
        if (li) {
            ol.appendChild(li);
        }
        var previousLevel = level;
    }

    function tocItem(h) {
        var li = document.createElement('li'),
            a = document.createElement('a');
        var id, text;
        var headline = h.querySelector('.mw-headline[id]');
        if (headline) {
            id = headline.id;
            text = headline.textContent;
        } else {
            id = h.id;
            text = h.firstChild.textContent || h.textContent;
            if (!id) {
                id = text.replace(/\s+/g, '-');
                if (document.getElementById(id)) {
                    id += '-2';
                }
                h.id = id;
            }
        }
        a.textContent = text;
        a.href = '#' + id;
        li.appendChild(a);
        return li;
    }

    function hLevel(h) {
        return +h.nodeName.match(/h(\d)/i)[1];
    }
    var toc = document.createElement('aside');
    toc.id = 'sidebar';
    toc.className = 'custom-toc';
    var tocH = document.createElement('h2');
    tocH.id = 'sidebar-title';
    tocH.innerHTML = 'Contents';
    toc.appendChild(tocH);
    toc.appendChild(rootOl);
    mainContent.parentNode.insertBefore(toc, mainContent);

    console.log('mainToc loaded');
}




/*
 * Handle Edit button to send to GitHub.
 *
 * initialized through mainInit
 */
function mainEditButton(){
    'use strict';

    var title = document.querySelectorAll('h1 .mw-headline')[0] || {},
        editBtn = document.querySelectorAll('.toolbar a.edit')[0] || {},
        baseSourceRepo = "https://github.com/webplatform/docs{0}/blob/manual-edits",
        namespaceTests = [[/^\/Meta/, '-meta'], [/^\/WPD/, '-wpd']],
        urlObj = new URL(window.location.href),
        pathName = urlObj.pathname.replace('.html', ''),
        sourceFile = baseSourceRepo + pathName,
        namespaceTestsIdx,
        namespacePrefixOutcome = '',
        editHref;

    if(typeof editBtn === 'object' && typeof editBtn.text === 'string') {
        for(namespaceTestsIdx = 0; namespaceTestsIdx <= namespaceTests.length - 1; namespaceTestsIdx ++) {
            if(namespaceTests[namespaceTestsIdx][0].test(pathName)){
                namespacePrefixOutcome = namespaceTests[namespaceTestsIdx][1];
            }
        }
        sourceFile = sourceFile.format(namespacePrefixOutcome).replace(/manual-edits\/(Meta|WPD)\//, 'master/');
        editHref = sourceFile + ((/\/$/.test(pathName))?'index.md':'.md');
        editBtn.setAttribute('href', editHref);
    }

    if(typeof title === 'object' && typeof title.textContent === 'string'){
        document.title = title.textContent + ' - ' + document.title;
    }

    console.log('mainEditButton loaded');
}





/*
 * Strig.format polyfill
 */
if (!String.prototype.format) {
  String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) {
      return typeof args[number] != 'undefined'
        ? args[number]
        : match
      ;
    });
  };
}





/*
 * Bootstrap it all
 */
(function init () {
    if (document.querySelectorAll && !!document.body.addEventListener) {
        var dropdowns = document.querySelectorAll('.dropdown');
        for (var i = 0, dropdown; dropdown = dropdowns[i++];) {
            dropdown.addEventListener('focus', function() {
                this.className += ' focus';
            }, true);
            dropdown.addEventListener('blur', function() {
                this.className = this.className.replace(/\s+focus\b/, ' ');
            }, true);
        }

        mainEditButton();
        mainToc();
    }
}());
