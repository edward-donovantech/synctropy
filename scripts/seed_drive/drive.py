from googleapiclient.http import MediaFileUpload
import mimetypes


def find_folder(service, name: str, parent_id: str | None = None) -> str | None:
    """Return the Drive file ID of the first folder matching name, or None."""
    safe_name = name.replace("'", "\\'")
    q = f"name = '{safe_name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
    if parent_id:
        q += f" and '{parent_id}' in parents"
    results = service.files().list(q=q, fields="files(id, name)").execute()
    files = results.get("files", [])
    return files[0]["id"] if files else None


def trash_item(service, file_id: str) -> None:
    """Move a Drive item to trash."""
    service.files().update(fileId=file_id, body={"trashed": True}).execute()


def create_folder(service, name: str, parent_id: str) -> str:
    """Create a Drive folder and return its ID."""
    metadata = {
        "name": name,
        "mimeType": "application/vnd.google-apps.folder",
        "parents": [parent_id],
    }
    folder = service.files().create(body=metadata, fields="id").execute()
    return folder["id"]


def upload_file(service, local_path: str, name: str, parent_id: str, modified_time: str) -> str:
    """Upload a local file to Drive with an overridden modifiedTime. Returns file ID."""
    mime_type, _ = mimetypes.guess_type(local_path)
    if mime_type is None:
        mime_type = "application/octet-stream"
    metadata = {
        "name": name,
        "parents": [parent_id],
        "modifiedTime": modified_time,
    }
    media = MediaFileUpload(local_path, mimetype=mime_type)
    file = service.files().create(
        body=metadata,
        media_body=media,
        fields="id",
    ).execute()
    return file["id"]
