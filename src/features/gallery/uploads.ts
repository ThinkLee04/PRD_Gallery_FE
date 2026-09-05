import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError, apiFetch } from "../../lib/api";
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

const wait = (milliseconds: number) =>
	new Promise((resolve) => window.setTimeout(resolve, milliseconds));

async function requestUploadTicket(
	collectionId: string,
	file: File,
): Promise<UploadTicket> {
	for (let attempt = 0; ; attempt++) {
		try {
			return await apiFetch<UploadTicket>(
				`/v1/collections/${collectionId}/uploads`,
				{
					method: "POST",
					body: JSON.stringify({
						fileName: file.name,
						byteSize: file.size,
						contentType: contentTypeForFile(file),
						...(file.lastModified > 0
							? { lastModifiedAt: file.lastModified }
							: {}),
					}),
				},
			);
		} catch (error) {
			if (
				!(error instanceof ApiError) ||
				error.code !== "RATE_LIMITED" ||
				attempt >= 5
			)
				throw error;
			await wait(Math.min(30_000, 2_000 * 2 ** attempt));
		}
	}
}

export function useUploadFiles(
	collectionId: string,
	onProgress: (name: string, progress: number) => void,
) {
	const client = useQueryClient();
	return useMutation({
		mutationFn: async (files: File[]) => {
			let next = 0;
			const failures: Array<{ name: string; error: unknown }> = [];
			const worker = async () => {
				while (next < files.length) {
					const file = files[next++];
					if (file === undefined) continue;
					try {
						const ticket = await requestUploadTicket(collectionId, file);
						await putFile(ticket, file, (progress) =>
							onProgress(file.name, progress),
						);
						await apiFetch(`/v1/photos/${ticket.photoId}/upload-complete`, {
							method: "POST",
						});
						onProgress(file.name, 1);
					} catch (error) {
						failures.push({ name: file.name, error });
					}
				}
			};
			await Promise.all(
				Array.from({ length: Math.min(3, files.length) }, worker),
			);
			if (failures.length > 0) {
				const first = failures[0];
				const reason =
					first?.error instanceof Error ? first.error.message : "Unknown error";
				throw new Error(
					`${failures.length} of ${files.length} uploads failed. ${first?.name ?? "File"}: ${reason}`,
				);
			}
		},
		onSettled: () => {
			void client.invalidateQueries({
				queryKey: collectionKeys.photos(collectionId),
			});
			void client.invalidateQueries({
				queryKey: collectionKeys.detail(collectionId),
			});
			void client.invalidateQueries({
				queryKey: collectionKeys.uploaders(collectionId),
			});
		},
	});
}
