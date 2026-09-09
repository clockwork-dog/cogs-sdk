/**
 * Debounces callback with leading immediate invocation.
 * In the case of constant calls, will allow one every @param {interval}
 */
export function leadingDebounce<Args extends unknown[]>(callback: (...args: Args) => void, interval: number): (...args: Args) => void {
  let delayedCall:
    | {
        args: Args | undefined;
        timeout: ReturnType<typeof setTimeout>;
      }
    | undefined = undefined;

  const onTimeout = () => {
    const args = delayedCall?.args;
    if (delayedCall && args) {
      delayedCall.args = undefined;
      callback(...args);
      delayedCall.timeout = setTimeout(onTimeout, interval);
    } else {
      delayedCall = undefined;
    }
  };

  return (...args: Args): void => {
    if (delayedCall !== undefined) {
      delayedCall.args = args;
      return;
    }

    callback(...args);
    delayedCall = { args: undefined, timeout: setTimeout(onTimeout, interval) };
  };
}
