import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "./ConfirmDialog";

describe("ConfirmDialog", () => {
	it("presents the action and runs it only after confirmation", () => {
		const onConfirm = vi.fn();
		const onCancel = vi.fn();
		render(
			<ConfirmDialog
				title="Remove photo from album?"
				description="The original file will stay safely in the vault."
				confirmLabel="Remove photo"
				tone="danger"
				onConfirm={onConfirm}
				onCancel={onCancel}
			/>,
		);

		expect(screen.getByRole("alertdialog")).toBeTruthy();
		expect(screen.getByText(/original file will stay safely/i)).toBeTruthy();
		expect(onConfirm).not.toHaveBeenCalled();

		fireEvent.click(screen.getByRole("button", { name: "Remove photo" }));
		expect(onConfirm).toHaveBeenCalledOnce();
	});

	it("can be dismissed with Escape", () => {
		const onCancel = vi.fn();
		render(
			<ConfirmDialog
				title="Archive this album?"
				description="Photos remain in the vault."
				confirmLabel="Archive album"
				onConfirm={vi.fn()}
				onCancel={onCancel}
			/>,
		);

		fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Escape" });
		expect(onCancel).toHaveBeenCalledOnce();
	});
});
