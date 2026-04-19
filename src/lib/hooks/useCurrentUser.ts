import { useQuery } from '@tanstack/react-query';
import { getCurrentUser } from '../api/auth';
import { isAuthenticated } from '../auth/session';

export function useCurrentUser() {
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
    enabled: isAuthenticated(),
  });
}
