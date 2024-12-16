import { CogsConnection } from '@clockworkdog/cogs-client';

export type ManifestFromConnection<Connection> = Connection extends CogsConnection<infer Manifest> ? Manifest : never;
