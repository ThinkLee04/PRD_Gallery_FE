import { type ReactNode, useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

interface ConfirmDialogProps {
	title: string;
	description: ReactNode;
	confirmLabel: string;
	cancelLabel?: string;
	tone?: "default" | "danger";
	isPending?: boolean;
	error?: string | null;
	onConfirm: () => void;
	onCancel: () => void;
}

export function ConfirmDialog({
	title,
	description,
	confirmLabel,
	cancelLabel = "Cancel",
	tone = "default",
	isPending = false,
	error,
	onConfirm,
	onCancel,
}: ConfirmDialogProps) {
	const titleId = useId();
	const descriptionId = useId();
	const dialogRef = useRef<HTMLDivElement>(null);
	const cancelRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		const previouslyFocused = document.activeElement as HTMLElement | null;
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		cancelRef.current?.focus();

		return () => {
			document.body.style.overflow = previousOverflow;
			previouslyFocused?.focus();
		};
	}, []);

	const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
		if (event.key === "Escape" && !isPending) {
			event.preventDefault();
			onCancel();
			return;
		}
		if (event.key !== "Tab") return;

		const focusable = Array.from(
			dialogRef.current?.querySelectorAll<HTMLButtonElement>(
				"button:not(:disabled)",
			) ?? [],
		);
		if (focusable.length === 0) return;
		const first = focusable[0];
		const last = focusable[focusable.length - 1];
		if (!first || !last) return;
		if (event.shiftKey && document.activeElement === first) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first.focus();
		}
	};

	return createPortal(
		<div className="confirmation-backdrop fixed inset-0 z-[100] flex items-end justify-center bg-[#1c1c1a]/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-6">
			<button
				type="button"
				tabIndex={-1}
				aria-label="Close confirmation"
				disabled={isPending}
				onClick={onCancel}
				className="absolute inset-0 cursor-default disabled:cursor-wait"
			/>
			<div
				ref={dialogRef}
				role="alertdialog"
				aria-modal="true"
				aria-labelledby={titleId}
				aria-describedby={descriptionId}
				onKeyDown={handleKeyDown}
				className="confirmation-panel relative w-full max-w-md rounded-t-2xl border border-white/50 bg-[#fdfcf8] shadow-[0_24px_80px_rgba(28,28,26,0.28)] sm:rounded-xl"
			>
				<div className="px-6 pb-5 pt-6 sm:px-7 sm:pt-7">
					<div
						aria-hidden="true"
						className={`mb-5 flex h-10 w-10 items-center justify-center rounded-full ${
							tone === "danger"
								? "bg-[#f5e5e3] text-[#a53e45]"
								: "bg-[#e8e7df] text-[#34332f]"
						}`}
					>
						{tone === "danger" ? (
							<svg
								aria-hidden="true"
								viewBox="0 0 24 24"
								className="h-5 w-5"
								fill="none"
								stroke="currentColor"
								strokeWidth="1.8"
							>
								<path d="M12 8v5" strokeLinecap="round" />
								<path d="M12 16.5h.01" strokeLinecap="round" />
								<circle cx="12" cy="12" r="9" />
							</svg>
						) : (
							<svg
								aria-hidden="true"
								viewBox="0 0 24 24"
								className="h-5 w-5"
								fill="none"
								stroke="currentColor"
								strokeWidth="1.8"
							>
								<path
									d="m7.5 12 3 3 6-6"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
								<circle cx="12" cy="12" r="9" />
							</svg>
						)}
					</div>
					<h2 id={titleId} className="text-lg font-medium tracking-tight">
						{title}
					</h2>
					<div
						id={descriptionId}
						className="mt-2 text-sm leading-6 text-[#68665f]"
					>
						{description}
					</div>
					{error ? (
						<p
							role="alert"
							className="mt-4 border-l-2 border-[#c84d54] pl-3 text-sm text-[#a53e45]"
						>
							{error}
						</p>
					) : null}
				</div>
				<div className="flex flex-col-reverse gap-2 border-t border-[#e6e3dc] bg-[#f8f7f2] px-6 py-4 sm:flex-row sm:justify-end sm:px-7">
					<button
						ref={cancelRef}
						type="button"
						disabled={isPending}
						onClick={onCancel}
						className="rounded-md border border-[#d4d0c7] bg-[#fdfcf8] px-4 py-2.5 text-sm font-medium text-[#53514c] hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
					>
						{cancelLabel}
					</button>
					<button
						type="button"
						disabled={isPending}
						onClick={onConfirm}
						className={`rounded-md px-4 py-2.5 text-sm font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60 ${
							tone === "danger"
								? "bg-[#a53e45] hover:bg-[#91363d]"
								: "bg-[#292925] hover:bg-[#11110f]"
						}`}
					>
						{isPending ? "Working…" : confirmLabel}
					</button>
				</div>
			</div>
		</div>,
		document.body,
	);
}
