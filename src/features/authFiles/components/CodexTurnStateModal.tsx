import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { IconPlus, IconRefreshCw, IconTrash2 } from '@/components/ui/icons';
import { authFilesApi } from '@/services/api';
import { codexTurnStateApi } from '@/services/api/codexTurnState';
import type { AuthFileItem } from '@/types';
import styles from './CodexTurnStateModal.module.scss';

type Props = {
  file: AuthFileItem | null;
  open: boolean;
  disableControls: boolean;
  onClose: () => void;
};

type Row = { id: number; model: string; value: string };

const fileAuthID = (file: AuthFileItem) =>
  typeof file.id === 'string' && file.id.trim() ? file.id.trim() : file.name.trim();

export function CodexTurnStateModal({ file, open, disableControls, onClose }: Props) {
  const { t } = useTranslation();
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
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
        const models = modelItems.map((item) => item.id).filter(Boolean);
        setAvailableModels(models);
        const account = (stateResponse.items ?? []).find(
          (item) => item.auth_id === fileAuthID(file) || item.name === file.name
        );
        const configured = Object.entries(account?.states ?? {}).map(([model, state], index) => ({
          id: index + 1,
          model,
          value: state.value || '',
        }));
        setRows(
          configured.length
            ? configured
            : [{ id: 1, model: models[0] || 'gpt-5.6-terra', value: '' }]
        );
      })
      .catch((error) => {
        if (!cancelled) {
          setMessage(
            error instanceof Error ? error.message : t('auth_files.codex_turn_state_load_failed')
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [file, open, t]);

  const modelOptions = useMemo(() => {
    const values = new Set(availableModels);
    rows.forEach((row) => row.model.trim() && values.add(row.model.trim()));
    return Array.from(values);
  }, [availableModels, rows]);

  const updateRow = (id: number, patch: Partial<Row>) =>
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  const refreshRow = async (row: Row) => {
    if (!file || !row.model.trim()) return;
    setRefreshing(true);
    setMessage('');
    try {
      const result = await codexTurnStateApi.refresh(
        fileAuthID(file),
        row.model.trim(),
        proxy.trim() || undefined
      );
      updateRow(row.id, { value: result.value });
      setMessage(t('auth_files.codex_turn_state_refresh_success'));
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : t('auth_files.codex_turn_state_refresh_failed')
      );
    } finally {
      setRefreshing(false);
    }
  };

  const refreshAll = async () => {
    if (!file) return;
    const targets = rows.filter((row) => row.model.trim());
    setRefreshing(true);
    setMessage('');
    try {
      const results: Row[] = [];
      for (let index = 0; index < targets.length; index += 3) {
        const batch = targets.slice(index, index + 3);
        const batchResults = await Promise.all(
          batch.map(async (row) => {
            try {
              const result = await codexTurnStateApi.refresh(
                fileAuthID(file),
                row.model.trim(),
                proxy.trim() || undefined
              );
              return { ...row, value: result.value };
            } catch {
              return row;
            }
          })
        );
        results.push(...batchResults);
      }
      setRows((current) => current.map((row) => results.find((item) => item.id === row.id) || row));
      setMessage(t('auth_files.codex_turn_state_refresh_all_done'));
    } finally {
      setRefreshing(false);
    }
  };

  const deleteRow = async (row: Row) => {
    if (!file || !row.model.trim()) {
      setRows((current) => current.filter((item) => item.id !== row.id));
      return;
    }
    setMessage('');
    try {
      await codexTurnStateApi.remove(fileAuthID(file), row.model.trim());
      setRows((current) => current.filter((item) => item.id !== row.id));
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : t('auth_files.codex_turn_state_delete_failed')
      );
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      width={780}
      title={t('auth_files.codex_turn_state_title')}
      footer={
        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose}>
            {t('common.close')}
          </Button>
        </div>
      }
    >
      <div className={styles.content}>
        <p className={styles.intro}>{t('auth_files.codex_turn_state_intro')}</p>
        <Input
          label={t('auth_files.codex_turn_state_proxy_label')}
          value={proxy}
          onChange={(event) => setProxy(event.target.value)}
          placeholder="socks5://user:password@host:port"
          hint={t('auth_files.codex_turn_state_proxy_hint')}
        />
        <div className={styles.toolbar}>
          <strong>{t('auth_files.codex_turn_state_model_config')}</strong>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => void refreshAll()}
            disabled={disableControls || refreshing || loading || !rows.length}
          >
            <IconRefreshCw size={14} /> {t('auth_files.codex_turn_state_refresh_all')}
          </Button>
        </div>
        <div className={styles.tableHead}>
          <span>{t('auth_files.codex_turn_state_model')}</span>
          <span>{t('auth_files.codex_turn_state_value')}</span>
          <span aria-hidden="true" />
        </div>
        {loading ? (
          <LoadingSpinner size={18} />
        ) : (
          rows.map((row) => (
            <div className={styles.row} key={row.id}>
              <div className={styles.fieldControl}>
                <select
                  aria-label={t('auth_files.codex_turn_state_select_model')}
                  className="input"
                  value={row.model}
                  onChange={(event) => updateRow(row.id, { model: event.target.value, value: '' })}
                >
                  <option value="">{t('auth_files.codex_turn_state_select_model')}</option>
                  {modelOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.valueField}>
                <Input
                  aria-label={t('auth_files.codex_turn_state_value')}
                  value={row.value}
                  placeholder={t('auth_files.codex_turn_state_not_fetched')}
                  readOnly
                />
              </div>
              <div className={styles.rowActions}>
                <Button
                  size="sm"
                  variant="secondary"
                  className={styles.iconButton}
                  onClick={() => void refreshRow(row)}
                  disabled={disableControls || refreshing || !row.model.trim()}
                  title={t('common.refresh')}
                >
                  <IconRefreshCw size={15} />
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  className={styles.iconButton}
                  onClick={() => void deleteRow(row)}
                  disabled={disableControls || refreshing || rows.length <= 1}
                  title={t('common.delete')}
                >
                  <IconTrash2 size={15} />
                </Button>
              </div>
            </div>
          ))
        )}
        <Button
          size="sm"
          variant="secondary"
          onClick={() =>
            setRows((current) => [...current, { id: Date.now(), model: '', value: '' }])
          }
          disabled={refreshing || disableControls}
        >
          <IconPlus size={14} /> {t('auth_files.codex_turn_state_add_model')}
        </Button>
        {message && (
          <div className={styles.error} role="status">
            {message}
          </div>
        )}
      </div>
    </Modal>
  );
}
