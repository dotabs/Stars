export function getUserDisplayName(user) {
  const displayName = user?.displayName?.trim();

  if (displayName) {
    return displayName;
  }

  const email = user?.email?.trim() || '';
  const localPart = email.split('@')[0]?.trim();

  return localPart || 'Signed in';
}

export function getUserInitials(user) {
  const name = getUserDisplayName(user);
  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return 'U';
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}
