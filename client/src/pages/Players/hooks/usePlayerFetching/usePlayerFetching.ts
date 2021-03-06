import axios from 'axios';
import * as React from 'react';
import { PlayerFilters } from '../usePlayerFiltering/usePlayerFiltering';

interface PlayerQueryResult<T> {
    results: T[];
    totalItems: number;
}

interface PlayerFetchingState<T> {
    loading: boolean;
    players: PlayerQueryResult<T>;
}

function usePlayerFetching<T>(url: string, filters: PlayerFilters): PlayerFetchingState<T> {
    const [loading, setLoading] = React.useState(false);
    const [players, setPlayers] = React.useState<PlayerQueryResult<T>>({ results: [], totalItems: 0 });

    React.useEffect(() => {
        const source = axios.CancelToken.source();

        let isMounted = true;

        async function getPlayers() {
            setLoading(true);

            try {
                const response = await axios.get(url, {
                    cancelToken: source.token,
                    params: {
                        page: filters.page,
                        pageSize: filters.pageSize,
                        position: filters.position,
                        search: filters.search,
                        sort: { [filters.sort.property]: filters.sort.ascending ? 1 : -1 },
                        team: filters.team,
                    }
                });

                setPlayers(response.data);
            } catch (error) {
                if (!isMounted || axios.isCancel(error)) return;

                console.error('Error fetching players:', error);
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        getPlayers();

        return () => {
            isMounted = false;
            source.cancel();
        };
    }, [filters, url]);

    return { loading, players };
}

export default usePlayerFetching;
