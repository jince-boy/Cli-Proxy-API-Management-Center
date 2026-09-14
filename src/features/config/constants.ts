import type { ComponentType } from 'react';
import {
  IconCode,
  IconKey,
  IconNetwork,
  IconSatellite,
  IconScrollText,
  IconShield,
  IconSlidersHorizontal,
  IconTimer,
  type IconProps,
} from '@/components/ui/icons';
import type { VisualConfigFieldPath } from '@/types/visualConfig';
import type { VisualSectionId } from './searchIndex';

/** Configuration editing mode: visual form or YAML source. */
export type ConfigEditorMode = 'visual' | 'source';

/** Top tabs: common settings plus the seven canonical sections. */
export type ConfigTabId = 'common' | VisualSectionId;

export const CONFIG_SECTION_IDS = [
  'connectivity',
  'network',
  'logging',
  'quota',
  'streaming',
  'advanced',
  'payload',
] as const satisfies readonly VisualSectionId[];

export const CONFIG_TAB_IDS: readonly ConfigTabId[] = ['common', ...CONFIG_SECTION_IDS];

/** Section sequence numbers. The common tab is an alias view and has no number. */
export const SECTION_INDEX_LABELS: Record<VisualSectionId, string> = {
  connectivity: '01',
  network: '02',
  logging: '03',
  quota: '04',
  streaming: '05',
  advanced: '06',
  payload: '07',
};

export const CONFIG_TAB_ICONS: Record<ConfigTabId, ComponentType<IconProps>> = {
  common: IconSlidersHorizontal,
  connectivity: IconKey,
  network: IconNetwork,
  logging: IconScrollText,
  quota: IconTimer,
  streaming: IconSatellite,
  advanced: IconShield,
  payload: IconCode,
};

/** Fields rendered in the common tab and shared with canonical sections. */
export const COMMON_FIELD_IDS = [
  'host',
  'port',
  'apiKeys',
  'proxyUrl',
  'debug',
  'loggingToFile',
  'quotaSwitchProject',
  'quotaSwitchPreviewModel',
] as const;

/**
 * Validation field paths owned by each section for tab error badges.
 * Payload validation uses the hasPayloadValidationErrors flag instead.
 */
export const SECTION_VALIDATION_FIELDS: Record<VisualSectionId, readonly VisualConfigFieldPath[]> =
  {
    connectivity: ['port'],
    network: ['requestRetry', 'maxRetryCredentials', 'maxRetryInterval', 'authAutoRefreshWorkers'],
    logging: ['errorLogsMaxFiles', 'logsMaxTotalSizeMb', 'redisUsageQueueRetentionSeconds'],
    quota: [],
    streaming: [
      'streaming.keepaliveSeconds',
      'streaming.bootstrapRetries',
      'streaming.nonstreamKeepaliveInterval',
    ],
    advanced: [],
    payload: [],
  };

/**
 * Maps field IDs to useVisualConfig dirty keys and VisualConfigValues leaves.
 * tests/configFieldParity.test.ts enforces parity with the search index and section JSX.
 */
