(function($) {

  $.trimString = function(str) {
    return str.replace(/^\s+|\s+$/g, '');
  };

  /* --------------------------------------------------------------------------
     Methods related to manifest data
     -------------------------------------------------------------------------- */

  $.getImageIndexById = function(imagesList, id) {
    var imgIndex = 0;

    jQuery.each(imagesList, function(index, img) {
      if ($.trimString(img['@id']) === $.trimString(id)) {
        imgIndex = index;
      }
    });

    return imgIndex;
  };

  $.getThumbnailForCanvas = function(canvas, width, useThumbnailProperty) {
    var version = "1.1",
    compliance = -1,
    service,
    thumbnailUrl;
    if(useThumbnailProperty == undefined) useThumbnailProperty = true ;

    // Ensure width is an integer...
    width = parseInt(width, 10);

    // Respecting the Model...
    if (useThumbnailProperty && canvas.hasOwnProperty('thumbnail')) {
      // use the thumbnail image, prefer via a service
      if (typeof(canvas.thumbnail) == 'string') {
        thumbnailUrl = canvas.thumbnail;
      } else if (canvas.thumbnail.hasOwnProperty('service')) {
        service = canvas.thumbnail.service;
        if(service.hasOwnProperty('profile')) {
            compliance = $.Iiif.getComplianceLevelFromProfile(service.profile);
        }
        if(compliance === 0){
            // don't change existing behaviour unless compliance is explicitly 0
            thumbnailUrl = canvas.thumbnail['@id'];
        } else {
            // Get the IIIF Image API via the @context
            if (service.hasOwnProperty('@context')) {
                version = $.Iiif.getVersionFromContext(service['@context']);
            }
            thumbnailUrl = $.Iiif.makeUriWithWidth(service, width, version);
        }
      } else {
        thumbnailUrl = canvas.thumbnail['@id'];
      }
    } else {
      // No thumbnail, use main image
      var resource ;
      if(canvas.images) {
        resource = canvas.images[0].resource;
        service = resource['default'] ? resource['default'].service : resource.service;
        if (service.hasOwnProperty('@context')) {
          version = $.Iiif.getVersionFromContext(service['@context']);
        }
        var cl = $.Iiif.getComplianceLevelFromProfile(service.profile),w,h; 
        if (cl == 0  && service.width && width > 200) {          
          w = Number(service.width); 
          h = Number(service.height);
          if(w > h) {
            // fix for very big images like bdr:I1CZ5005
            if(w < 3500) thumbnailUrl = $.Iiif.makeUriWithWidth(service, "max", version); 
            else thumbnailUrl = $.Iiif.makeUriWithWidth(service, 3500, version);
          } else {
            // fix for loading big portrait images 
            if(h < 3500) thumbnailUrl = $.Iiif.makeUriWithWidth(service, "max", version); 
            else thumbnailUrl = $.Iiif.makeUriWithWidth(service, Math.round(3500 * w/h), version);
          }
        } else {
          // same for Taisho case
          w = Number(canvas.width); 
          h = Number(canvas.height);
          if(w > h) width = Math.min(w,3500);
          else if(h < 3500) width = w;
          else width = Math.round(3500 * w/h);
          thumbnailUrl = $.Iiif.makeUriWithWidth(service, width, version);
        }
      } 
    }
    return thumbnailUrl;
  };

  /*
     miscellaneous utilities
     */

  $.getQueryParams = function(url) {
    var assoc  = {};
    var decode = function (s) { return decodeURIComponent(s.replace(/\+/g, " ")); };
    var queryString = url.split('?')[1];
    if (typeof queryString === "undefined") {
      return {};
    }
    var keyValues = queryString.split('&');

    for(var i in keyValues) {
      var key = keyValues[i].split('=');
      if (key.length > 1) {
        assoc[decode(key[0])] = decode(key[1]);
      }
    }

    return assoc;
  };

  $.genUUID = function() {
    var idNum = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16|0, v = c == 'x' ? r : (r&0x3|0x8);
      return v.toString(16);
    });

    return idNum;
  };

  jQuery.fn.slideFadeToggle  = function(speed, easing, callback) {
    return this.animate({opacity: 'toggle', height: 'toggle'}, speed, easing, callback);
  };

  $.throttle = function(func, wait, options) {
    var context, args, result;
    var timeout = null;
    var previous = 0;

    if (typeof options !== 'undefined') {
      options = {};
    }

    var later = function() {
      previous = options.leading === false ? 0 : new Date();
      timeout = null;
      result = func.apply(context, args);
    };
    return function() {
      var now = new Date();
      if (!previous && options.leading === false) previous = now;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0) {
        clearTimeout(timeout);
        timeout = null;
        previous = now;
        result = func.apply(context, args);
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  $.debounce = function(func, wait, immediate) {
    var timeout, args, context, timestamp, result;
    return function() {
      context = this;
      args = arguments;
      timestamp = new Date();
      var later = function() {
        var last = (new Date()) - timestamp;
        if (last < wait) {
          timeout = setTimeout(later, wait - last);
        } else {
          timeout = null;
          if (!immediate) result = func.apply(context, args);
        }
      };
      var callNow = immediate && !timeout;
      if (!timeout) {
        timeout = setTimeout(later, wait);
      }
      if (callNow) result = func.apply(context, args);
      return result;
    };
  };


  var nativeranges = [
    {"range": [0x0F00, 0x0FFF], "lt": "tibt"},
  ];

  $.guessTibtFromRange = function(str) {
    var i, cp ;
    var nl = nativeranges[0];
    for(i = 0 ; i < str.length ; i++) {
      cp = str.codePointAt(i);
      if (cp > nl.range[0] && cp < nl.range[1]) {
        return true;
      }
    }
    return false;
  };

  // http://upshots.org/javascript/jquery-test-if-element-is-in-viewport-visible-on-screen
  $.isOnScreen = function(elem, outsideViewportFactor) {
    var factor = 1;
    if (outsideViewportFactor) {
      factor = outsideViewportFactor;
    }
    var win = jQuery(window);
    var viewport = {
      top : win.scrollTop(), //* factor),
      left : (win.scrollLeft() * factor)
    };
    viewport.bottom = viewport.top + (win.outerHeight()) * factor;
    viewport.right = (viewport.left + win.outerWidth()) * factor;

    var el = jQuery(elem);
    var bounds = el.offset();
    bounds.bottom = bounds.top + el.height();
    bounds.right = bounds.left + el.width();

    var valid = (bounds.left != 0 && bounds.right != bounds.left) ;

    var ret = valid && (!(viewport.right < bounds.left || viewport.left > bounds.right || viewport.bottom < bounds.top || viewport.top > bounds.bottom));

    //if(ret) 
    //  console.log("vp",elem.style.cssText,JSON.stringify(bounds),JSON.stringify(viewport));
    
    return ret ;

  };

  $.getRangeIDByCanvasID = function(structures, canvasID /*, [given parent range] (for multiple ranges, later) */) {
    var ranges = jQuery.grep(structures, function(range) { return jQuery.inArray(canvasID, range.canvases) > -1; }),
    rangeIDs = jQuery.map(ranges,  function(range) { return range['@id']; });

    return rangeIDs;
  };

  $.layoutDescriptionFromGridString = function (gridString) {
    var columns = parseInt(gridString.substring(gridString.indexOf("x") + 1, gridString.length),10),
    rowsPerColumn = parseInt(gridString.substring(0, gridString.indexOf("x")),10),
    layoutDescription = {
      type:'row'
    };

    if (gridString === "1x1") return layoutDescription;

    layoutDescription.children = [];

    // Javascript does not have range expansions quite yet,
    // long live the humble for loop.
    // Use a closure to contain the column and row variables.
    for (var i = 0, c = columns; i < c; i++) {
      var column = { type: 'column'};

      if (rowsPerColumn > 1) {
        column.children = [];
        for (var j = 0, r = rowsPerColumn; j < r; j++) {
          column.children.push({
            type: 'row'
          });
        }
      }

      layoutDescription.children.push(column);
    }

    return layoutDescription;
  };

  // Configurable Promises
  $.createImagePromise = function(imageUrl) {
    var img = new Image(),
    dfd = jQuery.Deferred();

    img.onload = function() {
      dfd.resolve(img.src);
    };

    img.onerror = function() {
      dfd.reject(img.src);
    };

    dfd.fail(function() {
      console.log('image failed to load: ' + img.src);      
      dfd.resolve("failed");
    });

    img.src = imageUrl;
    return dfd.promise();
  };

  $.enterFullscreen = function(el) {
    if (el.requestFullscreen) {
      el.requestFullscreen();
    } else if (el.mozRequestFullScreen) {
      el.mozRequestFullScreen();
    } else if (el.webkitRequestFullscreen) {
      el.webkitRequestFullscreen();
    } else if (el.msRequestFullscreen) {
      el.msRequestFullscreen();
    }
  };

  $.exitFullscreen = function() {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    }
  };

  $.isFullscreen = function() {
    var fullscreen = $.fullscreenElement();
    return (fullscreen.length > 0);
  };

  $.fullscreenElement = function() {
    return (document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement);
  };

  $.sanitizeHtml = function(dirty) {
    return sanitizeHtml(dirty, {
      allowedTags: ['a', 'b', 'br', 'i', 'img', 'p', 'span', 'strong', 'em', 'ul', 'ol', 'li'],
      allowedAttributes: {
        'a': ['href', 'target'],
        'img': ['src', 'alt'],
        'p': ['dir']
      }
    });
  };

}(Mirador));
