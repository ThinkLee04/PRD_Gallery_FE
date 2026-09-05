import { Navigate } from "react-router-dom";
import { useMe } from "./useMe";

export function HomePage() {
	const me = useMe();
	if (me.isLoading || me.data == null) return null;
	return (
		<Navigate
			to={me.data.approvalStatus === "APPROVED" ? "/albums" : "/pending"}
			replace
		/>
	);
}
