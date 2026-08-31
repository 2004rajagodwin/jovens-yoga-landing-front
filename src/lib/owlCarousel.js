// Owl Carousel is an old-style jQuery plugin that expects a global jQuery.
// setupJquery.js attaches jQuery to window first (as its own module, so it
// fully executes before this import graph continues), then owl.carousel
// registers itself onto that global jQuery's $.fn.
import $ from "./setupJquery.js";
import "owl.carousel";

export default $;
