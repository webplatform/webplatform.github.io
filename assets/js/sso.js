/*global sso,mw,window,document,XMLHttpRequest,ssoOptions*/

/**
 * IMPORTANT: Make sure the following is also commited in [0]. Ideally this part
 *            should be taken from [0] and uglified here.
 *
 * [0]: https://github.com/webplatform/mediawiki/blob/master/skin/sso.js
 *
 */

/**
 * WebPlatform SSO Relying Party communication manager
 * # Trying manually the API
 *
 *   From a browser window that can frame accounts.webplatform.org, run in the
 *   developer tools terminal.
 *
 *   e.g.:
 *       ```javascript
 *       var IdP = "https://accounts.webplatform.org/channel?service=sso";
 *       var tunnel = document.getElementById("authChecker").contentWindow;
 *
 *       tunnel.postMessage("ping:Renoirb", IdP); // Hi IdP, i’m signed-in!
 *       tunnel.postMessage("ping:null", IdP);    // Hi IdP, i’m NOT signed-in, should I be?
 *       tunnel.postMessage("signoff", IdP);      // Hi IdP, destroy my session, i'll do the same!
 *       ```
 * # Deployment
 *
 * - Copy contents of this file, pass it through an online uglifyer
 * - Copy the uglified JavaScript into MediaWiki skin/webplatform/webplatform.js, at the bottom
 * - The line before the uglified javascript, add configuration and logoff handler:
 *
 *     ```javascript
 *     var ssoOptions=ssoOptions||{logging:false, callbackUri:mw.config.get("wgArticlePath").replace('$1', 'Special:AccountsHandler/callback')};
 *     jQuery('body').on('click', '#pt-logout a',function(evt){evt.preventDefault();window.sso.signOut();});
 *     ```
 * - Done
 *
 * To use this JavaScript module in another web application than MediaWiki, follow this skeleton:
 *
 *     ```javascript
 *     var ssoOptions=ssoOptions||{logging:false, callbackUri:'/path/to/webapp-callback'};
 *
 *     // Create an event listener to execute the following when
 *     // a user clicks on log out.
 *     window.sso.signOut();
 *     ```
 *
 *
 *
 * # Improvement notes:
 *
 * - Better IE support:
 *   - note: IE11 on Windows 8.1 works
 *   - url: http://www.informit.com/articles/article.aspx?p=667416&seqNum=2
 * - Better Async with Promise:
 *   - note: We need only one call so far, maybe overkill
 *   - url: http://krasimirtsonev.com/blog/article/Cross-browser-handling-of-Ajax-requests-in-absurdjs
 **/
