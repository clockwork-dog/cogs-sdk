// Check an iOS-only property (See https://developer.mozilla.org/en-US/docs/Web/API/Navigator#non-standard_properties)
export const IS_IOS = typeof navigator !== 'undefined' && typeof (navigator as { standalone?: boolean }).standalone !== 'undefined';

// https://evilmartians.com/chronicles/how-to-detect-safari-and-ios-versions-with-ease
// We use `globalThis` instead of `window` to allow the library to load in non-browser environments (e.g. Node.js)
export const IS_WEBKIT = 'GestureEvent' in globalThis;
