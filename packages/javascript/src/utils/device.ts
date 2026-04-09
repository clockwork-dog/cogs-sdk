// Check an iOS-only property (See https://developer.mozilla.org/en-US/docs/Web/API/Navigator#non-standard_properties)
export const IS_IOS = typeof navigator !== 'undefined' && typeof (navigator as { standalone?: boolean }).standalone !== 'undefined';
