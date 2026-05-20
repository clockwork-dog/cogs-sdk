// Adapted from https://stackoverflow.com/a/58325977/244640

const OriginalDateConstructor = globalThis.Date;

/**
 * Patch `Date.now()` and `new Date()` given the current time is @param now
 *
 * It is critical that we keep a delta between the given time and `performance.now()`.
 * Date.now() isn't continuous, and can change at runtime
 * however performance.now() IS continuous
 */
export function setDate(now: number) {
  const nowDelta = now - performance.now();

  function Date(...args: [string | number | Date] | []) {
    if (args.length === 0) {
      return new OriginalDateConstructor(Date.now()); // Date.now() is implemented below
    }

    // Specific date constructor
    return new OriginalDateConstructor(...args);
  }

  // copy all properties from the original date, this includes the prototype
  const propertyDescriptors = Object.getOwnPropertyDescriptors(OriginalDateConstructor);
  Object.defineProperties(Date, propertyDescriptors);

  // override Date.now to return the adjusted time
  Date.now = function () {
    return Math.round(performance.now() + nowDelta);
  };

  (globalThis as { Date: unknown }).Date = Date;
}
