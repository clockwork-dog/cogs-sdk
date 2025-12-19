import { defaultAudioOptions, defaultImageOptions, defaultVideoOptions, MediaClipState, TemporalProperties } from '../types/MediaSchema';

export function getStateAtTime<State extends MediaClipState>(state: State, time: number): State['keyframes'][0][1]['set'] | undefined {
  switch (state.type) {
    case 'image': {
      const firstTimestamp = state.keyframes[0][0];
      if (firstTimestamp > time) {
        return undefined;
      }

      const nonNullKeyframes = state.keyframes.filter((k) => k[1] !== null);
      const properties = getPropertiesAtTime(nonNullKeyframes, time);
      return { ...defaultImageOptions, ...properties };
    }

    case 'audio': {
      const nonNullKeyframes: [number, { set?: Partial<TemporalProperties> }][] = state.keyframes.filter((k) => k[1] !== null);
      const temporalProperties = getTemporalPropertiesAtTime(nonNullKeyframes, time);
      if (!temporalProperties) {
        return undefined;
      }
      const properties = getPropertiesAtTime(nonNullKeyframes, time);
      return { ...defaultAudioOptions, ...properties, ...temporalProperties };
    }

    case 'video': {
      const nonNullKeyframes: [number, { set?: Partial<TemporalProperties> }][] = state.keyframes.filter((k) => k[1] !== null);
      const temporalProperties = getTemporalPropertiesAtTime(nonNullKeyframes, time);
      if (!temporalProperties) {
        return undefined;
      }
      const properties = getPropertiesAtTime(nonNullKeyframes, time);
      return { ...defaultVideoOptions, ...properties, ...temporalProperties };
    }
  }
}

/**
 * Goes through all keyframes to lerp between many different properties
 * Note: This has no specific logic regarding types of properties
 *       Do not use this for setting time / rate.
 *       They behave differently in the schema. ( @see getTemporalPropertiesAtTime )
 *
 * @param keyframes keyframes from a given MediaClipState
 * @param time the time (on or between keyframes) to calculate
 * @returns a grouped object of all properties
 */
export function getPropertiesAtTime<P extends Record<string, unknown>>(
  keyframes: [number, { set?: Partial<P>; lerp?: Partial<P> }][],
  time: number,
): P {
  const propertyKeyframes = {} as Record<keyof P, { before?: [number, P[keyof P]]; after?: [number, P[keyof P]] }>;

  for (const [timestamp, properties] of keyframes) {
    if (timestamp <= time) {
      // If lerp and set are both present, we assume we lerp up until the timestamp,
      // then set to a new value
      Object.entries(properties.lerp ?? {}).forEach(([property, value]: [keyof P, P[keyof P]]) => {
        propertyKeyframes[property] ??= {};
        propertyKeyframes[property].before = [timestamp, value];
      });
      Object.entries(properties.set ?? {}).forEach(([property, value]: [keyof P, P[keyof P]]) => {
        propertyKeyframes[property] ??= {};
        propertyKeyframes[property].before = [timestamp, value];
      });
    } else {
      // We're trying to find the closest timestamp afterwards for lerping
      // So only set if not yet set
      Object.entries(properties.lerp ?? {}).forEach(([property, value]: [keyof P, P[keyof P]]) => {
        propertyKeyframes[property] ??= {};
        if (propertyKeyframes[property].after === undefined) {
          propertyKeyframes[property].after = [timestamp, value];
        }
      });
    }
  }

  const properties = {} as P;
  Object.entries(propertyKeyframes).forEach(
    ([property, { before, after }]: [keyof P, { before?: [number, P[keyof P]]; after?: [number, P[keyof P]] }]) => {
      // There is no lerping, and it has been set before
      // It's a constant!
      if (after === undefined && before) {
        properties[property] = before[1];
        return;
      }

      // Multiple timestamps on the same, we return after
      if (before && after && before[0] === after[0]) {
        properties[property] = after[1];
        return;
      }

      // Property has been set, and there's a lerp timestamp afterwards
      // We've got numbers, so lets try to linearly inerpolate
      if (before && typeof before[1] === 'number' && after && typeof after[1] === 'number') {
        properties[property] = (before[1] + ((time - before[0]) * (after[1] - before[1])) / (after[0] - before[0])) as P[keyof P];
        return;
      }
    },
  );
  return properties;
}

/**
 * Keep track of time whilst going through the keyframes at respective rate.
 * Temporal properties cannot be interpolated in the media schema.
 *
 * @param keyframes temporal keyframes from an AudioClipState or VideoClipState
 * @param time the time (on or between keyframes) to calculate
 * @returns the temporal properties of the media at the given time
 */
export function getTemporalPropertiesAtTime<P extends TemporalProperties>(
  keyframes: [number, { set?: Partial<P>; lerp?: Partial<P> }][],
  time: number,
): TemporalProperties | undefined {
  // Not defined if the media starts in the future
  const firstKeyframe = keyframes[0];
  if (!firstKeyframe || firstKeyframe[0] > time) {
    return undefined;
  }

  let timeAtLastKeyframe = 0;
  let { t: mediaTimeAtLastKeyframe, rate: mediaRateAtLastKeyframe } = defaultAudioOptions;

  for (const [timestamp, properties] of keyframes) {
    // Only calculate up to the keyframe on or before
    if (timestamp > time) break;

    const { set } = properties;
    if (!set) continue;
    const { t, rate } = set;

    // time is set - no calculations needed
    if (t !== undefined) {
      timeAtLastKeyframe = timestamp;
      mediaTimeAtLastKeyframe = t;
      if (rate !== undefined) {
        mediaRateAtLastKeyframe = rate;
      }
      continue;
    }

    // rate is set on it's own, calculate how much time has passed
    if (rate !== undefined) {
      const duration = timestamp - timeAtLastKeyframe;
      const mediaDuration = duration * mediaRateAtLastKeyframe;
      timeAtLastKeyframe = timestamp;
      mediaTimeAtLastKeyframe += mediaDuration;
      mediaRateAtLastKeyframe = rate;
    }
  }

  // Calculate time after last keyframe
  const finalDuration = time - timeAtLastKeyframe;
  const finalMediaDuration = finalDuration * mediaRateAtLastKeyframe;
  const finalMediaTime = mediaTimeAtLastKeyframe + finalMediaDuration;

  return {
    rate: mediaRateAtLastKeyframe,
    t: finalMediaTime,
  };
}
