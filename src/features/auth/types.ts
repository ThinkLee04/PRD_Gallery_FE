export interface Me {
	id: string;
	email: string;
	displayName: string;
	avatarUrl: string | null;
	approvalStatus: "PENDING" | "APPROVED";
	isAdmin: boolean;
	vault: { id: string; name: string; role: "OWNER" | "MEMBER" } | null;
}
