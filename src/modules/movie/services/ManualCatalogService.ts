import api from '~/core/http';
import {
  MANUAL_CATALOG_BODY_LIMIT,
  MANUAL_CATALOG_PATH,
  manualCatalogErrorCode,
  manualCatalogReceipt,
  normalizeManualCatalogInput,
  type ManualCatalogCreateInput,
} from '../utils/manualCatalogContract';

export {
  normalizeManualCatalogInput,
  type ManualCatalogCreateInput,
  type ManualCatalogReceipt,
} from '../utils/manualCatalogContract';
export class ManualCatalogError extends Error {
  constructor(
    readonly status?: number,
    readonly code?: ReturnType<typeof manualCatalogErrorCode>,
  ) {
    super('Manual catalog request unavailable or unconfirmed');
    this.name = 'ManualCatalogError';
  }
}
function clean(phase: 'proof' | 'create', error: unknown) {
  const response = (
    error as { response?: { status?: unknown; data?: { data?: { code?: unknown } } } } | undefined
  )?.response;
  const status = response?.status;
  return typeof status === 'number'
    ? new ManualCatalogError(
        status,
        manualCatalogErrorCode(status, response?.data?.data?.code, phase),
      )
    : new ManualCatalogError();
}
export default {
  async proof(signal?: AbortSignal): Promise<void> {
    if (import.meta.server) throw new ManualCatalogError();
    const { status, data } = await api
      .get(MANUAL_CATALOG_PATH, { signal })
      .catch((error: unknown) => {
        throw clean('proof', error);
      });
    if (status !== 204 || (data != null && data !== '')) throw new ManualCatalogError();
  },
  async create(input: ManualCatalogCreateInput) {
    if (import.meta.server) throw new ManualCatalogError();
    const body = normalizeManualCatalogInput(input);
    if (!body || new TextEncoder().encode(JSON.stringify(body)).length > MANUAL_CATALOG_BODY_LIMIT)
      throw new ManualCatalogError(400, 'catalog.invalid_manual_movie');
    const { status, data } = await api.post(MANUAL_CATALOG_PATH, body).catch((error: unknown) => {
      throw clean('create', error);
    });
    const receipt = manualCatalogReceipt(data);
    if ((status !== 200 && status !== 201) || !receipt) throw new ManualCatalogError();
    return receipt;
  },
};
