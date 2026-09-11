import { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { authFilesApi } from '@/services/api';
import { codexTurnStateApi, type CodexTurnStateItem } from '@/services/api/codexTurnState';
import type { AuthFileItem } from '@/types';
import styles from './CodexTurnStateModal.module.scss';

type Props = {
  file: AuthFileItem | null;
  open: boolean;
  disableControls: boolean;
  onClose: () => void;
};

const fileAuthID = (file: AuthFileItem) =>
  typeof file.id === 'string' && file.id.trim() ? file.id.trim() : file.name.trim();

export function CodexTurnStateModal({ file, open, disableControls, onClose }: Props) {
  const [models, setModels] = useState<string[]>([]);
  const [items, setItems] = useState<CodexTurnStateItem[]>([]);
  const [model, setModel] = useState('');
  const [proxy, setProxy] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!open || !file) return;
    let cancelled = false;
    setLoading(true);
    setMessage('');
    Promise.all([codexTurnStateApi.list(), authFilesApi.getModelsForAuthFile(file.name)])
      .then(([stateResponse, modelItems]) => {
        if (cancelled) return;
        setItems(stateResponse.items ?? []);
        const available = modelItems.map((item) => item.id).filter(Boolean);
        setModels(available);
        setModel((current) => current || available[0] || 'gpt-5.6-terra');
      })
      .catch((error) => {
        if (!cancelled) setMessage(error instanceof Error ? error.message : '加载失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [file, open]);

  const account = useMemo(() => {
    if (!file) return undefined;
    const id = fileAuthID(file);
    return items.find((item) => item.auth_id === id || item.name === file.name);
  }, [file, items]);
  const currentState = account?.states?.[model];

  const refresh = async () => {
    if (!file || !model.trim()) return;
    setRefreshing(true);
    setMessage('');
    try {
      await codexTurnStateApi.refresh(fileAuthID(file), model.trim(), proxy.trim() || undefined);
      const latest = await codexTurnStateApi.list();
      setItems(latest.items ?? []);
      setMessage('刷新成功；如果上游没有返回新值，说明原值仍然有效。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '刷新失败，旧值已保留');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      width={620}
      title={`设置 X-Codex-Turn-State${file ? ` · ${file.email || file.name}` : ''}`}
      footer={
        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose} disabled={refreshing}>
            关闭
          </Button>
          <Button onClick={() => void refresh()} loading={refreshing} disabled={disableControls || loading || !model.trim()}>
            刷新并保存
          </Button>
        </div>
      }
    >
      <div className={styles.content}>
        <p className={styles.intro}>
          此值按当前认证账号和上游模型固定保存。服务端会接管下游请求头；上游不返回新值时，表示当前值仍然有效。
        </p>
        {loading ? (
          <LoadingSpinner size={18} />
        ) : (
          <>
            <Input
              label="上游模型"
              list="codex-turn-state-models"
              value={model}
              onChange={(event) => setModel(event.target.value)}
              placeholder="gpt-5.6-terra"
            />
            <datalist id="codex-turn-state-models">
              {models.map((item) => <option key={item} value={item} />)}
            </datalist>
            <Input
              label="刷新代理（可选）"
              value={proxy}
              onChange={(event) => setProxy(event.target.value)}
              placeholder="socks5://user:password@host:port"
              hint="支持 http://、https://、socks5://、socks5h://"
            />
            <div className={styles.state}>
              <span className={styles.stateLabel}>当前服务端值</span>
              <span className={styles.stateValue}>{currentState?.value || '尚未获取'}</span>
            </div>
          </>
        )}
        {message && <div className={styles.error} role="status">{message}</div>}
      </div>
    </Modal>
  );
}
