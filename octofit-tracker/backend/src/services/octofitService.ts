import { Activity, Team, User, Workout } from '../models/index.js';

type ActivityInput = {
  userId?: unknown;
  teamId?: unknown;
  type?: unknown;
  minutes?: unknown;
};

function httpError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  if (!isRecord(input)) throw httpError(400, 'Activity details are required');
  const { userId, teamId, type, minutes } = input as ActivityInput;
  if (typeof userId !== 'string' || !User.db.base.Types.ObjectId.isValid(userId)
    || typeof teamId !== 'string' || !Team.db.base.Types.ObjectId.isValid(teamId)) {
    throw httpError(400, 'Valid userId and teamId are required');
  }
  if (typeof type !== 'string' || !type.trim() || typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0) {
    throw httpError(400, 'A type and positive minutes value are required');
  }

  const [user, team] = await Promise.all([User.exists({ _id: userId }), Team.exists({ _id: teamId })]);
  if (!user || !team) throw httpError(404, 'The requested user or team does not exist');

  return Activity.create({
    user: userId,
    team: teamId,
    type: type.trim(),
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  if (!isRecord(input)) throw httpError(400, 'Team details are required');
  const { name, mascot, members = [] } = input;
  if (typeof name !== 'string' || !name.trim()) throw httpError(400, 'A team name is required');
  if (typeof mascot !== 'string' || !mascot.trim()) throw httpError(400, 'A team mascot is required');
  if (!Array.isArray(members) || members.some((member) => typeof member !== 'string' || !Team.db.base.Types.ObjectId.isValid(member))) {
    throw httpError(400, 'Members must be an array of valid user IDs');
  }
  const memberIds = [...new Set(members as string[])];
  if (memberIds.length && await User.countDocuments({ _id: { $in: memberIds } }) !== memberIds.length) {
    throw httpError(400, 'Every team member must be an existing user');
  }

  const team = await Team.create({ name: name.trim(), mascot: mascot.trim(), members: memberIds });
  if (memberIds.length) {
    await Team.updateMany(
      { _id: { $ne: team._id }, members: { $in: memberIds } },
      { $pull: { members: { $in: memberIds } } },
    );
    await User.updateMany({ _id: { $in: memberIds } }, { $set: { team: team._id } });
  }
  return team;
}

export async function getLeaderboard() {
  const [teams, pointTotals] = await Promise.all([
    Team.find().select('name').lean(),
    Activity.aggregate<{ _id: unknown; totalPoints: number }>([
      { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    ]),
  ]);
  const totalsByTeam = new Map(pointTotals.map(({ _id, totalPoints }) => [String(_id), totalPoints]));
  return teams
    .map((team) => ({ teamName: team.name, totalPoints: totalsByTeam.get(String(team._id)) ?? 0 }))
    .sort((left, right) => right.totalPoints - left.totalPoints || left.teamName.localeCompare(right.teamName))
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail }).lean();
  if (!user) throw httpError(404, 'No user found for this email address');

  const [recentActivity, workouts] = await Promise.all([
    Activity.findOne({ user: user._id }).sort({ occurredAt: -1 }).lean(),
    Workout.find().lean(),
  ]);
  const goal = user.fitnessGoal?.trim().toLowerCase();
  const activityType = recentActivity?.type.trim().toLowerCase();
  const activityFocus = activityType === 'run' || activityType === 'cycle' ? 'endurance' : activityType;
  const preferredFocus = goal && workouts.some((workout) => workout.focus.toLowerCase() === goal)
    ? goal
    : activityFocus;
  const preferred = workouts.filter((workout) => workout.focus.toLowerCase() === preferredFocus);
  const selected = preferred.length ? preferred : workouts;
  const reason = preferred.length
    ? `Recommended for your ${preferredFocus} goal and recent activity.`
    : 'Recommended based on the available workout options.';

  return selected.map((workout) => ({ ...workout, reason }));
}

export { User };
