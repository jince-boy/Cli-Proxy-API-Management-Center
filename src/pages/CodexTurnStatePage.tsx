import { useEffect, useState } from 'react';
import { codexTurnStateApi, type CodexTurnStateItem } from '@/services/api/codexTurnState';

export function CodexTurnStatePage() {
  const [items, setItems] = useState<CodexTurnStateItem[]>([]);
  const [model, setModel] = useState('gpt-5.6-terra');
  const [proxy, setProxy] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const load = async () => {
    const data = await codexTurnStateApi.list();
    setItems(data.items ?? []);
  };
  useEffect(() => {
    void load();
  }, []);

  const acquire = async (authId: string) => {
    if (!model.trim()) return;
    setBusy(authId);
    setMessage('');
    try {
      await codexTurnStateApi.acquire(authId, model.trim(), proxy.trim() || undefined);
      setMessage(`已主动获取 ${authId} / ${model.trim()}`);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '主动获取失败');
    } finally {
      setBusy(null);
    }
  };

  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <h1>按模型设置 X-Codex-Turn-State</h1>
      <p style={{ opacity: 0.75 }}>
        服务端会忽略下游传入的同名请求头，始终按 Codex 账号和模型使用服务端保存的值。
      </p>
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr', margin: '20px 0' }}>
        <label>
          上游模型
          <input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            style={{ display: 'block', width: '100%' }}
          />
        </label>
        <label>
          主动获取代理（可选）
          <input
            value={proxy}
            onChange={(e) => setProxy(e.target.value)}
            placeholder="http:// / https:// / socks5://"
            style={{ display: 'block', width: '100%' }}
          />
        </label>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={() => void load()} disabled={busy !== null}>
          重新加载
        </button>
      </div>
      {message && <p role="status">{message}</p>}
      <div style={{ display: 'grid', gap: 12 }}>
        {items.map((item) => {
          const state = item.states?.[model.trim()];
          return (
            <section
              key={item.auth_id}
              style={{ border: '1px solid #444', borderRadius: 8, padding: 16 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <strong>{item.label || item.name || item.auth_id}</strong>
                <button onClick={() => void acquire(item.auth_id)} disabled={busy !== null}>
                  主动获取
                </button>
              </div>
              <code style={{ display: 'block', marginTop: 10, wordBreak: 'break-all' }}>
                {state?.value || '尚未获取'}
              </code>
              {state?.expires_at && <small>有效期至：{state.expires_at}</small>}
            </section>
          );
        })}
      </div>
    </main>
  );
}
