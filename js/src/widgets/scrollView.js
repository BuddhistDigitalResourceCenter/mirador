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

    this.init();
    if(this.vDirectionStatus == 'rtl') {
      jQuery(this.appendTo).find('.scroll-view').addClass('v-direction-rtl');
    }

    
  };

}(Mirador));
