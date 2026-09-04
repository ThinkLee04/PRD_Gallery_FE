import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../lib/api";
import { meQueryKey } from "./useMe";

/** Signs out: revokes the session server-side, clears client state, go to /login. */
export function useLogout() {
	const queryClient = useQueryClient();
	const navigate = useNavigate();

	return useMutation({
		mutationFn: () => apiFetch<void>("/auth/logout", { method: "POST" }),
		onSuccess: () => {
			queryClient.setQueryData(meQueryKey, null);
			queryClient.removeQueries({ queryKey: meQueryKey });
			navigate("/login", { replace: true });
		},
	});
}
