import { useEffect, useState } from 'react';
import { chainClient$ } from '@/state/chains/chain.state';
import { firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';

export interface Community {
  id: number;
  name: string;
  members: number;
}


const LOG_PREFIX = '[useCommunities]';
const LOG_ENABLED = localStorage.getItem('communities-logs') === 'true' || import.meta.env.DEV;

const log = {
  debug: (...args: any[]) => {
    if (LOG_ENABLED) {
      console.debug(LOG_PREFIX, ...args);
    }
  },
  info: (...args: any[]) => {
    if (LOG_ENABLED) {
      console.info(LOG_PREFIX, ...args);
    }
  },
  warn: (...args: any[]) => {
    console.warn(LOG_PREFIX, ...args);
  },
  error: (...args: any[]) => {
    console.error(LOG_PREFIX, ...args);
  },
};


if (import.meta.env.DEV) {
  (window as any).enableCommunitiesLogs = () => localStorage.setItem('communities-logs', 'true');
  (window as any).disableCommunitiesLogs = () => localStorage.removeItem('communities-logs');
}

export const useCommunities = (limit?: number) => {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let subscription: any = null;

    const fetchCommunities = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { chainHead, client } = await firstValueFrom(
          chainClient$.pipe(take(1))
        );

        if (!chainHead || !client) {
          setError('Chain client not available');
          setIsLoading(false);
          return;
        }



        const api = client.getUnsafeApi();
        



        try {


          log.info('Querying tracksIds from CommunityTracks.TracksIds...');
          
          let communityIds: number[] = [];
          
          try {
            const tracksIdsResult = await (api.query as any).CommunityTracks?.TracksIds?.getValue().catch((err: any) => {
              log.error('Error querying tracksIds:', err);
              return null;
            });
            
            log.debug('tracksIds result:', tracksIdsResult);
            


            if (tracksIdsResult) {

              if (Array.isArray(tracksIdsResult)) {
                communityIds = tracksIdsResult.map((id: any) => Number(id));
              } 

              else if (typeof tracksIdsResult === 'object') {
                const result = tracksIdsResult as any;
                if (result.communities && Array.isArray(result.communities)) {
                  communityIds = result.communities.map((id: any) => Number(id));
                } else {

                  const values = Object.values(result);
                  const arrayValue = values.find(v => Array.isArray(v)) as number[] | undefined;
                  if (arrayValue) {
                    communityIds = arrayValue.map(id => Number(id));
                  }
                }
              }
            }
          } catch (err: any) {
            log.error('Failed to query tracksIds:', err);
            throw new Error('Could not query CommunityTracks.TracksIds: ' + (err.message || String(err)));
          }
          
          log.info(`Found ${communityIds.length} community IDs:`, communityIds);
          
          if (communityIds.length === 0) {
            log.warn('No community IDs found');
            setCommunities([]);
            setIsLoading(false);
            return;
          }
          

          const communitiesList: Community[] = [];
          
          log.info(`Fetching names for ${communityIds.length} communities...`);
          
          for (const communityId of communityIds) {
            try {
              log.debug(`Querying tracks for community ${communityId}...`);
              



              const tracksResult = await (api.query as any).CommunityTracks?.Tracks?.getValue(communityId);
              log.debug(`Community ${communityId} tracksResult:`, tracksResult);
              
              const itemResult = await (api.query as any).CommunityMemberships?.Item?.getEntries(communityId);
                log.debug(`itemResult (ValueSet):`, itemResult);



              let members = 0;
              try {
                const itemResult = await (api.query as any).CommunityMemberships?.Item?.getEntries(communityId);
                log.debug(`Community ${communityId} itemResult (ValueSet):`, itemResult);
                


                if (itemResult !== null && itemResult !== undefined) {

                  if (Array.isArray(itemResult)) {
                    members = itemResult.length;
                  } 

                  else if (itemResult && typeof itemResult === 'object' && 'length' in itemResult) {
                    members = Number(itemResult.length) || 0;
                  }

                  else if (typeof itemResult === 'object') {

                    if ('ValueSet' in itemResult && Array.isArray((itemResult as any).ValueSet)) {
                      members = (itemResult as any).ValueSet.length;
                    }

                    else {
                      const values = Object.values(itemResult);
                      const arrayValue = values.find(v => Array.isArray(v)) as any[] | undefined;
                      if (arrayValue) {
                        members = arrayValue.length;
                      }
                    }
                  }
                }
                
                log.debug(`Community ${communityId}: members=${members} (from ValueSet length)`);
              } catch (itemErr) {
                log.warn(`Community ${communityId}: error querying item/members:`, itemErr);
                members = 0;
              }
              



              let name = `Community ${communityId}`;
              if (tracksResult) {
                const track = tracksResult as any;
                if (track.name) {

                  if (typeof track.name.asText === 'function') {
                    try {
                      const nameText = track.name.asText();

                      if (typeof nameText === 'string') {

                        name = nameText.replace(/\0/g, '').trim();
                      } else {

                        const nameBytes = track.name.asBytes();
                        if (Array.isArray(nameBytes) || nameBytes instanceof Uint8Array) {
                          const bytes = Array.from(nameBytes);
                          const filteredName = bytes.filter((b: number) => b !== 0);
                          name = String.fromCharCode(...filteredName);
                        }
                      }
                    } catch (err) {
                      log.warn(`Community ${communityId}: error extracting name from FixedSizeBinary:`, err);

                      try {
                        const nameBytes = track.name.asBytes();
                        if (Array.isArray(nameBytes) || nameBytes instanceof Uint8Array) {
                          const bytes = Array.from(nameBytes);
                          const filteredName = bytes.filter((b: number) => b !== 0);
                          name = String.fromCharCode(...filteredName);
                        }
                      } catch (bytesErr) {
                        log.warn(`Community ${communityId}: error extracting name from bytes:`, bytesErr);
                      }
                    }
                  } else if (Array.isArray(track.name)) {

                    const filteredName = track.name.filter((b: number) => b !== 0);
                    name = String.fromCharCode(...filteredName);
                  } else if (typeof track.name === 'string') {
                    name = track.name.replace(/\0/g, '').trim();
                  }
                }
                log.debug(`Community ${communityId}: name="${name}"`);
              } else {
                log.warn(`Community ${communityId}: no tracks result, using default name`);
              }
              
              communitiesList.push({
                id: communityId,
                name: name.trim() || `Community ${communityId}`,
                members: members,
              });
              
              log.debug(`Community ${communityId}: name="${name}", members=${members}`);
            } catch (err) {
              log.error(`Error querying data for community ${communityId}:`, err);

              communitiesList.push({
                id: communityId,
                name: `Community ${communityId}`,
                members: 0,
              });
            }
          }

          log.info(`Successfully fetched ${communitiesList.length} communities:`, communitiesList.map(c => ({ id: c.id, name: c.name, members: c.members })));


          const result = limit ? communitiesList.slice(0, limit) : communitiesList;
          setCommunities(result);
          setIsLoading(false);
        } catch (storageErr: any) {
          log.error('Storage query error:', storageErr);

          setError('Could not query communities storage');
          setCommunities([]);
          setIsLoading(false);
        }
      } catch (err: any) {
        log.error('Error fetching communities:', err);
        setError(err.message || 'Failed to fetch communities');
        setIsLoading(false);
      }
    };

    subscription = chainClient$.subscribe({
      next: () => {
        log.debug('Chain client connected, fetching communities...');
        fetchCommunities();
      },
      error: (err) => {
        log.error('Chain client error:', err);
        setError('Chain client error');
        setIsLoading(false);
      },
    });

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [limit]);

  return { communities, isLoading, error };
};

