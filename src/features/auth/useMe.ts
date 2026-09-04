import { useQuery } from "@tanstack/react-query";
import { ApiError, apiFetch } from "../../lib/api";
import type { Me } from "./types";

/** Server state for the current user; null means "logged out". */
export const meQueryKey = ["me"] as const;

export function useMe() {
	return useQuery<Me | null>({
		queryKey: meQueryKey,
		queryFn: async () => {
			try {
				return await apiFetch<Me>("/v1/me");
			} catch (error) {
				// Missing/expired/revoked session = logged out, not an app error.
				if (error instanceof ApiError && error.code === "UNAUTHENTICATED") {
					return null;
				}
				throw error;
			}
		},
		staleTime: 60_000,
	});
}
