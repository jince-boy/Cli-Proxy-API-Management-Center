import { describe, expect, test } from 'bun:test';
import {
  buildAuthFileFieldsPatch,
  type PrefixProxyEditorState,
} from '../src/features/authFiles/hooks/useAuthFilesPrefixProxyEditor';
import { readAuthFileDisableCooling } from '../src/features/authFiles/constants';

const makeEditor = (json: Record<string, unknown>, weight: string): PrefixProxyEditorState => ({
  fileName: 'credential.json',
  fileInfoText: '',
  loading: false,
  saving: false,
  error: null,
  originalText: JSON.stringify(json),
  rawText: JSON.stringify(json),
  invalidContentPreview: '',
  json,
  providerKey: 'codex',
  prefix: '',
  proxyUrl: '',
  priority: '',
  weight,
  weightError: null,
  rpm: '',
  rpmError: null,
  disableCooling: false,
  disableCoolingTouched: false,
  websockets: false,
  websocketsTouched: false,
  usingApi: false,
  usingApiTouched: false,
  note: '',
  noteTouched: false,
  excludedModelsText: '',
  excludedModelsTouched: false,
  headersText: '',
  headersTouched: false,
  headersError: null,
});

const resolveError = (key: string) => key;

describe('auth-file credential weight patch', () => {
  test('writes numeric weight and uses null to restore the default', () => {
    expect(buildAuthFileFieldsPatch(makeEditor({}, '0'), resolveError)).toEqual({ weight: 0 });
    expect(buildAuthFileFieldsPatch(makeEditor({ weight: 5 }, ''), resolveError)).toEqual({
      weight: null,
    });
  });

  test('recognizes a numeric string in an existing auth file', () => {
    expect(buildAuthFileFieldsPatch(makeEditor({ weight: '7' }, '7'), resolveError)).toEqual({});
    expect(buildAuthFileFieldsPatch(makeEditor({ weight: '7' }, ''), resolveError)).toEqual({
      weight: null,
    });
  });

  test('rejects invalid and oversized values before PATCH', () => {
    expect(() => buildAuthFileFieldsPatch(makeEditor({}, '1.5'), resolveError)).toThrow(
      'auth_files.weight_invalid_integer'
    );
    expect(() => buildAuthFileFieldsPatch(makeEditor({}, '1000001'), resolveError)).toThrow(
      'auth_files.weight_invalid_max'
    );
  });
});

describe('Codex auth-file RPM patch', () => {
  test('writes numeric RPM and uses null to remove the limit', () => {
    expect(buildAuthFileFieldsPatch({ ...makeEditor({}, ''), rpm: '60' }, resolveError)).toEqual({
      rpm: 60,
    });
    expect(
      buildAuthFileFieldsPatch({ ...makeEditor({ rpm: 60 }, ''), rpm: '' }, resolveError)
    ).toEqual({ rpm: null });
    expect(
      buildAuthFileFieldsPatch({ ...makeEditor({ rpm: '60' }, ''), rpm: '60' }, resolveError)
    ).toEqual({});
  });

  test('accepts zero as unlimited and rejects invalid values', () => {
    expect(buildAuthFileFieldsPatch({ ...makeEditor({}, ''), rpm: '0' }, resolveError)).toEqual({
      rpm: 0,
    });
    expect(() =>
      buildAuthFileFieldsPatch({ ...makeEditor({}, ''), rpm: '-1' }, resolveError)
    ).toThrow('auth_files.rpm_invalid_integer');
    expect(() =>
      buildAuthFileFieldsPatch({ ...makeEditor({}, ''), rpm: '1.5' }, resolveError)
    ).toThrow('auth_files.rpm_invalid_integer');
    expect(() =>
      buildAuthFileFieldsPatch({ ...makeEditor({}, ''), rpm: '1000001' }, resolveError)
    ).toThrow('auth_files.rpm_invalid_max');
  });

  test('does not send RPM for a non-Codex credential', () => {
    expect(
      buildAuthFileFieldsPatch(
        { ...makeEditor({}, ''), providerKey: 'claude', rpm: '60' },
        resolveError
      )
    ).toEqual({});
  });
});

describe('auth-file disable cooling patch', () => {
  test('reads canonical and legacy boolean-compatible metadata', () => {
    expect(readAuthFileDisableCooling({ disable_cooling: 'true' })).toBe(true);
    expect(readAuthFileDisableCooling({ 'disable-cooling': 1 })).toBe(true);
    expect(
      readAuthFileDisableCooling({ disable_cooling: 'invalid', 'disable-cooling': true })
    ).toBe(true);
    expect(readAuthFileDisableCooling({ disable_cooling: false, 'disable-cooling': true })).toBe(
      false
    );
  });

  test('writes the canonical field when enabling the per-credential override', () => {
    const editor = {
      ...makeEditor({}, ''),
      disableCooling: true,
      disableCoolingTouched: true,
    };

    expect(buildAuthFileFieldsPatch(editor, resolveError)).toEqual({ disable_cooling: true });
  });

  test('preserves the legacy field name and writes false when disabling it', () => {
    const editor = {
      ...makeEditor({ 'disable-cooling': true }, ''),
      disableCooling: false,
      disableCoolingTouched: true,
    };

    expect(buildAuthFileFieldsPatch(editor, resolveError)).toEqual({ 'disable-cooling': false });
  });

  test('does not patch an untouched or unchanged override', () => {
    expect(
      buildAuthFileFieldsPatch(makeEditor({ disable_cooling: true }, ''), resolveError)
    ).toEqual({});
    expect(
      buildAuthFileFieldsPatch(
        {
          ...makeEditor({ disable_cooling: 'true' }, ''),
          disableCooling: true,
          disableCoolingTouched: true,
        },
        resolveError
      )
    ).toEqual({});
  });
});

describe('auth-file excluded models patch', () => {
  test('writes normalized model patterns to the canonical field', () => {
    const editor = {
      ...makeEditor({}, ''),
      excludedModelsText: ' gpt-5-*\nGPT-5-*\nclaude-opus ',
      excludedModelsTouched: true,
    };

    expect(buildAuthFileFieldsPatch(editor, resolveError)).toEqual({
      excluded_models: ['gpt-5-*', 'claude-opus'],
    });
  });

  test('preserves the legacy hyphenated field name', () => {
    const editor = {
      ...makeEditor({ 'excluded-models': ['old-model'] }, ''),
      excludedModelsText: 'new-model',
      excludedModelsTouched: true,
    };

    expect(buildAuthFileFieldsPatch(editor, resolveError)).toEqual({
      'excluded-models': ['new-model'],
    });
  });

  test('clears exclusions with an empty array and ignores untouched values', () => {
    const original = { excluded_models: ['gpt-5-*'] };
    expect(buildAuthFileFieldsPatch(makeEditor(original, ''), resolveError)).toEqual({});
    expect(
      buildAuthFileFieldsPatch(
        {
          ...makeEditor(original, ''),
          excludedModelsText: '',
          excludedModelsTouched: true,
        },
        resolveError
      )
    ).toEqual({ excluded_models: [] });
  });
});
