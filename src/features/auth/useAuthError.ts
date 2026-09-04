import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

const ERROR_MESSAGES: Record<string, string> = {
	access_denied:
		"Access was denied. You need to approve access to your Google account to sign in.",
	auth_failed: "Sign-in failed. Please try again.",
	server_error:
		"Something went wrong on our end. Please try again in a moment.",
};

/** Maps a backend ?error= value to a user-facing message (null when absent). */
export function authErrorMessage(raw: string | null): string | null {
	if (raw === null || raw === "") return null;
	return ERROR_MESSAGES[raw] ?? "Sign-in failed. Please try again.";
}

/**
 * Reads and clears the ?error= param the API redirects with after a failed
 * Google callback. The message is captured once so the UI does not flicker when
 * the param is stripped from the URL.
 */
export function useAuthError(): { message: string | null } {
	const [searchParams, setSearchParams] = useSearchParams();
	const raw = searchParams.get("error");
	const [message, setMessage] = useState<string | null>(() =>
		authErrorMessage(raw),
	);

	useEffect(() => {
		if (raw === null || raw === "") return;
		setMessage(authErrorMessage(raw));
		setSearchParams({}, { replace: true });
	}, [raw, setSearchParams]);

	return { message };
}