export const FIELD_VALUE_KEYS: Record<string, readonly string[]> = {
  // Connectivity
  host: ['host'],
  port: ['port'],
  authDir: ['authDir'],
  apiKeys: ['apiKeysText', 'apiKeyAuthBindings'],
  tlsEnable: ['tlsEnable'],
  tlsCert: ['tlsCert'],
  tlsKey: ['tlsKey'],
  rmAllowRemote: ['rmAllowRemote'],
  rmDisableControlPanel: ['rmDisableControlPanel'],
  rmDisableAutoUpdatePanel: ['rmDisableAutoUpdatePanel'],
  rmSecretKey: ['rmSecretKey'],
  rmPanelRepo: ['rmPanelRepo'],
  // Network
  proxyUrl: ['proxyUrl'],
  requestRetry: ['requestRetry'],
  maxRetryCredentials: ['maxRetryCredentials'],
  maxRetryInterval: ['maxRetryInterval'],
  authAutoRefreshWorkers: ['authAutoRefreshWorkers'],
  routingStrategy: ['routingStrategy'],
  disableImageGeneration: ['disableImageGeneration'],
  gptImage2BaseModel: ['gptImage2BaseModel'],
  routingSessionAffinityTTL: ['routingSessionAffinityTTL'],
  forceModelPrefix: ['forceModelPrefix'],
  passthroughHeaders: ['passthroughHeaders'],
  disableCooling: ['disableCooling'],
  routingSessionAffinity: ['routingSessionAffinity'],
  codexIdentityConfuse: ['codexIdentityConfuse'],
  wsAuth: ['wsAuth'],
  // Logging
  debug: ['debug'],
  commercialMode: ['commercialMode'],
  loggingToFile: ['loggingToFile'],
  logsMaxTotalSizeMb: ['logsMaxTotalSizeMb'],
  errorLogsMaxFiles: ['errorLogsMaxFiles'],
  redisUsageQueueRetentionSeconds: ['redisUsageQueueRetentionSeconds'],
  usageStatisticsEnabled: ['usageStatisticsEnabled'],
  // Quota
  quotaSwitchProject: ['quotaSwitchProject'],
  quotaSwitchPreviewModel: ['quotaSwitchPreviewModel'],
  quotaAntigravityCredits: ['quotaAntigravityCredits'],
  // Streaming
  streamingKeepaliveSeconds: ['streaming.keepaliveSeconds'],
  streamingBootstrapRetries: ['streaming.bootstrapRetries'],
  streamingNonstreamKeepalive: ['streaming.nonstreamKeepaliveInterval'],
  // Advanced
  pluginsEnabled: ['pluginsEnabled'],
  pluginStoreSources: ['pluginStoreSources'],
  pluginStoreAuth: ['pluginStoreAuth'],
  antigravitySensitiveWords: ['antigravitySensitiveWords'],
  devinSensitiveWords: ['devinSensitiveWords'],
  antigravitySignatureCacheEnabled: ['antigravitySignatureCacheEnabled'],
  antigravitySignatureBypassStrict: ['antigravitySignatureBypassStrict'],
  claudeHeaderUserAgent: ['claudeHeaderUserAgent'],
  claudeHeaderPackageVersion: ['claudeHeaderPackageVersion'],
  claudeHeaderRuntimeVersion: ['claudeHeaderRuntimeVersion'],
  claudeHeaderOs: ['claudeHeaderOs'],
  claudeHeaderArch: ['claudeHeaderArch'],
  claudeHeaderTimeout: ['claudeHeaderTimeout'],
  claudeHeaderStabilizeDeviceProfile: ['claudeHeaderStabilizeDeviceProfile'],
  codexHeaderUserAgent: ['codexHeaderUserAgent'],
  codexHeaderBetaFeatures: ['codexHeaderBetaFeatures'],
  // Payload
  payloadDefaultRules: ['payloadDefaultRules'],
  payloadDefaultRawRules: ['payloadDefaultRawRules'],
  payloadOverrideRules: ['payloadOverrideRules'],
  payloadOverrideRawRules: ['payloadOverrideRawRules'],
  payloadFilterRules: ['payloadFilterRules'],
};

/** Shared DOM IDs used to connect tabs and panels through ARIA attributes. */
export const configTabDomId = (id: ConfigTabId) => `config-tab-${id}`;
export const configPanelDomId = (id: ConfigTabId) => `config-panel-${id}`;

/** localStorage keys for the selected editing mode and section. */
export const CONFIG_MODE_STORAGE_KEY = 'config-management:tab';
export const CONFIG_SECTION_STORAGE_KEY = 'config-management:section';
/** Legacy simple/full mode key removed during initialization. */
export const LEGACY_EDITOR_MODE_STORAGE_KEY = 'config-management:editor-mode';
