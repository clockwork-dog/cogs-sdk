import { z } from 'zod';

export type TemporalProperties = z.infer<typeof TemporalProperties>;
const TemporalProperties = z.object({
  t: z.number().gte(0),
  rate: z.number().gte(0),
});
export type VisualProperties = z.infer<typeof VisualProperties>;
const VisualProperties = z.object({
  opacity: z.number().gte(0).lte(1),
});
export type AudialProperties = z.infer<typeof AudialProperties>;
const AudialProperties = z.object({
  volume: z.number().gte(0).lte(1),
});

export type ImageMetadata = z.infer<typeof ImageMetadata>;
const ImageMetadata = z.object({
  type: z.literal('image'),
  file: z.string(),
  fit: z.union([z.literal('contain'), z.literal('cover'), z.literal('none')]),
});
export type AudioMetadata = z.infer<typeof AudioMetadata>;
const AudioMetadata = z.object({
  type: z.literal('audio'),
  file: z.string(),
  audioOutput: z.string(),
});
export type VideoMetadata = z.infer<typeof VideoMetadata>;
const VideoMetadata = z.object({
  type: z.literal('video'),
  file: z.string(),
  audioOutput: z.string(),
  fit: z.union([z.literal('contain'), z.literal('cover'), z.literal('none')]),
});
export type NullKeyframe = z.infer<typeof NullKeyframe>;
const NullKeyframe = z.tuple([z.number(), z.null()]);

/**
 * Keyframes are indexed by a timestamp given in ms
 */
export type InitialImageKeyframe = z.infer<typeof InitialImageKeyframe>;
const InitialImageKeyframe = z.tuple([
  z.number(),
  z
    .object({
      set: z
        .object({
          ...VisualProperties.shape,
        })
        .partial(),
    })
    .partial(),
]);

/**
 * Keyframes are indexed by a timestamp given in ms
 */
export type ImageKeyframe = z.infer<typeof ImageKeyframe>;
const ImageKeyframe = z.tuple([
  z.number(),
  z
    .object({
      set: z
        .object({
          ...VisualProperties.shape,
        })
        .partial(),
      lerp: z
        .object({
          ...VisualProperties.shape,
        })
        .partial(),
    })
    .partial(),
]);

/**
 * Keyframes are indexed by a timestamp given in ms
 */
export type InitialAudioKeyframe = z.infer<typeof InitialAudioKeyframe>;
const InitialAudioKeyframe = z.tuple([
  z.number(),
  z
    .object({
      set: z
        .object({
          ...TemporalProperties.shape,
          ...AudialProperties.shape,
        })
        .partial(),
    })
    .partial(),
]);

/**
 * Keyframes are indexed by a timestamp given in ms
 */
export type AudioKeyframe = z.infer<typeof AudioKeyframe>;
const AudioKeyframe = z.tuple([
  z.number(),
  z
    .object({
      set: z
        .object({
          ...TemporalProperties.shape,
          ...AudialProperties.shape,
        })
        .partial(),
      lerp: z
        .object({
          ...AudialProperties.shape,
        })
        .partial(),
    })
    .partial(),
]);

/**
 * Keyframes are indexed by a timestamp given in ms
 */
export type InitialVideoKeyframe = z.infer<typeof InitialVideoKeyframe>;
const InitialVideoKeyframe = z.tuple([
  z.number(),
  z
    .object({
      set: z
        .object({
          ...TemporalProperties.shape,
          ...AudialProperties.shape,
          ...VisualProperties.shape,
        })
        .partial(),
    })
    .partial(),
]);

/**
 * Keyframes are indexed by a timestamp given in ms
 */
export type VideoKeyframe = z.infer<typeof VideoKeyframe>;
const VideoKeyframe = z.tuple([
  z.number(),
  z
    .object({
      set: z
        .object({
          ...TemporalProperties.shape,
          ...AudialProperties.shape,
          ...VisualProperties.shape,
        })
        .partial(),
      lerp: z
        .object({
          ...AudialProperties.shape,
          ...VisualProperties.shape,
        })
        .partial(),
    })
    .partial(),
]);

const ImageClip = z.object({
  ...ImageMetadata.shape,
  keyframes: z.tuple([ImageKeyframe], z.union([InitialImageKeyframe, NullKeyframe])),
});

const AudioClip = z.object({
  ...AudioMetadata.shape,
  keyframes: z.tuple([AudioKeyframe], z.union([InitialAudioKeyframe, NullKeyframe])),
});

const VideoClip = z.object({
  ...VideoMetadata.shape,
  keyframes: z.tuple([VideoKeyframe], z.union([InitialVideoKeyframe, NullKeyframe])),
});

export const MediaSurfaceStateSchema = z.record(z.string(), z.union([ImageClip, AudioClip, VideoClip]));

export type ImageOptions = VisualProperties;
export type AudioOptions = TemporalProperties & AudialProperties;
export type VideoOptions = TemporalProperties & VisualProperties & AudialProperties;

export type ImageState = {
  type: 'image';
  file: string;
  fit: 'cover' | 'contain' | 'none';
  keyframes: [InitialImageKeyframe, ...Array<ImageKeyframe | NullKeyframe>];
};
export type AudioState = {
  type: 'audio';
  file: string;
  audioOutput: string;
  keyframes: [InitialAudioKeyframe, ...Array<AudioKeyframe | NullKeyframe>];
};
export type VideoState = {
  type: 'video';
  file: string;
  fit: 'cover' | 'contain' | 'none';
  audioOutput: string;
  keyframes: [InitialVideoKeyframe, ...Array<VideoKeyframe | NullKeyframe>];
};

export type MediaClipState = ImageState | AudioState | VideoState;
export type MediaSurfaceState = Record<string, MediaClipState>;

// Assert helper types are correct
export type UnionsEqual<A, B> = Exclude<A, B> extends never ? (Exclude<B, A> extends never ? true : false) : false;
true satisfies UnionsEqual<ImageState, z.infer<typeof ImageClip>>;
true satisfies UnionsEqual<AudioState, z.infer<typeof AudioClip>>;
true satisfies UnionsEqual<VideoState, z.infer<typeof VideoClip>>;
true satisfies UnionsEqual<MediaSurfaceState, z.infer<typeof MediaSurfaceStateSchema>>;

export const defaultImageOptions: ImageOptions = {
  opacity: 1,
};
export const defaultAudioOptions: AudioOptions = {
  t: 0,
  rate: 1,
  volume: 1,
};
export const defaultVideoOptions: VideoOptions = {
  t: 0,
  rate: 1,
  volume: 1,
  opacity: 1,
};
