from drive import find_folder, trash_item


def wipe_test_root(service, root_name: str, skip_confirm: bool = False) -> None:
    """Find and trash the root test folder in Drive."""
    folder_id = find_folder(service, root_name)
    if folder_id is None:
        print(f"No existing '{root_name}' folder found — nothing to wipe.")
        return

    if not skip_confirm:
        answer = input(f"Trash existing '{root_name}' folder? [y/N] ").strip().lower()
        if answer != "y":
            print("Aborted.")
            raise SystemExit(0)

    trash_item(service, folder_id)
    print(f"'{root_name}' moved to trash.")
