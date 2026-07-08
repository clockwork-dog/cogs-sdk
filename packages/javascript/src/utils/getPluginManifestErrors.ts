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
import semver from 'semver';
import { NetworkHostPattern } from './NetworkHostPattern';

const uniqueStringArraySchema = z.array(z.string().min(1)).refine((items) => new Set(items).size === items.length, {
  message: 'Array items must be unique',
});

/** Returns a schema either allowing object to have on not have extra keys */
function createManifestSchema(objectSchemaFactory: typeof z.strictObject | typeof z.object) {
  // This function should always use `objectSchemaFactory` to create objects instead of `z.object` or `z.strictObject`

  const cogsValueTypeStringSchema: z.ZodType<CogsValueTypeString> = objectSchemaFactory({
    type: z.literal('string'),
  });

  const cogsValueTypeNumberSchema: z.ZodType<CogsValueTypeNumber> = objectSchemaFactory({
    type: z.literal('number'),
    integer: z.literal(true).optional(),
    min: z.number().optional(),
    max: z.number().optional(),
  });

  const cogsValueTypeBooleanSchema: z.ZodType<CogsValueTypeBoolean> = objectSchemaFactory({
    type: z.literal('boolean'),
  });

  const cogsValueTypeOptionSchema: z.ZodType<CogsValueTypeOption<string[]>> = objectSchemaFactory({
    type: z.literal('option'),
    options: uniqueStringArraySchema,
  });

  const pluginCogsValueTypeJsonSchema: z.ZodType<CogsValueType> = z.union([
    cogsValueTypeStringSchema,
    cogsValueTypeNumberSchema,
    cogsValueTypeBooleanSchema,
    cogsValueTypeOptionSchema,
  ]);

  const cogsValueTypeStringWithDefaultSchema = (options: { defaultRequired: boolean }): z.ZodType<CogsValueTypeStringWithDefault> =>
    (options.defaultRequired
      ? objectSchemaFactory({ type: z.literal('string'), default: z.string() })
      : objectSchemaFactory({ type: z.literal('string'), default: z.string().optional() })) as z.ZodType<CogsValueTypeStringWithDefault>;

  const cogsValueTypeNumberWithDefaultSchema = (options: { defaultRequired: boolean }): z.ZodType<CogsValueTypeNumberWithDefault> =>
    (options.defaultRequired
      ? objectSchemaFactory({
          type: z.literal('number'),
          integer: z.boolean().optional(),
          min: z.number().optional(),
          max: z.number().optional(),
          default: z.number(),
        })
      : objectSchemaFactory({
          type: z.literal('number'),
          integer: z.boolean().optional(),
          min: z.number().optional(),
          max: z.number().optional(),
          default: z.number().optional(),
        })) as z.ZodType<CogsValueTypeNumberWithDefault>;

  const cogsValueTypeBooleanWithDefaultSchema = (options: { defaultRequired: boolean }): z.ZodType<CogsValueTypeBooleanWithDefault> =>
    (options.defaultRequired
      ? objectSchemaFactory({ type: z.literal('boolean'), default: z.boolean() })
      : objectSchemaFactory({ type: z.literal('boolean'), default: z.boolean().optional() })) as z.ZodType<CogsValueTypeBooleanWithDefault>;

  const cogsValueTypeOptionWithDefaultSchema = (options: { defaultRequired: boolean }): z.ZodType<CogsValueTypeOptionWithDefault> =>
    (options.defaultRequired
      ? objectSchemaFactory({
          type: z.literal('option'),
          options: uniqueStringArraySchema.optional(),
          default: z.string().min(1),
        })
      : objectSchemaFactory({
          type: z.literal('option'),
          options: uniqueStringArraySchema.optional(),
          default: z.string().min(1).optional(),
        })) as z.ZodType<CogsValueTypeOptionWithDefault>;

  const pluginCogsValueTypeWithDefaultJsonSchema = (options: { defaultRequired: boolean }): z.ZodType<CogsValueTypeWithDefault> =>
    z.union([
      cogsValueTypeStringWithDefaultSchema(options),
      cogsValueTypeNumberWithDefaultSchema(options),
      cogsValueTypeBooleanWithDefaultSchema(options),
      cogsValueTypeOptionWithDefaultSchema(options),
    ]);

  const pluginManifestConfigJsonSchema: z.ZodType<PluginManifestConfigJson> = objectSchemaFactory({
    name: z.string().min(1),
    value: pluginCogsValueTypeWithDefaultJsonSchema({ defaultRequired: false }),
  });

  const pluginManifestEventJsonSchema: z.ZodType<PluginManifestEventJson> = objectSchemaFactory({
    name: z.string().min(1),
    value: pluginCogsValueTypeJsonSchema.optional(),
  });

  const pluginManifestStateJsonSchema: z.ZodType<PluginManifestStateJson> = objectSchemaFactory({
    name: z.string().min(1),
    value: pluginCogsValueTypeWithDefaultJsonSchema({ defaultRequired: true }),
    writableFromCogs: z.literal(true).optional(),
    writableFromClient: z.literal(true).optional(),
  });

  const validateNetworkHostPattern = (pattern: string): boolean => {
    try {
      new NetworkHostPattern(pattern);
      return true;
    } catch {
      return false;
    }
  };

  const manifestSchema: z.ZodType<CogsPluginManifestJson> = objectSchemaFactory({
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
            objectSchemaFactory({
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
                objectSchemaFactory({
                  hosts: z.array(z.string().refine(validateNetworkHostPattern, { error: 'Invalid network host pattern' })).min(1),
                  caCertificate: z.string().optional(),
                }),
              )
              .optional(),
          })
          .optional(),
      })
      .optional(),
  })
    // Check that network access rules are only present if minCogsVersion is at least 5.11.0
    .refine(
      (manifest) => {
        if (!manifest.permissions?.network?.access) {
          return true;
        }
        if (manifest.minCogsVersion && semver.gte(manifest.minCogsVersion, '5.11.0')) {
          return true;
        }
        return false;
      },
      {
        path: ['permissions', 'network', 'access'],
        message: 'minCogsVersion must be at least 5.11.0',
      },
    );

  return manifestSchema;
}

const cogsPluginManifestJsonSchema = createManifestSchema(z.object);
const cogsPluginManifestJsonStrictSchema = createManifestSchema(z.strictObject);

export function getPluginManifestErrors(manifest: CogsPluginManifestJson): string[] | null {
  let validate: z.ZodType<CogsPluginManifestJson> = cogsPluginManifestJsonSchema;

  // minCogsVersion 5.11.0 requires strict schema
  // i.e. no unexpected keys
  if (
    typeof manifest === 'object' &&
    manifest.minCogsVersion &&
    semver.valid(manifest.minCogsVersion) &&
    semver.gte(manifest.minCogsVersion, '5.11.0')
  ) {
    validate = cogsPluginManifestJsonStrictSchema;
  }

  const result = validate.safeParse(manifest);
  if (result.success) return null;

  return result.error.issues.map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`);
}
