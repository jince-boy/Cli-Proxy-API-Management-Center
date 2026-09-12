import { describe, expect, test } from 'bun:test';
import { createElement, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parse as parseYaml } from 'yaml';
import { useVisualConfig } from '../src/hooks/useVisualConfig';

describe('visual config API key account bindings', () => {
  test('loads and writes bindings while removing deleted API keys', () => {
    function Harness() {
      const visualConfig = useVisualConfig();
      const [phase, setPhase] = useState(0);

      if (phase === 0) {
        visualConfig.loadVisualValuesFromYaml(
          'api-keys:\n  - client-a\n  - client-b\napi-key-auth-bindings:\n  client-a:\n    - auth-a\n  client-b:\n    - auth-b\n'
        );
        setPhase(1);
      } else if (phase === 1) {
        visualConfig.setVisualValues({
          apiKeysText: 'client-a',
          apiKeyAuthBindings: { 'client-a': ['auth-a', 'auth-c'] },
        });
        setPhase(2);
      } else {
        return createElement(
          'pre',
          null,
          visualConfig.applyVisualChangesToYaml(
            'api-keys:\n  - client-a\n  - client-b\napi-key-auth-bindings:\n  client-a:\n    - auth-a\n  client-b:\n    - auth-b\n'
          )
        );
      }

      return null;
    }

    const markup = renderToStaticMarkup(createElement(Harness));
    const merged = markup.slice('<pre>'.length, -'</pre>'.length);

    expect(parseYaml(merged)).toEqual({
      'api-keys': ['client-a'],
      'api-key-auth-bindings': { 'client-a': ['auth-a', 'auth-c'] },
    });
  });
});
