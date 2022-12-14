import { getTotalPools, refFiViewFunction } from './ref';
import { Pool, PoolRPCView } from './types';
import { parsePool } from './utils';
import { unNamedError } from './error';
import { toNonDivisibleNumber } from './utils';
import { STABLE_LP_TOKEN_DECIMALS } from './constant';

export const DEFAULT_PAGE_LIMIT = 100;

export const getRatedPools = async ({ ids }: { ids: (string | number)[] }) => {
  return Promise.all(
    ids.map(id =>
      refFiViewFunction({
        methodName: 'get_rated_pool',
        args: { pool_id: Number(id) },
      }).then(pool_info => ({
        ...pool_info,
        pool_kind: 'RATED_SWAP',
        id: Number(id),
      }))
    )
  ).catch(() => {
    throw unNamedError;
  });
};

export const getStablePools = async ({ ids }: { ids: (string | number)[] }) => {
  return Promise.all(
    ids.map(id =>
      refFiViewFunction({
        methodName: 'get_stable_pool',
        args: { pool_id: Number(id) },
      }).then(pool_info => ({
        ...pool_info,
        pool_kind: 'STABLE_SWAP',
        id: Number(id),
        rates: pool_info.c_amounts.map((_: any) =>
          toNonDivisibleNumber(STABLE_LP_TOKEN_DECIMALS, '1')
        ),
      }))
    )
  ).catch(() => {
    throw unNamedError;
  });
};

export const getRefPools = async (
  page: number = 1,
  perPage: number = DEFAULT_PAGE_LIMIT
): Promise<Pool[]> => {
  const index = (page - 1) * perPage;

  const poolData: PoolRPCView[] = await refFiViewFunction({
    methodName: 'get_pools',
    args: { from_index: index, limit: perPage },
  });

  return poolData.map((rawPool, i) => parsePool(rawPool, i + index));
};

// TODO: differentiate by network, include simple pools and stable pools
export const fetchAllRefPools = async () => {
  const totalPools = await getTotalPools();
  const pages = Math.ceil(totalPools / DEFAULT_PAGE_LIMIT);

  const pools = (
    await Promise.all([...Array(pages)].map((_, i) => getRefPools(i + 1)))
  ).flat() as Pool[];

  return {
    simplePools: pools.filter(
      p => p.pool_kind && p.pool_kind === 'SIMPLE_POOL'
    ),
    unRatedPools: pools.filter(
      p => p.pool_kind && p.pool_kind === 'STABLE_SWAP'
    ),
    ratedPools: pools.filter(p => p.pool_kind && p.pool_kind === 'RATED_SWAP'),
  };
};
