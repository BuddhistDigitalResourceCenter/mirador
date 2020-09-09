

(function($) {

  $.ThumbnailsView = function(options) {

    jQuery.extend(this, {
      currentImgIndex:      0,
      canvasID:              null,
      focusImages:          [],
      manifest:             null,
      element:              null,
      imagesList:           [],
      imagesListLtr:           [],
      vDirectionStatus:           '',
      appendTo:             null,
      thumbInfo:            {thumbsHeight: 150, listingCssCls: 'listing-thumbs', thumbnailCls: 'thumbnail-view'},
      defaultThumbWidth:    180,
      defaultThumbHeight:   150,
      windowId:             null,
      panel:                false,
      lazyLoadingFactor:    1.35,  //should be >= 1
      eventEmitter:         null
    }, options);

    this.init();
  };


  $.ThumbnailsView.prototype = {

    updateGetEtextPage : function (page){
      //console.log("what?",page,window.getEtextPage,this.getEtextPage);
      if(this.getEtextPage) return this.getEtextPage(page) ;
      else if(window.getEtextPage) return window.getEtextPage(page) ;
    },

    init: function() {
      this.imagePromise = {} ;

      if (this.canvasID !== null) {
        this.currentImgIndex = $.getImageIndexById(this.imagesList, this.canvasID);
      }
      if(this.vDirectionStatus == 'rtl'){
        this.imagesList =  this.imagesListLtr.concat();
      }
      this.loadContent();
      if(this.vDirectionStatus == 'rtl'){
        var firstCanvasId = this.imagesList[0]['@id'];
        var firstCanvasThumbSelector = 'img.thumbnail-image[data-image-id="'+firstCanvasId+'"]';
        jQuery(this.appendTo).find('.panel-thumbnail-view').addClass('v-direction-rtl');
        jQuery(this.appendTo).find('.thumbnail-view').find('li').each(function(){
          jQuery(this).addClass('thumbnail-rtl');
        });
      }
      this.bindEvents();
      this.listenForActions();
    },

    initThumbs: function( tplData, useThumbnailProperty) {
      var _this = this;

      tplData.thumbs = jQuery.map(this.imagesList, function(canvas, index) {

        if (canvas.width === 0) {
          return {};
        }

        // TODO wrong w x h in https://iiif.archivelab.org/iiif/rashodgson13/manifest.json ...        
        var aspectRatio = canvas.height/canvas.width,
            width = _this.defaultThumbWidth,
            height = width * aspectRatio ;

        var thumbnailUrl = $.getThumbnailForCanvas(canvas, width, useThumbnailProperty);
        
        //console.log("canvas",canvas,index,thumbnailUrl,width,height);

        var title = $.JsonLd.getTextValue(canvas.label);
        if(title === "p. ") title = "p. "+(Number(index)+1);

        return {
          thumbUrl: thumbnailUrl,
          title:    title.replace(/[.] +([0-9])/,".$1"),
          id:       canvas['@id'],
          width:    width,
          height:   height,
          ratio:    width/height,
          highlight: _this.currentImgIndex === index ? 'highlight' : ''
        };
      });

      _this.element = jQuery(_this.template(tplData)).appendTo(_this.appendTo);

      if(!_this.ps) { 

        _this.ps = new PerfectScrollbar(".panel-thumbnail-view",{ minScrollbarLength:16, maxScrollbarLength:16 });
        
        for(var i = 0 ; i < tplData.thumbs.length ; i ++) {
          var val = tplData.thumbs[i].title.replace(/(^[^0-9]+)|([^0-9a-z]$)/g,"") ;
          jQuery(".goto-page select").append("<option value='"+val+"'>"+val+"</option>") ;
        }        

        jQuery(".goto-page select").selectmenu( { 
          appendTo:".goto-page",
          position: { my : "right-1 bottom-1", at: "right bottom-2" },
          select: function( event, ui ) { _this.eventEmitter.publish('GOTO_IMAGE_NUM.'+_this.windowId, ui.item.value) ; }
        });

        if(!_this.gotoPs) { 
          var container = document.querySelector(".goto-page .ui-selectmenu-menu");
          _this.gotoPs = new PerfectScrollbar(container,{ suppressScrollX: true, minScrollbarLength:12 });
          // fix for infinite scroll bug ... remove CSS border much simpler
          /*
          container.addEventListener('ps-scroll-up', function (event)   { _this.endY = false; jQuery(".ps__rail-y").removeClass("reach-end"); });
          container.addEventListener('ps-scroll-down', function (event) { 
            if(_this.endY) { 
              //console.log(jQuery(".goto-page .ui-selectmenu-menu ul").height(),jQuery(container).height()); 
              container.scrollTop = jQuery(".goto-page .ui-selectmenu-menu ul").height() - jQuery(container).height() ; 
              jQuery(".ps__rail-y").addClass("reach-end");
              //_this._endY = false ;
            } 
          });
          container.addEventListener('ps-y-reach-end', function (event) { _this.endY = true;  });
          */
        }
      }      
    },

    loadContent: function(useThumbnailProperty) {
      var _this = this,
      tplData = {
        defaultHeight:  this.thumbInfo.thumbsHeight,
        listingCssCls:  this.thumbInfo.listingCssCls,
        thumbnailCls:   this.thumbInfo.thumbnailCls
      };
      if(useThumbnailProperty == undefined) useThumbnailProperty = true ;

      _this.initThumbs(tplData, useThumbnailProperty);
    },

    updateImage: function(canvasId) {
      this.currentImgIndex = $.getImageIndexById(this.imagesList, canvasId);
      this.element.find('.highlight').removeClass('highlight');
      this.element.find("img[data-image-id='"+canvasId+"']").addClass('highlight');
      this.element.find("img[data-image-id='"+canvasId+"']").parent().addClass('highlight');
    },

    updateFocusImages: function(focusList) {
      var _this = this;
      this.element.find('.highlight').removeClass('highlight');
      jQuery.each(focusList, function(index, canvasId) {
        _this.element.find("img[data-image-id='"+canvasId+"']").addClass('highlight');
        _this.element.find("img[data-image-id='"+canvasId+"']").parent().addClass('highlight');
      });
    },

    currentImageChanged: function() {
      var _this = this,
      target = _this.element.find('.highlight'),
      scrollPosition,
      windowObject = this.state.getWindowObjectById(this.windowId);

      if (target.position()) {
        if (windowObject && windowObject.viewType === 'BookView') {
          scrollPosition = _this.element.scrollLeft() + (target.position().left + (target.next().width() + target.outerWidth())/2) - _this.element.width()/2;
          _this.element.scrollTo(scrollPosition, 900);
        } else {
          //scrollPosition = _this.element.scrollLeft() + (target.position().left + target.width()/2) - _this.element.width()/2;
          scrollPosition = _this.element.scrollTop() + (target.position().top + target.height()/2) - _this.element.height()/2;
          _this.element.scrollTop(scrollPosition);
        }
      }
    },

    listenForActions: function() {
      var _this = this;
      
      /*
      _this.eventEmitter.subscribe(('SET_CURRENT_CANVAS_ID.' + _this.windowId), function(event) {
        _this.currentImageChanged();
      });
      */

      _this.eventEmitter.subscribe('PROVIDER_IMG', function(event,src) {
          jQuery(".scroll-view .provider img").attr("src",src);
      });
      
      _this.eventEmitter.subscribe(('currentCanvasIDUpdated.' + _this.windowId), function(event) {
        _this.currentImageChanged();
      });

      _this.eventEmitter.subscribe('windowResize', $.debounce(function(){
        _this.loadImages();
      }, 100));
    },

    bindEvents: function() {
      var _this = this;
      _this.element.find('img').on('load', function() {
        jQuery(this).hide().fadeIn(750,function(){
          // Under firefox $.show() used under display:none iframe does not change the display.
          // This is workaround for https://github.com/IIIF/mirador/issues/929
          jQuery(this).css('display', 'block');
        });
      });

      jQuery(_this.element).scroll(function() {
        _this.loadImages();
      });

      //add any other events that would trigger thumbnail display (resize, etc)

      _this.element.find('.thumbnail-image').on('click', function() {
        var canvasID = jQuery(this).attr('data-image-id');
        _this.eventEmitter.publish('SET_CURRENT_CANVAS_ID.' + _this.windowId, canvasID);
        _this.eventEmitter.publish('SET_PAGINATION.' + _this.windowId, (jQuery(this).parent().index()+1) + " / " + _this.imagesList.length);
      });

      
      jQuery(window).resize(function() {
        var z = jQuery("#zoomer");        
        if(z.length && window.setZoom) window.setZoom(z.val());
      });
      
    },

    toggle: function(stateValue) {
      if (stateValue) {
        this.show();
      } else {
        this.hide();
      }
    },

    loadImages: function() {
      var _this = this;
      jQuery.each(_this.element.find("img"), function(key, value) {
        if ($.isOnScreen(value, _this.lazyLoadingFactor) && !jQuery(value).attr("src") ) {
          console.log("reload", key);
          var url = jQuery(value).attr("data");
          if(!_this.imagePromise[url]) _this.loadImage(value, url);
        }
      });
    },

    loadImage: function(imageElement, url) {
      var _this = this,  
      imagePromise = $.createImagePromise(url);
  
      /* // surprisingly not changing anything ... 
      imagePromise.fail(function() {
        imageElement.src = "missing";
      });
      */

      imagePromise.done(function(image) {

        imageElement.src = image ;

        setTimeout(function() { if(_this.ps) _this.ps.update(); }, 10);

        var showET = window.MiradorUseEtext ;

        if(showET) {
         
          var id = jQuery(imageElement).attr("data-image-id"),
              canvas = _this.imagesList.filter(function(e) { return e["@id"] === id; });

          if(canvas.length) { //} && jQuery(imageElement).isInViewport()) {

              jQuery(imageElement).next('.etext-content').addClass(showET!="open"?"hide":"").text("--");
              var prom = _this.updateGetEtextPage(canvas[0]);              
              if(!prom) jQuery(imageElement).next('.etext-content').text("");
              else prom.then(function(val) {                
                
                console.log("val",canvas[0].label[0],JSON.stringify(val,null,3));

                try { 

                  var labelArray = [],
                      txt = "",
                      css = "" ;

                  //var checkB = jQuery('#showEtext') ;
                  //if(!checkB || !checkB.get(0).checked) css += "hide " ;
                  if(!showET) css += "hide " ;

                  if(val) { 

                    for(var i in val) {
                      txt += val[i]["@value"] ; //_this.labelToString([ val[i] ], labelArray);
                    }

                    //if(labelArray[0] && labelArray[0]["@language"] === "bo") 
                    if(val[0] && val[0]["@language"] === "bo") 
                      css += "loaded-bo " ;

                    if(!txt.match(/[\n\r]/)) 
                      css += "unformated " ;                  

                    jQuery(imageElement).next('.etext-content').addClass(css).html("<div>"+txt+"</div>") ; 

                  } 
                  else { 
                    jQuery(imageElement).next('.etext-content').addClass(css).text('--'); 
                  }
                }
                catch(e){ 
                  console.error("ERROR fetching etext data",canvas,val); 
                  jQuery(imageElement).next('.etext-content').text("");
                }
              }) ;
          }
        }
      });
    },

    reloadImages: function(newThumbHeight, triggerShow, useThumbnailProperty) {
      var _this = this;
      this.thumbInfo.thumbsHeight = newThumbHeight;
      if(useThumbnailProperty == undefined) useThumbnailProperty = true ;

      jQuery.each(this.imagesList, function(index, image) {
        var aspectRatio = image.height/image.width,
        width = (_this.thumbInfo.thumbsHeight/aspectRatio),
        height = _this.thumbInfo.thumbsHeight,
        id = image['@id'];      

        //console.log("reload",image,width,height,image.width,image.height,_this.thumbInfo.thumbsHeight);

        width = image.width;
        height = image.height;

        var img = image.images ;       
        if(img && img.length && img[0]) {
          img = img[0] ;
          if(img.resource && img.resource.service ) {
            img = img.resource.service ;
            if(img.width && img.height) {
              width = img.width;
              height = width * aspectRatio;
            }
            else { 
              img = image.images[0].resource;
              if(width === img.width && height === img.height) { // Taisho manifest
                width = (_this.thumbInfo.thumbsHeight/aspectRatio);              
                height = width *  aspectRatio ;
              }
            }
          }        
        }
        var newThumbURL = $.getThumbnailForCanvas(image, width, useThumbnailProperty);        
        var imageElement = _this.element.find('img[data-image-id="'+id+'"]');
        imageElement.attr('data', newThumbURL).attr('height', image.height).attr('width', image.width).attr('src', '');
      });
      if (triggerShow) {
        this.show();
      }
    },

    template:  $.Handlebars.compile([
        '<div class="{{thumbnailCls}}">',
        '<ul class="{{listingCssCls}}" role="list" aria-label="Thumbnails">',
        '{{#thumbs}}',
        '<li class="{{highlight}}" role="listitem" aria-label="Thumbnail">',
        '<img class="thumbnail-image {{highlight}}" title="{{title}}" data-image-id="{{id}}" src="" data="{{thumbUrl}}" width="{{width}}" style="min-height:{{height}}px;">',
        '<div class="thumb-label">{{title}}</div>',
        '</li>',
        '{{/thumbs}}',
        '</ul>',
        '</div>'
    ].join('')),

    hide: function() {
      var element = jQuery(this.element);
      if (this.panel) {
        element = element.parent();
      }
      element.hide({effect: "fade", duration: 300, easing: "easeOutCubic"});
    },

    show: function() {
      var element = jQuery(this.element);
      if (this.panel) {
        element = element.parent();
      }
      var _this = this;
      element.show({
        effect: "fade",
        duration: 300,
        easing: "easeInCubic",
        complete: function() {
          // Under firefox $.show() used under display:none iframe does not change the display.
          // This is workaround for https://github.com/IIIF/mirador/issues/929
          jQuery(this).css('display', 'block');
          _this.loadImages();
        }
      });
    },

    adjustWidth: function(className, hasClass) {
      var _this = this;
      if (hasClass) {
        _this.eventEmitter.publish('REMOVE_CLASS.'+this.windowId, className);
      } else {
        _this.eventEmitter.publish('ADD_CLASS.'+this.windowId, className);
      }
    },

    adjustHeight: function(className, hasClass) {
      if (hasClass) {
        this.element.removeClass(className);
      } else {
        this.element.addClass(className);
      }
    }

  };



}(Mirador));