(function ssoHandlerClosure(window) {
  "use strict";

  var channelOrigin = "https://accounts.webplatform.org/channel?service=sso",
      wpdSsoUsername = document.cookie.replace(/(?:(?:^|.*;\s*)wpdSsoUsername\s*\=\s*([^;]*).*$)|^.*$/, "$1");

  function iframeLoadedHandler() {
    setTimeout(sso.doCheck.bind(sso), 400);
    console.log("SsoHandler private iframeLoadedHandler; iframeLoadedHandler, will call check in a few seconds");
  }

  function createTunnel() {
    var authChecker = null,
        myEndpoint = sso.config.serviceEndpoint;

    console.log("SsoHandler private createTunnel; to create iframe to [myEndpoint]", myEndpoint);

    if (myEndpoint === null) {
      throw new Error("SsoHandler had problems creating iframe: No endpoint to send requests to for, we got " + myEndpoint);
    }
    authChecker = document.createElement('iframe');
    authChecker.src = myEndpoint;
    authChecker.width = 0;
    authChecker.height = 0;
    authChecker.id = "authChecker";
    authChecker.onload = iframeLoadedHandler;

    try {
      document.body.appendChild(authChecker);
      document.getElementById("authChecker").style.display = "none";
    } catch (e) {
      console.log("SsoHandler private createTunnel, caught exception will return null", e);
      return null;
    }

    return authChecker;
  }

  function postBackendHandler(XMLHttpRequestProgressEvent) {
    var xhrObj = XMLHttpRequestProgressEvent.currentTarget;

    if (xhrObj.readyState === 4) {
      console.log("SsoHandler private postBackendHandler; readyState=4, status=" + xhrObj.status);
      console.debug("SsoHandler private postBackendHandler; xhrObj=", xhrObj);
      if (xhrObj.status === sso.config.alreadyHasSessionStatusValue) {
        return;
      }
      if (xhrObj.status === sso.config.postSuccessStatusValue) {
        window.location.reload(true);
      }
      if (xhrObj.status === sso.config.postLogoffStatusValue) {
        window.location.reload(true);
      }
    }
  }

  // Maybe improve as described https://gist.github.com/shimondoodkin/4706967

  function postBackend(stateObj) {
    var xhr, self = this;

    console.debug("SsoHandler private postBackend; stateObj", stateObj);
    console.debug("SsoHandler private postBackend; self", self);

    if (window.XMLHttpRequest) {
      xhr = new XMLHttpRequest();
      xhr.open("POST", self.config.callbackUri, true);
      //xhr.setRequestHeader("Content-length", recoveryPayload.length);
      //xhr.setRequestHeader("Connection", "close");
      xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
      xhr.onreadystatechange = postBackendHandler;
      xhr.send(stateObj.recoveryPayload);
    }
  }

  function processReceived() {
    var self = this;

    //console.debug("SsoHandler private processReceived; self", self);
    if (self.state.ssoHasSession === true && self.state.isAnonymous === false) {
      console.log("SsoHandler private processReceived; Session on both accounts server and local; nothing else to do");
      return;
    }

    if (self.state.ssoHasSession === false && self.state.isAnonymous === true) {
      console.log("SsoHandler private processReceived; No Session on accounts server, no session locally; nothing to do");
      return;
    }

    console.log("SsoHandler private processReceived; Should send post to " + self.config.callbackUri);
    postBackend.call(self, self.state);
  }

  function messageHandler(input) {
    var received, self = this;

    // As suggested in https://github.com/webplatform/notes-server/commit/49c1c04d49a5015ba3a5a68d7104ef2eeb10c60b
    // and reported in https://github.com/webplatform/notes-server/issues/17
    if (self.tunnel.contentWindow !== input.source) {
      return;
    }

    if ( !! input.data) {
      received = input.data;
      self.state.recoveryPayload += received.recoveryPayload || "";
      if (received.hasSession === false) {
        self.state.recoveryPayload = 'recoveryPayload='; // An explicity empty
      }
      self.state.ssoHasSession = received.hasSession || false; // Remains false if its not there
      console.log("SsoHandler private messageHandler, [ssoHasSession]:", self.state.ssoHasSession);
      console.debug("SsoHandler private messageHandler, [recoveryPayload,received]:", self.state.recoveryPayload, received);
      processReceived.call(self);
    } else {
      console.log("SsoHandler private messageHandler; no data received from accounts server");
    }
  }

  /* @namespace */

  function SsoHandlerClass(configObject) {

    if (window.ssoOptions.logging === false) {
      console = console || {}; // jshint ignore:line
      console.debug = function () {}; // jshint ignore:line
    }

    var defaultConfigs = {
      serviceEndpoint: channelOrigin,
      callbackUri: "/test/Special:AccountsHandler/callback",
      postSuccessStatusValue: 201,
      postLogoffStatusValue: 401,
      alreadyHasSessionStatusValue: 204,
      logging: false,
      appendRefererServiceEndpoint: false
    },
        mergedConfig = {},
        prop, inputConfig = configObject || {};

    for (prop in defaultConfigs) {
      if (Object.prototype.hasOwnProperty.call(defaultConfigs, prop)) {
        mergedConfig[prop] = defaultConfigs[prop];
      }
    }
    for (prop in inputConfig) {
      if (Object.prototype.hasOwnProperty.call(inputConfig, prop)) {
        mergedConfig[prop] = inputConfig[prop];
      }
    }

    this.config = mergedConfig;

    this.state = {
      received: null,
      checkedOnce: false,
      ssoHasSession: false,
      recoveryPayload: "recoveryPayload=",
      username: null,
      isAnonymous: true
    };

    window.addEventListener("message", messageHandler.bind(this), false);

    console.debug("SsoHandlerClass instantiation; [wpdSsoUsername]:", wpdSsoUsername);
  }

  SsoHandlerClass.prototype.doCheck = function ssoHandlerDoCheck() {
    var self = this;
    console.debug("SsoHandler.doCheck; [callbackUri,isAnonymous,username]: ", self.config.callbackUri, self.state.isAnonymous, self.state.username);

    if (self.tunnel === null) {
      console.log("SsoHandler.doCheck; no tunnel, we stop here.");
      return;
    }

    console.debug("SsoHandler.doCheck; pinging the accounts server");
    try {
      self.tunnel.contentWindow.postMessage("ping:" + self.state.username, self.config.serviceEndpoint);
    } catch (ignore) {}
  };

  SsoHandlerClass.prototype.signOut = function ssoHandlerSignOut() {
    var self = this;
    console.log("SsoHandler.signOut; asking to destroy the session");

    if (self.tunnel === null) {
      console.log("SsoHandler.signOut; no tunnel, we stop here.");
      return;
    }

    try {
      self.tunnel.contentWindow.postMessage("signoff", self.config.serviceEndpoint);
    } catch (ignore) {}
  };

  SsoHandlerClass.prototype.post = function tempPost(intentId) {
    var self = this;
    console.debug("SsoHandler.post; with intent id " + intentId);

    if (self.tunnel === null) {
      console.log("SsoHandler.post; no tunnel, we stop here.");
      return;
    }

    try {
      self.tunnel.contentWindow.postMessage(intentId, self.config.serviceEndpoint);
    } catch (ignore) {}
  };

  SsoHandlerClass.prototype.init = function ssoHandlerInit() {
    var self = this;
    self.state.username = window.mw.user.getName() || null;
    self.state.isAnonymous = (self.state.username === null) ? true : false;

    if (self.config.appendRefererServiceEndpoint === true) {
      var redirectTo = encodeURIComponent(window.location.protocol) + "%2F%2F" + window.location.hostname + encodeURIComponent(window.location.pathname || ""),
          searchQuery = ( !! window.location.search) ? encodeURIComponent(window.location.search || "") : "";

      self.config.serviceEndpoint += "&redirectTo=" + redirectTo + searchQuery;
    }

    self.tunnel = createTunnel();
    try {
      window.mw.notify('Syncing with central account server, the page might reload.', {
        title: 'WebPlatform SSO'
      });
    } catch (ignore) {}
    console.debug("SsoHandler.init; state:", self.state);
  };

  var ssoOptions = window.ssoOptions || {};
  window.sso = new SsoHandlerClass(ssoOptions);

  setTimeout(sso.init.bind(sso), 1200);

})(window);