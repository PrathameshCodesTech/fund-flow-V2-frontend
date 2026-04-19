import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listUsers, getUser, createUser, updateUser } from "../api/v2user";
import type { CreateUserRequest, UpdateUserRequest } from "../types/v2user";

export function useUsers(params?: { q?: string; is_active?: boolean }) {
  return useQuery({
    queryKey: ["v2", "users", params],
    queryFn: async () => {
      const res = await listUsers(params);
      return res.results;
    },
  });
}

export function useUser(id?: string | null) {
  return useQuery({
    queryKey: ["v2", "user", id],
    queryFn: () => getUser(id!),
    enabled: !!id,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateUserRequest) => createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "users"] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserRequest }) =>
      updateUser(id, data),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["v2", "users"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "user", id] });
    },
  });
}
