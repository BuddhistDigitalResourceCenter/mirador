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
      '<ul class="{{listingCssCls}}" role="list" aria-label="Thumbnails">',
      '{{#thumbs}}',
      '<li class="{{highlight}}" role="listitem" aria-label="Thumbnail">',
      '<img class="thumbnail-image {{highlight}}" title="{{title}}" data-image-id="{{id}}" src="" data="{{thumbUrl}}" data-max-height={{height}} data-ratio={{ratio}} height="{{../defaultHeight}}" width="{{width}}" style="max-width:{{width}}px;min-height:{{height}}px">',
      '<div class="etext-content" width="{{width}}" style="max-width:{{width}}px;height:auto;"></div>',
      '<div class="thumb-label">{{title}}</div>',
      '</li>',
      '{{/thumbs}}',
      '</ul>',
      '</div>'
    ].join(''));




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

        var title = $.JsonLd.getTextValue(canvas.label);
        if(title === "p. ") title = "p. "+(Number(index)+1);        

        return {
          thumbUrl: thumbnailUrl,
          title:    title,
          id:       canvas['@id'],
          width:    width,
          height:   height,
          ratio:    width/height,
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

    
  };

}(Mirador));
