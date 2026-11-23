import api from '~/core/http';
import { rankingIdPattern } from './RankingService';

export type CollectionVisibility = 'PUBLIC' | 'PRIVATE';

function invalid(): never {
  throw new Error('Unconfirmed collection visibility');
}
function endpoint(id: string) {
  if (!rankingIdPattern.test(id)) return invalid();
  return `/movies/collections/${id.toLowerCase()}/settings/visibility`;
}
function value(data: unknown): CollectionVisibility {
  if (
    !data ||
    typeof data !== 'object' ||
    Object.keys(data).length !== 1 ||
    !('visibility' in data)
  )
    return invalid();
  if (data.visibility !== 'PUBLIC' && data.visibility !== 'PRIVATE') return invalid();
  return data.visibility;
}

export default {
  async settings(id: string, signal?: AbortSignal): Promise<CollectionVisibility> {
    const response = await api.get(endpoint(id), { signal });
    return response.status === 200 ? value(response.data) : invalid();
  },
  async save(id: string, desired: CollectionVisibility): Promise<CollectionVisibility> {
    if (desired !== 'PUBLIC' && desired !== 'PRIVATE') return invalid();
    const response = await api.put(endpoint(id), { visibility: desired });
    if (response.status !== 200 || value(response.data) !== desired) return invalid();
    return desired;
  },
};
