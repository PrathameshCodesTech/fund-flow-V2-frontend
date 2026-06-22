import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listUsers,
  getUser,
  createUser,
  updateUser,
  sendPasswordReset,
  getWorkflowResponsibilities,
  reassignWorkflowResponsibilities,
} from "../api/v2user";
import type { CreateUserRequest, UpdateUserRequest } from "../types/v2user";

type UseUsersParams = {
  q?: string;
  is_active?: boolean;
  user_type?: "internal" | "vendor";
};

async function listAllUsers(params?: UseUsersParams) {
  const pageSize = 100;
  let page = 1;
  const users = [];

  while (true) {
    const res = await listUsers({ ...params, page, page_size: pageSize });
    users.push(...res.results);
    if (!res.next || users.length >= res.count) {
      return users;
    }
    page += 1;
  }
}

export function useUsers(params?: UseUsersParams) {
  return useQuery({
    queryKey: ["v2", "users", params],
    queryFn: () => listAllUsers(params),
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

export function useSendPasswordReset() {
  return useMutation({
    mutationFn: (id: string) => sendPasswordReset(id),
  });
}

export function useWorkflowResponsibilities(id?: string | null, enabled = true) {
  return useQuery({
    queryKey: ["v2", "users", id, "workflow-responsibilities"],
    queryFn: () => getWorkflowResponsibilities(id!),
    enabled: enabled && !!id,
  });
}

export function useReassignWorkflowResponsibilities() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      newUser,
      reason,
    }: {
      id: string;
      newUser: string;
      reason: string;
    }) => reassignWorkflowResponsibilities(id, {
      new_user: newUser,
      reason,
    }),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({
        queryKey: ["v2", "users", id, "workflow-responsibilities"],
      });
      queryClient.invalidateQueries({ queryKey: ["v2", "users"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "workflow", "tasks"] });
    },
  });
}
