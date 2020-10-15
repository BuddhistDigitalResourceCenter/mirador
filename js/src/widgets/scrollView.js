(function($) {

  $.ScrollView = function(options) {

    jQuery.extend(this, {
      currentImgIndex:      0,
      canvasID:              null,
      focusImages:          [],
      manifest:             null,
      element:              null,
      imagesList:           [],
      appendTo:             null,
      thumbInfo:            {thumbsHeight: 150, listingCssCls: 'listing-thumbs', thumbnailCls: 'thumbnail-view'},
      windowId:             null,
      panel:                false,
      vDirectionStatus: '',
      lazyLoadingFactor:    1.65  //should be >= 1
    }, options);

    jQuery.extend($.ScrollView.prototype, $.ThumbnailsView.prototype);

    $.ScrollView.prototype.originalLoadContent = $.ThumbnailsView.prototype.loadContent ;
    $.ScrollView.prototype.loadContent = function(useThumbnailProperty) {
        if(useThumbnailProperty == undefined) useThumbnailProperty = false ;
        return this.originalLoadContent(useThumbnailProperty,this) ;
    } ;

    $.ScrollView.prototype.originalReloadImages = $.ThumbnailsView.prototype.reloadImages ;
    $.ScrollView.prototype.reloadImages = function(newThumbHeight, triggerShow, useThumbnailProperty) {
        if(useThumbnailProperty == undefined) useThumbnailProperty = false ;
        return this.originalReloadImages(newThumbHeight, triggerShow, useThumbnailProperty ) ;
    } ;


    $.ScrollView.prototype.originalTemplate = $.ScrollView.prototype.template ;
    $.ScrollView.prototype.template = $.Handlebars.compile([      
      '<div class="{{thumbnailCls}}">',
      '<div class="provider"><div></div></div>',
      '<ul class="{{listingCssCls}}" role="list" aria-label="Thumbnails">',
      '{{#thumbs}}',
      '<li class="{{highlight}}" role="listitem" aria-label="Thumbnail">',
      '<img class="thumbnail-image {{highlight}}" title="{{title}}" data-image-id="{{id}}" src="" data="{{thumbUrl}}" data-max-height={{height}} data-ratio={{ratio}} height="{{../defaultHeight}}" width="{{width}}" style="max-width:{{width}}px;min-height:{{height}}px">',
      '<div class="etext-content" width="{{width}}" style="max-width:{{width}}px;height:auto;"></div>',
      '<div class="thumb-label" lang={{locale}}>{{title}}</div>',
      '</li>',
      '{{/thumbs}}',
      '</ul>',
      '</div>'
    ].join(''));


    $.ScrollView.prototype.originalToggle = $.ScrollView.prototype.toggle ;
    $.ScrollView.prototype.toggle = function(stateValue) {
      if (stateValue) {
        jQuery(".nav-bar-top #breadcrumbs .on").removeClass("on");
        jQuery(".nav-bar-top #breadcrumbs #vol span").text(this.labelToString(this.manifest.jsonLd.label)).parent().addClass("active on");
        /*
        if(!jQuery(".nav-bar-top #breadcrumbs #image").attr("data-page-view-id")) {
          jQuery(".nav-bar-top #breadcrumbs #image span").text(this.imagesList[0]["@id"].replace(/^.*?[/]([^/]+)([/]canvas)?$/,"$1"))
          .parent().addClass("active").attr("data-page-view-id",this.imagesList[0]["@id"]);
        }
        */
        this.show();

        if(!window.tmpScroll) {
          var ima = jQuery(".nav-bar-top #breadcrumbs #image");
          if(ima.attr("data-page-view-id")) setTimeout(function() { window.scrollToImage(ima.attr("data-page-view-id")); }, 1000);
        }

        /* TODO not working with setInterval (try with "Goto" from footer menu)
        var ima = jQuery(".nav-bar-top #breadcrumbs #image");
        if(ima.attr("data-page-view-id")) { 
          console.log("scroll?",ima.attr("data-page-view-id"));
          var timerScroll = setInterval(function() { 
            console.log(ima.attr("data-page-view-id"), jQuery("[data-image-id='"+ima.attr("data-page-view-id")+"']"));
            if(jQuery("[data-image-id='"+ima.attr("data-page-view-id")+"']").length) {
              window.scrollToImage(ima.attr("data-page-view-id")); 
              clearInterval(timerScroll);
            }
          }, 10);
          setTimeout(function(){ clearInterval(timerScroll);},1000);
        }
        */
      } else {
        this.hide();
      }
    };

    $.ScrollView.prototype.originalInitThumbs = $.ScrollView.prototype.initThumbs ;
    $.ScrollView.prototype.initThumbs = function( tplData, useThumbnailProperty) {
      var _this = this;
      
      tplData.thumbs = jQuery.map(this.imagesList, function(canvas, index) {

        if (canvas.width === 0) {
          return {};
        }
        
        var aspectRatio = canvas.height/canvas.width,
        width = (_this.thumbInfo.thumbsHeight/aspectRatio);
        if(width > canvas.width) width = canvas.width ;
        var height = width *  aspectRatio ;

        //console.log("content",canvas,width,height,canvas.width,canvas.height,tplData.defaultHeight);

        width = canvas.width ;
        height = canvas.height ;

        var img = canvas.images ;
        if(img && img.length && img[0]) {
          img = img[0] ;
          if(img.resource && img.resource.service ) {
            img = img.resource.service ;
            if(img.width && img.height) {
              width = img.width;
              height = width *aspectRatio;
            }            
            else { 
              img = canvas.images[0].resource;
              if(width === img.width && height === img.height) { // Taisho manifest
                width = (_this.thumbInfo.thumbsHeight/aspectRatio);              
                height = width *  aspectRatio ;
              }
            }
          }        
        }

        var thumbnailUrl = $.getThumbnailForCanvas(canvas, width, useThumbnailProperty);

        var clabel = canvas.label;
        if(!Array.isArray(clabel)) clabel = [ clabel ];
        var title = 
          clabel
          .filter(function(e){ return e && (!e["@language"] || e["@language"].startsWith(i18next.language)); })
          .map(function(e) { return _this.labelToString([e],null,true); })
          .join(i18next.t("_dash"));
        if(title === "p. ") title = "p. "+(Number(index)+1);        

        return {
          thumbUrl: thumbnailUrl,
          title:    title,
          id:       canvas['@id'],
          width:    width,
          height:   height,
          ratio:    width/height,
          locale:   i18next.language,
          highlight: _this.currentImgIndex === index ? 'highlight' : ''
        };
      });

      _this.element = jQuery(_this.template(tplData)).appendTo(_this.appendTo);

      //if(!_this.ps) _this.ps = new PerfectScrollbar(".scroll-view",{ minScrollbarLength:16, maxScrollbarLength:16 });

    };
    

    this.init();
    if(this.vDirectionStatus == 'rtl') {
      jQuery(this.appendTo).find('.scroll-view').addClass('v-direction-rtl');
    }

    console.log("provUrl",window.providerUrl,window.providerAttr,this.manifest);

    if(window.providerUrl) { jQuery(".scroll-view .provider div").append("<img src='"+(window.providerUrl["@id"]?window.providerUrl["@id"]:window.providerUrl)+"'/>") ; }
    else if(window.providerAttr) { jQuery(".scroll-view .provider div").prepend("<span>"+this.labelToString(window.providerAttr)+"</span>"); }

    
  };

}(Mirador));
