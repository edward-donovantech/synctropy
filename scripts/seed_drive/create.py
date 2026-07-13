import os
from datetime import datetime, timezone, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed
from drive import create_folder, upload_file
from auth import get_drive_service


def _modified_time(age_days: int) -> str:
    """Return an RFC 3339 timestamp for now minus age_days."""
    dt = datetime.now(timezone.utc) - timedelta(days=age_days)
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def _ensure_folder_path(service, path: str, root_id: str, folder_cache: dict) -> str:
    """
    Recursively ensure all folders in path exist under root_id.
    path is like 'Client Work/Acme'. Returns the leaf folder ID.
    """
    parts = path.split("/")
    current_id = root_id
    built = ""
    for part in parts:
        built = f"{built}/{part}" if built else part
        if built not in folder_cache:
            folder_cache[built] = create_folder(service, part, current_id)
        current_id = folder_cache[built]
    return current_id


def create_structure(service, template: dict, templates_dir: str, credentials_path: str, token_path: str) -> tuple[int, int, str]:
    """
    Create the root folder, all subfolders, and upload all files from template.
    Returns (folder_count, file_count, root_id).
    """
    root_name = template["root"]
    files = template["files"]

    # Create root — use 'root' as the Drive root parent
    root_id = create_folder(service, root_name, "root")
    folder_cache: dict[str, str] = {}

    # Build the set of unique folder paths and pre-create them (single-threaded)
    unique_folders = sorted(set(f["folder"] for f in files))
    for folder_path in unique_folders:
        _ensure_folder_path(service, folder_path, root_id, folder_cache)

    folder_count = len(folder_cache) + 1  # +1 for root

    # Upload files concurrently — each thread gets its own service to avoid httplib2 thread-safety issues
    def upload_one(entry: dict) -> str:
        thread_service = get_drive_service(credentials_path, token_path)
        local_path = os.path.join(templates_dir, entry["template"])
        folder_id = folder_cache[entry["folder"]]
        modified_time = _modified_time(entry["age_days"])
        return upload_file(thread_service, local_path, entry["name"], folder_id, modified_time)

    file_count = 0
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(upload_one, entry): entry["name"] for entry in files}
        for future in as_completed(futures):
            future.result()  # raises on error
            file_count += 1
            if file_count % 10 == 0 or file_count == len(files):
                print(f"  uploaded {file_count}/{len(files)}...")

    return folder_count, file_count, root_id
