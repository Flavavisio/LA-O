/** Shared presentation rule; the service independently enforces it on every write. */
export function canManageSharing(actor, target) {
  if (!actor || !target) return false;
  if (target.adult) return actor.id === target.id;
  return !!actor.adult && actor.role === 'admin';
}
