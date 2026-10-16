import { getJson } from '../api/client.js';
import { useApiResource } from '../api/useApiResource.js';

type Workout = { _id?: string; title: string; focus: string; minutes: number; difficulty: string; reason: string };

export default function Workouts() {
  const state = useApiResource<{ suggestions: Workout[] }>('/api/workouts/suggestions/mona%40example.com', getJson<{ suggestions: Workout[] }>);
  return <section className="card h-100"><div className="card-body">
    <h2 className="h4">Workout suggestions</h2>
    <p>Recommend workouts from activity patterns.</p>
    {state.status === 'loading' && <p role="status">Loading workout suggestions...</p>}
    {state.status === 'error' && <p role="alert">Unable to load workout suggestions: {state.message}</p>}
    {state.status === 'success' && (state.data.suggestions.length === 0
      ? <p>No workout suggestions yet.</p>
      : <ul>{state.data.suggestions.map((workout, index) => <li key={workout._id ?? `${workout.title}-${index}`}>
        <strong>{workout.title}</strong> · {workout.focus}, {workout.minutes} minutes, {workout.difficulty}
        <p>{workout.reason}</p>
      </li>)}</ul>)}
  </div></section>;
}
