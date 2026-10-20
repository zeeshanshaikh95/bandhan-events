/**
 * Legacy-browser compatibility shims — loaded first in main.tsx, before any
 * provider boots. Needed only by iOS 9.3.5 Safari (and older engines that miss
 * these APIs); on modern browsers both shims are feature-detected no-ops at
 * runtime and tree-shaken out of the modern bundle.
 */
import "whatwg-fetch";
import "abort-controller/polyfill";
