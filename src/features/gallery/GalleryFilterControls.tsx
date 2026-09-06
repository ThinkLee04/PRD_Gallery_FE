import type { CollectionUploader, GalleryOptions } from "./types";

const SORT_OPTIONS = [
	[
		"captured_asc",
		"Captured date · ASC",
		"Oldest moments first. Uses upload date when capture data is missing.",
	],
	[
		"captured_desc",
		"Captured date · DESC",
		"Newest moments first. Uses upload date when capture data is missing.",
	],
	["uploaded_asc", "Uploaded date · ASC", "Files added earliest appear first."],
	["uploaded_desc", "Uploaded date · DESC", "Most recently added files first."],
	["alphabet_asc", "Alphabet · ASC", "Filenames from A to Z."],
	["alphabet_desc", "Alphabet · DESC", "Filenames from Z to A."],
] as const;

const MEDIA_OPTIONS = [
	["all", "Photos & videos"],
	["image", "Photos only"],
	["video", "Videos only"],
] as const;

function closeMenu(target: HTMLElement) {
	target.closest("details")?.removeAttribute("open");
}

export function GalleryFilterControls({
	options,
	uploaders,
	onChange,
}: {
	options: GalleryOptions;
	uploaders: CollectionUploader[] | undefined;
	onChange: (options: GalleryOptions) => void;
}) {
	const sortLabel =
		options.sort === "captured_asc"
			? "Captured ↑"
			: options.sort === "captured_desc"
				? "Captured ↓"
				: options.sort === "uploaded_asc"
					? "Uploaded ↑"
					: options.sort === "uploaded_desc"
						? "Uploaded ↓"
						: options.sort === "alphabet_asc"
							? "Alphabet ↑"
							: "Alphabet ↓";
	const mediaLabel =
		options.media === "all"
			? "All media"
			: options.media === "image"
				? "Photos"
				: "Videos";
	const selectedUploader = uploaders?.find(
		(uploader) => uploader.id === options.uploaderId,
	);
	const update = (change: Partial<GalleryOptions>, target: HTMLElement) => {
		onChange({ ...options, ...change });
		closeMenu(target);
	};

	return (
		<div className="flex items-center justify-end gap-1 sm:justify-start sm:gap-2">
			<details className="relative hidden sm:block">
				<summary
					aria-label={`Sort: ${sortLabel}`}
					className={`flex min-h-10 cursor-pointer list-none items-center whitespace-nowrap border-b px-2 font-medium text-[#4f4e4a] hover:text-[#181817] ${options.sort !== "captured_desc" ? "border-[#74716b]" : "border-transparent"}`}
				>
					Sort
				</summary>
				<div className="absolute left-0 z-50 mt-2 max-h-[calc(100dvh-5rem)] w-64 max-w-[calc(100vw-1.5rem)] overflow-y-auto rounded-lg border border-[#d8d4cb] bg-[rgba(253,252,248,0.96)] p-2 backdrop-blur-md">
					{SORT_OPTIONS.map(([value, label, description]) => (
						<button
							key={value}
							type="button"
							onClick={(event) => update({ sort: value }, event.currentTarget)}
							className={`block w-full px-2 py-2 text-left hover:bg-[#efede7] ${options.sort === value ? "bg-[#efede7]" : ""}`}
						>
							<span className="block font-medium">{label}</span>
							<span className="mt-0.5 block text-[11px] leading-4 text-[#73716b]">
								{description}
							</span>
						</button>
					))}
				</div>
			</details>

			<details className="relative hidden sm:block">
				<summary
					aria-label={`Uploader: ${selectedUploader?.displayName ?? "All uploaders"}`}
					className={`flex min-h-10 cursor-pointer list-none items-center whitespace-nowrap border-b px-2 font-medium text-[#4f4e4a] hover:text-[#181817] ${options.uploaderId !== null ? "border-[#74716b]" : "border-transparent"}`}
				>
					Uploader
				</summary>
				<div className="absolute left-0 z-50 mt-2 max-h-[calc(100dvh-5rem)] w-56 max-w-[calc(100vw-1.5rem)] overflow-y-auto rounded-lg border border-[#d8d4cb] bg-[rgba(253,252,248,0.96)] p-2 backdrop-blur-md">
					<UploaderOptions
						options={options}
						uploaders={uploaders}
						onSelect={(uploaderId, target) => update({ uploaderId }, target)}
					/>
				</div>
			</details>

			<details className="relative hidden sm:block">
				<summary
					aria-label={`Media type: ${mediaLabel}`}
					className={`flex min-h-10 cursor-pointer list-none items-center whitespace-nowrap border-b px-2 font-medium text-[#4f4e4a] hover:text-[#181817] ${options.media !== "all" ? "border-[#74716b]" : "border-transparent"}`}
				>
					Media type
				</summary>
				<div className="absolute left-0 z-50 mt-2 w-40 rounded-lg border border-[#d8d4cb] bg-[rgba(253,252,248,0.96)] p-2 backdrop-blur-md">
					{MEDIA_OPTIONS.map(([value, label]) => (
						<button
							key={value}
							type="button"
							onClick={(event) => update({ media: value }, event.currentTarget)}
							className={`block w-full px-2 py-2 text-left hover:bg-[#efede7] ${options.media === value ? "font-medium" : ""}`}
						>
							{label}
						</button>
					))}
				</div>
			</details>

			<details className="relative sm:hidden">
				<summary className="flex min-h-10 cursor-pointer list-none items-center border-b border-transparent px-1 font-medium text-[#4f4e4a] hover:text-[#181817]">
					More
				</summary>
				<div className="fixed left-3 right-3 top-[4.5rem] z-50 max-h-[calc(100dvh-5.25rem)] overflow-y-auto rounded-lg border border-[#d8d4cb] bg-[rgba(253,252,248,0.97)] p-2 text-sm backdrop-blur-md">
					<p className="px-2 pb-1 pt-2 text-xs text-[#918e87]">
						Sort · {sortLabel}
					</p>
					{SORT_OPTIONS.map(([value, label]) => (
						<button
							key={value}
							type="button"
							onClick={(event) => update({ sort: value }, event.currentTarget)}
							className={`block min-h-11 w-full px-2 py-2 text-left hover:bg-[#efede7] ${options.sort === value ? "bg-[#efede7] font-medium" : ""}`}
						>
							{label}
						</button>
					))}
					<div className="my-2 border-t border-[#e6e3dc]" />
					<p className="px-2 pb-1 pt-2 text-xs text-[#918e87]">
						Uploader · {selectedUploader?.displayName ?? "All uploaders"}
					</p>
					<UploaderOptions
						mobile
						options={options}
						uploaders={uploaders}
						onSelect={(uploaderId, target) => update({ uploaderId }, target)}
					/>
					<div className="my-2 border-t border-[#e6e3dc]" />
					<p className="px-2 pb-1 pt-2 text-xs text-[#918e87]">
						Media type · {mediaLabel}
					</p>
					{MEDIA_OPTIONS.map(([value, label]) => (
						<button
							key={value}
							type="button"
							onClick={(event) => update({ media: value }, event.currentTarget)}
							className={`block min-h-11 w-full px-2 py-2 text-left hover:bg-[#efede7] ${options.media === value ? "bg-[#efede7] font-medium" : ""}`}
						>
							{label}
						</button>
					))}
				</div>
			</details>
		</div>
	);
}

