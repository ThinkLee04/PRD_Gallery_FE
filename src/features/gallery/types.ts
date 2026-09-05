export interface Collection {
	id: string;
	name: string;
	description: string | null;
	createdByUserId: string;
	createdAt: string;
	updatedAt?: string;
	archivedAt: string | null;
	photoCount: number;
	canManage: boolean;
}

export interface MediaAsset {
	url: string;
	expiresAt: string;
	width: number;
	height: number;
}

export interface GalleryItem {
	id: string;
	mediaType: "IMAGE" | "VIDEO";
	status: "PENDING_UPLOAD" | "UPLOADED" | "PROCESSING" | "READY" | "FAILED";
	fileName: string;
	width: number | null;
	height: number | null;
	aspectRatio: number | null;
	capturedAt: string | null;
	capturedTimezoneOffsetMinutes: number | null;
	uploadedAt: string;
	uploader: { id?: string; displayName: string; avatarUrl: string | null };
	loved: boolean;
	assets: { sm: MediaAsset | null; md: MediaAsset | null };
}

export interface PhotoDetail extends Omit<GalleryItem, "assets"> {
	display: MediaAsset | null;
}
