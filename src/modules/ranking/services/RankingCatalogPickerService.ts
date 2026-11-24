import api from '~/core/http';
import {
  catalogPickerEntryId,
  catalogPickerErrorCode,
  catalogPickerPage,
  catalogPickerSearchBody,
  isCatalogPickerId,
  type CatalogAttachReceipt,
  type CatalogPickerLanguage,
  type CatalogPickerOperation,
} from '../utils/catalogPickerContract';

export {
  catalogPickerQuery,
  type CatalogAttachReceipt,
  type CatalogPickerLanguage,
  type CatalogPickerMovie,
  type CatalogPickerPage,
} from '../utils/catalogPickerContract';

export class CatalogPickerError extends Error {
  constructor(
    readonly status?: number,
    readonly code?: ReturnType<typeof catalogPickerErrorCode>,
  ) {
    super('Contextual catalog unavailable or unconfirmed');
    this.name = 'CatalogPickerError';
  }
}
function clean(kind: CatalogPickerOperation, error: unknown) {
  const response = (
    error as { response?: { status?: unknown; data?: { data?: { code?: unknown } } } } | undefined
  )?.response;
  const status = response?.status;
  return typeof status === 'number'
    ? new CatalogPickerError(
        status,
        catalogPickerErrorCode(kind, status, response?.data?.data?.code),
      )
    : new CatalogPickerError();
}
function endpoint(rankingId: string) {
  if (import.meta.server || !isCatalogPickerId(rankingId)) throw new CatalogPickerError();
  return `/movies/collections/${rankingId}/entries/catalog`;
}
export default {
  async search(
    rankingId: string,
    query: string,
    page: number,
    language: CatalogPickerLanguage,
    signal?: AbortSignal,
  ) {
    const path = endpoint(rankingId);
    const body = catalogPickerSearchBody({ query, page, language });
    if (!body) throw new CatalogPickerError(400, 'ranking.invalid_catalog_search');
    const response = await api.post(path + '/search', body, { signal }).catch((error: unknown) => {
      throw clean('search', error);
    });
    const result = catalogPickerPage(response.data, page);
    if (response.status !== 200 || !result) throw new CatalogPickerError();
    return result;
  },
  async add(rankingId: string, movieId: string): Promise<CatalogAttachReceipt> {
    const path = endpoint(rankingId);
    if (!isCatalogPickerId(movieId))
      throw new CatalogPickerError(400, 'ranking.invalid_catalog_entry');
    const response = await api.post(path, { movie_id: movieId }).catch((error: unknown) => {
      throw clean('attach', error);
    });
    const entryId = catalogPickerEntryId(response.data);
    if ((response.status !== 200 && response.status !== 201) || !entryId)
      throw new CatalogPickerError();
    return { entryId, disposition: response.status === 201 ? 'new' : 'existing' };
  },
};
