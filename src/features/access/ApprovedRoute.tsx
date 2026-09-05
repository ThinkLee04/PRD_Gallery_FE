import { Navigate, Outlet } from "react-router-dom";
import { useMe } from "../auth/useMe";

export function ApprovedRoute() {
	const me = useMe();
	if (me.data?.approvalStatus !== "APPROVED" || me.data.vault === null)
		return <Navigate to="/pending" replace />;
	return <Outlet />;
}
