import { getJson } from '../api/client.js';
import { useApiResource } from '../api/useApiResource.js';

type Activity = { _id?: string; type: string; minutes: number; points: number };

export default function Activities() {
  const state = useApiResource<{ activities: Activity[] }>('/api/activities', getJson<{ activities: Activity[] }>);
  return <section className="card h-100"><div className="card-body">
    <h2 className="h4">Activities</h2>
    <p>Track student activity minutes and points.</p>
    {state.status === 'loading' && <p role="status">Loading activities...</p>}
    {state.status === 'error' && <p role="alert">Unable to load activities: {state.message}</p>}
    {state.status === 'success' && (state.data.activities.length === 0
      ? <p>No activities yet.</p>
      : <ul>{state.data.activities.map((activity, index) => <li key={activity._id ?? `${activity.type}-${index}`}>
        {activity.type}: {activity.minutes} minutes, {activity.points} points
      </li>)}</ul>)}
  </div></section>;
}
