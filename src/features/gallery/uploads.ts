import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../lib/api";
import { collectionKeys } from "./queries";

interface UploadTicket {
	photoId: string;
	status: string;
	upload: {
		url: string;
		method: "PUT";
		headers: Record<string, string>;
		expiresAt: string;
	};
}

function contentTypeForFile(file: File): string {
	if (file.type) return file.type;
	const extension = file.name.split(".").at(-1)?.toLowerCase();
	return (
		{
			jpg: "image/jpeg",
			jpeg: "image/jpeg",
			png: "image/png",
			webp: "image/webp",
			heic: "image/heic",
			heif: "image/heif",
			mp4: "video/mp4",
			mov: "video/quicktime",
		}[extension ?? ""] ?? "application/octet-stream"
	);
}

function putFile(
	ticket: UploadTicket,
	file: File,
	onProgress: (value: number) => void,
): Promise<void> {
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		xhr.open(ticket.upload.method, ticket.upload.url);
		for (const [name, value] of Object.entries(ticket.upload.headers))
			xhr.setRequestHeader(name, value);
		xhr.upload.onprogress = (event) => {
			if (event.lengthComputable) onProgress(event.loaded / event.total);
		};
		xhr.onload = () =>
			xhr.status >= 200 && xhr.status < 300
				? resolve()
				: reject(new Error(`Upload failed (${xhr.status}).`));
		xhr.onerror = () => reject(new Error("Upload connection failed."));
		xhr.send(file);
	});
}

export function useUploadFiles(
	collectionId: string,
	onProgress: (name: string, progress: number) => void,
) {
	const client = useQueryClient();
	return useMutation({
		mutationFn: async (files: File[]) => {
			let next = 0;
			const worker = async () => {
				while (next < files.length) {
					const file = files[next++];
					if (file === undefined) continue;
					const ticket = await apiFetch<UploadTicket>(
						`/v1/collections/${collectionId}/uploads`,
						{
							method: "POST",
							body: JSON.stringify({
								fileName: file.name,
								byteSize: file.size,
								contentType: contentTypeForFile(file),
							}),
						},
					);
					await putFile(ticket, file, (progress) =>
						onProgress(file.name, progress),
					);
					await apiFetch(`/v1/photos/${ticket.photoId}/upload-complete`, {
						method: "POST",
					});
					onProgress(file.name, 1);
				}
			};
			await Promise.all(
				Array.from({ length: Math.min(3, files.length) }, worker),
			);
		},
		onSettled: () => {
			void client.invalidateQueries({
				queryKey: collectionKeys.photos(collectionId),
			});
			void client.invalidateQueries({
				queryKey: collectionKeys.detail(collectionId),
			});
		},
	});
}
