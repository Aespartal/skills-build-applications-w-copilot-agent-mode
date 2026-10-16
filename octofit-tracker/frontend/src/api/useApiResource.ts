import { useEffect, useState } from 'react';
import { getJson } from './client.js';

type JsonLoader<T> = (path: string) => Promise<T>;

type ResourceState<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: T };

export function useApiResource<T>(path: string, load: JsonLoader<T> = getJson) {
  const [state, setState] = useState<ResourceState<T>>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    load(path).then((data) => {
      if (active) setState({ status: 'success', data });
    }).catch((error: unknown) => {
      if (!active) return;
      setState({ status: 'error', message: error instanceof Error ? error.message : 'Unable to load data' });
    });
    return () => { active = false; };
  }, [load, path]);

  return state;
}