import { describe, expect, test } from 'bun:test';
import { createElement, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parse as parseYaml } from 'yaml';
import { useVisualConfig } from '../src/hooks/useVisualConfig';

describe('visual config Codex account identity isolation', () => {
  test('loads and writes the routing and Codex isolation settings', () => {
    function Harness() {
      const visualConfig = useVisualConfig();
      const [phase, setPhase] = useState(0);

      if (phase === 0) {
        const loaded = visualConfig.loadVisualValuesFromYaml(
          'routing:\n  session-affinity: true\n  session-affinity-ttl: 24h\ncodex:\n  identity-confuse: true\n'
        );
        if (!loaded.ok) throw new Error(loaded.error);
        visualConfig.setVisualValues({
          routingSessionAffinity: false,
          routingSessionAffinityTTL: '12h',
          codexIdentityConfuse: false,
        });
        setPhase(1);
      } else {
        return createElement(
          'pre',
          null,
          visualConfig.applyVisualChangesToYaml(
            'routing:\n  session-affinity: true\n  session-affinity-ttl: 24h\ncodex:\n  identity-confuse: true\n'
          )
        );
      }

      return null;
    }

    const markup = renderToStaticMarkup(createElement(Harness));
    const result = markup.slice('<pre>'.length, -'</pre>'.length);

    expect(parseYaml(result)).toEqual({
      routing: {
        'session-affinity': false,
        'session-affinity-ttl': '12h',
      },
      codex: {
        'identity-confuse': false,
      },
    });
  });
});
