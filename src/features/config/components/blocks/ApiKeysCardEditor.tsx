import { memo, useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { authFilesApi } from '@/services/api';
import { useNotificationStore } from '@/stores';
import type { AuthFileItem } from '@/types';
import { copyToClipboard } from '@/utils/clipboard';
import { makeClientId } from '@/types/visualConfig';
import { generateSecureApiKey } from '@/utils/apiKey';
import { maskApiKey } from '@/utils/format';
import { isValidApiKeyCharset } from '@/utils/validation';
import { deriveAuthFileIdentity } from '@/features/authFiles/identity';
import { ApiKeyStrengthMeter } from './ApiKeyStrengthMeter';
import styles from './Blocks.module.scss';

export const ApiKeysCardEditor = memo(function ApiKeysCardEditor({
  value,
  authBindings,
  disabled,
  onChange,
  onAuthBindingsChange,
}: {
  value: string;
  authBindings: Record<string, string[]>;
  disabled?: boolean;
  onChange: (nextValue: string) => void;
  onAuthBindingsChange: (nextBindings: Record<string, string[]>) => void;
}) {
  const { t } = useTranslation();
  const showNotification = useNotificationStore((state) => state.showNotification);
  const apiKeys = useMemo(
    () =>
      value
        .split('\n')
        .map((key) => key.trim())
        .filter(Boolean),
    [value]
  );
  const [apiKeyIds, setApiKeyIds] = useState(() => apiKeys.map(() => makeClientId()));
  const renderApiKeyIds = useMemo(() => {
    if (apiKeyIds.length === apiKeys.length) return apiKeyIds;
    if (apiKeyIds.length > apiKeys.length) return apiKeyIds.slice(0, apiKeys.length);
    return [
      ...apiKeyIds,
      ...Array.from({ length: apiKeys.length - apiKeyIds.length }, () => makeClientId()),
    ];
  }, [apiKeyIds, apiKeys.length]);

  const apiKeyInputId = useId();
  const apiKeyHintId = `${apiKeyInputId}-hint`;
  const apiKeyErrorId = `${apiKeyInputId}-error`;
  const [modalOpen, setModalOpen] = useState(false);
  const [editingApiKeyId, setEditingApiKeyId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [formError, setFormError] = useState('');
  const [accounts, setAccounts] = useState<AuthFileItem[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountsError, setAccountsError] = useState(false);
  const [useAllAccounts, setUseAllAccounts] = useState(true);
  const [selectedAuthIndexes, setSelectedAuthIndexes] = useState<string[]>([]);

  const loadAccounts = async () => {
    setAccountsLoading(true);
    setAccountsError(false);
    try {
      const response = await authFilesApi.listForBindings();
      setAccounts(
        response.files.filter(
          (account) => typeof account.authIndex === 'string' && account.authIndex.trim() !== ''
        )
      );
    } catch {
      setAccountsError(true);
    } finally {
      setAccountsLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingApiKeyId(null);
    setInputValue('');
    setFormError('');
    setUseAllAccounts(true);
    setSelectedAuthIndexes([]);
    setModalOpen(true);
    void loadAccounts();
  };

  const openEditModal = (apiKeyId: string) => {
    const editingIndex = renderApiKeyIds.findIndex((id) => id === apiKeyId);
    setEditingApiKeyId(apiKeyId);
    const apiKey = apiKeys[editingIndex] ?? '';
    const boundIndexes = authBindings[apiKey] ?? [];
    setInputValue(apiKey);
    setFormError('');
    setUseAllAccounts(boundIndexes.length === 0);
    setSelectedAuthIndexes([...boundIndexes]);
    setModalOpen(true);
    void loadAccounts();
  };

  const closeModal = () => {
    setModalOpen(false);
    setInputValue('');
    setEditingApiKeyId(null);
    setFormError('');
    setUseAllAccounts(true);
    setSelectedAuthIndexes([]);
  };

  const updateApiKeys = (nextKeys: string[]) => {
    onChange(nextKeys.join('\n'));
  };

  const handleDelete = (apiKeyId: string) => {
    const index = renderApiKeyIds.findIndex((id) => id === apiKeyId);
    if (index < 0) return;
    setApiKeyIds(renderApiKeyIds.filter((id) => id !== apiKeyId));
    const deletedKey = apiKeys[index];
    if (deletedKey && authBindings[deletedKey]) {
      const nextBindings = { ...authBindings };
      delete nextBindings[deletedKey];
      onAuthBindingsChange(nextBindings);
    }
    updateApiKeys(apiKeys.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      setFormError(t('config_management.visual.api_keys.error_empty'));
      return;
    }
    if (!isValidApiKeyCharset(trimmed)) {
      setFormError(t('config_management.visual.api_keys.error_invalid'));
      return;
    }
    if (!useAllAccounts && selectedAuthIndexes.length === 0) {
      setFormError(t('config_management.visual.api_keys.error_accounts_empty'));
      return;
    }

    const editingIndex = editingApiKeyId
      ? renderApiKeyIds.findIndex((id) => id === editingApiKeyId)
      : -1;
    const nextKeys =
      editingApiKeyId === null
        ? [...apiKeys, trimmed]
        : apiKeys.map((key, idx) => (idx === editingIndex ? trimmed : key));
    if (editingApiKeyId === null) {
      setApiKeyIds([...renderApiKeyIds, makeClientId()]);
    }
    const previousKey = editingIndex >= 0 ? apiKeys[editingIndex] : '';
    const nextBindings = { ...authBindings };
    if (previousKey && previousKey !== trimmed) delete nextBindings[previousKey];
    if (useAllAccounts) {
      delete nextBindings[trimmed];
    } else {
      nextBindings[trimmed] = [...selectedAuthIndexes];
    }
    onAuthBindingsChange(nextBindings);
    updateApiKeys(nextKeys);
    closeModal();
  };

  const handleCopy = async (apiKey: string) => {
    const copied = await copyToClipboard(apiKey);
    showNotification(
      t(copied ? 'notification.link_copied' : 'notification.copy_failed'),
      copied ? 'success' : 'error'
    );
  };

  const handleGenerate = () => {
    setInputValue(generateSecureApiKey());
    setFormError('');
  };

  const toggleAccount = (authIndex: string) => {
    setSelectedAuthIndexes((current) =>
      current.includes(authIndex)
        ? current.filter((item) => item !== authIndex)
        : [...current, authIndex]
    );
    setFormError('');
  };

  const accountLabel = (account: AuthFileItem) => {
    const identity = deriveAuthFileIdentity(account);
    return identity.primary || account.name;
  };

  return (
    <div className="form-group" style={{ marginBottom: 0 }}>
      <div className={styles.blockHeaderRow}>
        <label style={{ margin: 0 }}>{t('config_management.visual.api_keys.label')}</label>
        <Button size="sm" onClick={openAddModal} disabled={disabled}>
          {t('config_management.visual.api_keys.add')}
        </Button>
      </div>

      {apiKeys.length === 0 ? (
        <div className={styles.emptyState}>{t('config_management.visual.api_keys.empty')}</div>
      ) : (
        <div className="item-list" style={{ marginTop: 4 }}>
          {apiKeys.map((key, index) => (
            <div key={renderApiKeyIds[index] ?? `${key}-${index}`} className="item-row">
              <div className="item-meta">
                <div className="pill">#{index + 1}</div>
                <div className="item-title">
                  {t('config_management.visual.api_keys.input_label')}
                </div>
                <div className="item-subtitle">{maskApiKey(String(key || ''))}</div>
                <div className={styles.apiKeyBindingSummary}>
                  {authBindings[key]?.length
                    ? t('config_management.visual.api_keys.accounts_selected', {
                        count: authBindings[key].length,
                      })
                    : t('config_management.visual.api_keys.accounts_all')}
                </div>
              </div>
              <div className="item-actions">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleCopy(key)}
                  disabled={disabled}
                >
                  {t('common.copy')}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => openEditModal(renderApiKeyIds[index] ?? '')}
                  disabled={disabled}
                >
                  {t('config_management.visual.common.edit')}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDelete(renderApiKeyIds[index] ?? '')}
                  disabled={disabled}
                >
                  {t('config_management.visual.common.delete')}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="hint">{t('config_management.visual.api_keys.hint')}</div>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={
          editingApiKeyId !== null
            ? t('config_management.visual.api_keys.edit_title')
            : t('config_management.visual.api_keys.add_title')
        }
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={disabled}>
              {t('config_management.visual.common.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={disabled}>
              {editingApiKeyId !== null
                ? t('config_management.visual.common.update')
                : t('config_management.visual.common.add')}
            </Button>
          </>
        }
      >
        <div className="form-group">
          <label htmlFor={apiKeyInputId}>
            {t('config_management.visual.api_keys.input_label')}
          </label>
          <div className={styles.apiKeyModalInputRow}>
            <input
              id={apiKeyInputId}
              className="input"
              placeholder={t('config_management.visual.api_keys.input_placeholder')}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={disabled}
              aria-describedby={formError ? `${apiKeyErrorId} ${apiKeyHintId}` : apiKeyHintId}
              aria-invalid={Boolean(formError)}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleGenerate}
              disabled={disabled}
            >
              {t('config_management.visual.api_keys.generate')}
            </Button>
          </div>
          <ApiKeyStrengthMeter value={inputValue} />
          <div id={apiKeyHintId} className="hint">
            {t('config_management.visual.api_keys.input_hint')}
          </div>
          {formError && (
            <div id={apiKeyErrorId} className="error-box">
              {formError}
            </div>
          )}
        </div>
        <fieldset className={styles.apiKeyAccountFieldset} disabled={disabled}>
          <legend>{t('config_management.visual.api_keys.accounts_label')}</legend>
          <label className={styles.apiKeyAccountChoice}>
            <input
              type="radio"
              name={`${apiKeyInputId}-account-mode`}
              checked={useAllAccounts}
              onChange={() => {
                setUseAllAccounts(true);
                setFormError('');
              }}
            />
            <span>
              <strong>{t('config_management.visual.api_keys.accounts_all')}</strong>
              <small>{t('config_management.visual.api_keys.accounts_all_hint')}</small>
            </span>
          </label>
          <label className={styles.apiKeyAccountChoice}>
            <input
              type="radio"
              name={`${apiKeyInputId}-account-mode`}
              checked={!useAllAccounts}
              onChange={() => setUseAllAccounts(false)}
            />
            <span>
              <strong>{t('config_management.visual.api_keys.accounts_specific')}</strong>
              <small>{t('config_management.visual.api_keys.accounts_specific_hint')}</small>
            </span>
          </label>
          {!useAllAccounts && (
            <div className={styles.apiKeyAccountList}>
              {accountsLoading ? (
                <div className="hint">{t('common.loading')}</div>
              ) : accountsError ? (
                <div className="error-box">
                  {t('config_management.visual.api_keys.accounts_load_error')}
                </div>
              ) : accounts.length === 0 ? (
                <div className="hint">{t('config_management.visual.api_keys.accounts_empty')}</div>
              ) : (
                accounts.map((account) => {
                  const authIndex = String(account.authIndex);
                  return (
                    <label key={authIndex} className={styles.apiKeyAccountItem}>
                      <input
                        type="checkbox"
                        checked={selectedAuthIndexes.includes(authIndex)}
                        onChange={() => toggleAccount(authIndex)}
                      />
                      <span>
                        <strong>{accountLabel(account)}</strong>
                        <small>
                          {String(account.provider || account.type || '')} · {account.name}
                        </small>
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          )}
        </fieldset>
      </Modal>
    </div>
  );
});
