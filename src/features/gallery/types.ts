export interface Collection {
	id: string;
	name: string;
	description: string | null;
	eventDate: string | null;
	createdByUserId: string;
	createdAt: string;
	updatedAt?: string;
	archivedAt: string | null;
	photoCount: number;
	canManage: boolean;
	creatorName?: string;
	creatorAvatarUrl?: string | null;
	cover?: MediaAsset | null;
}

export interface GalleryOptions {
	sort:
		| "captured_asc"
		| "captured_desc"
		| "uploaded_asc"
		| "uploaded_desc"
		| "alphabet_asc"
		| "alphabet_desc";
	media: "all" | "image" | "video";
	uploaderId: string | null;
}

export interface CollectionUploader {
	id: string;
	displayName: string;
	avatarUrl: string | null;
	photoCount: number;
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
