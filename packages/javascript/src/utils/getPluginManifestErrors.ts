import {
  CogsPluginManifestJson,
  CogsValueType,
  CogsValueTypeBoolean,
  CogsValueTypeBooleanWithDefault,
  CogsValueTypeNumber,
  CogsValueTypeNumberWithDefault,
  CogsValueTypeOption,
  CogsValueTypeOptionWithDefault,
  CogsValueTypeString,
  CogsValueTypeStringWithDefault,
  CogsValueTypeWithDefault,
  PluginManifestConfigJson,
  PluginManifestEventJson,
  PluginManifestStateJson,
} from '../types/CogsPluginManifest';
import { z } from 'zod/v4';

const uniqueStringArray = z.array(z.string().min(1)).refine((items) => new Set(items).size === items.length, {
  message: 'Array items must be unique',
});

const cogsValueTypeStringSchema: z.ZodType<CogsValueTypeString> = z.strictObject({
  type: z.literal('string'),
});

const cogsValueTypeNumberSchema: z.ZodType<CogsValueTypeNumber> = z.strictObject({
  type: z.literal('number'),
  integer: z.literal(true).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
});

const cogsValueTypeBooleanSchema: z.ZodType<CogsValueTypeBoolean> = z.strictObject({
  type: z.literal('boolean'),
});

const cogsValueTypeOptionSchema: z.ZodType<CogsValueTypeOption<string[]>> = z.strictObject({
  type: z.literal('option'),
  options: uniqueStringArray,
});

const pluginCogsValueTypeJsonSchema: z.ZodType<CogsValueType> = z.union([
  cogsValueTypeStringSchema,
  cogsValueTypeNumberSchema,
  cogsValueTypeBooleanSchema,
  cogsValueTypeOptionSchema,
]);

const cogsValueTypeStringWithDefaultSchema = (options: { defaultRequired: boolean }): z.ZodType<CogsValueTypeStringWithDefault> =>
  (options.defaultRequired
    ? z.strictObject({ type: z.literal('string'), default: z.string() })
    : z.strictObject({ type: z.literal('string'), default: z.string().optional() })) as z.ZodType<CogsValueTypeStringWithDefault>;

const cogsValueTypeNumberWithDefaultSchema = (options: { defaultRequired: boolean }): z.ZodType<CogsValueTypeNumberWithDefault> =>
  (options.defaultRequired
    ? z.strictObject({
        type: z.literal('number'),
        integer: z.boolean().nullable().optional(),
        min: z.number().nullable().optional(),
        max: z.number().nullable().optional(),
        default: z.number(),
      })
    : z.strictObject({
        type: z.literal('number'),
        integer: z.boolean().nullable().optional(),
        min: z.number().nullable().optional(),
        max: z.number().nullable().optional(),
        default: z.number().optional(),
      })) as z.ZodType<CogsValueTypeNumberWithDefault>;

const cogsValueTypeBooleanWithDefaultSchema = (options: { defaultRequired: boolean }): z.ZodType<CogsValueTypeBooleanWithDefault> =>
  (options.defaultRequired
    ? z.strictObject({ type: z.literal('boolean'), default: z.boolean() })
    : z.strictObject({ type: z.literal('boolean'), default: z.boolean().optional() })) as z.ZodType<CogsValueTypeBooleanWithDefault>;

export const cogsValueTypeOptionWithDefaultSchema = (options: { defaultRequired: boolean }): z.ZodType<CogsValueTypeOptionWithDefault> =>
  (options.defaultRequired
    ? z.strictObject({
        type: z.literal('option'),
        options: uniqueStringArray.optional(),
        default: z.string().min(1),
      })
    : z.strictObject({
        type: z.literal('option'),
        options: uniqueStringArray.optional(),
        default: z.string().min(1).optional(),
      })) as z.ZodType<CogsValueTypeOptionWithDefault>;

const pluginCogsValueTypeWithDefaultJsonSchema = (options: { defaultRequired: boolean }): z.ZodType<CogsValueTypeWithDefault> =>
  z.union([
    cogsValueTypeStringWithDefaultSchema(options),
    cogsValueTypeNumberWithDefaultSchema(options),
    cogsValueTypeBooleanWithDefaultSchema(options),
    cogsValueTypeOptionWithDefaultSchema(options),
  ]);

const pluginManifestConfigJsonSchema: z.ZodType<PluginManifestConfigJson> = z.strictObject({
  name: z.string().min(1),
  value: pluginCogsValueTypeWithDefaultJsonSchema({ defaultRequired: false }),
});

const pluginManifestEventJsonSchema: z.ZodType<PluginManifestEventJson> = z.strictObject({
  name: z.string().min(1),
  value: pluginCogsValueTypeJsonSchema.optional(),
});

const pluginManifestStateJsonSchema: z.ZodType<PluginManifestStateJson> = z.strictObject({
  name: z.string().min(1),
  value: pluginCogsValueTypeWithDefaultJsonSchema({ defaultRequired: true }),
  writableFromCogs: z.literal(true).optional(),
  writableFromClient: z.literal(true).optional(),
});

const cogsPluginManifestJsonSchema: z.ZodType<CogsPluginManifestJson> = z.strictObject({
  version: z.union([
    z.templateLiteral([z.uint32()]),
    z.templateLiteral([z.uint32(), z.literal('.'), z.uint32()]),
    z.templateLiteral([z.uint32(), z.literal('.'), z.uint32(), z.literal('.'), z.uint32()]),
  ]),
  name: z.string(),
  minCogsVersion: z.templateLiteral([z.uint32(), z.literal('.'), z.uint32(), z.literal('.'), z.uint32()]).optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  indexPath: z.string().optional(),
  window: z
    .object({
      width: z.number().gt(0).int(),
      height: z.number().gt(0).int(),
      visible: z.boolean().optional(),
    })
    .optional(),
  config: z.array(pluginManifestConfigJsonSchema).optional(),
  events: z
    .object({
      fromCogs: z.array(pluginManifestEventJsonSchema).optional(),
      toCogs: z.array(pluginManifestEventJsonSchema).optional(),
    })
    .optional(),
  state: z.array(pluginManifestStateJsonSchema).optional(),
  media: z
    .object({
      audio: z.literal(true).optional(),
      video: z.literal(true).optional(),
      images: z.literal(true).optional(),
    })
    .optional(),
  store: z
    .object({
      items: z
        .record(
          z.string(),
          z.strictObject({
            persistValue: z.boolean().optional(),
          }),
        )
        .optional(),
    })
    .optional(),
  permissions: z
    .strictObject({
      network: z
        .strictObject({
          access: z
            .array(
              z.strictObject({
                hosts: z.array(z.templateLiteral([z.string(), z.literal(':'), z.union([z.uint32(), z.literal('*')])])),
                caCertificate: z.string().optional(),
              }),
            )
            .optional(),
        })
        .optional(),
    })
    .optional(),
});

const validate = cogsPluginManifestJsonSchema;

export function getPluginManifestErrors(manifest: CogsPluginManifestJson): string[] | null {
  const result = validate.safeParse(manifest);
  if (result.success) return null;

  return result.error.issues.map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`);
}