function UploaderOptions({
	options,
	uploaders,
	onSelect,
	mobile = false,
}: {
	options: GalleryOptions;
	uploaders: CollectionUploader[] | undefined;
	onSelect: (uploaderId: string | null, target: HTMLElement) => void;
	mobile?: boolean;
}) {
	const baseClass = mobile ? "min-h-11" : "";
	return (
		<>
			<button
				type="button"
				onClick={(event) => onSelect(null, event.currentTarget)}
				className={`block w-full px-2 py-2 text-left hover:bg-[#efede7] ${baseClass} ${options.uploaderId === null ? `${mobile ? "bg-[#efede7] " : ""}font-medium` : ""}`}
			>
				All uploaders
			</button>
			{uploaders?.map((uploader) => (
				<button
					key={uploader.id}
					type="button"
					onClick={(event) => onSelect(uploader.id, event.currentTarget)}
					className={`flex w-full items-center gap-2 px-2 py-2 text-left hover:bg-[#efede7] ${baseClass} ${options.uploaderId === uploader.id ? `${mobile ? "bg-[#efede7] " : ""}font-medium` : ""}`}
				>
					{uploader.avatarUrl ? (
						<img
							src={uploader.avatarUrl}
							alt=""
							referrerPolicy="no-referrer"
							className="h-6 w-6 rounded-full"
						/>
					) : (
						<span className="h-6 w-6 rounded-full bg-[#ddd9d0]" />
					)}
					<span className="min-w-0 flex-1 truncate">
						{uploader.displayName}
					</span>
					<span className="text-[#918e87]">{uploader.photoCount}</span>
				</button>
			))}
		</>
	);
}
