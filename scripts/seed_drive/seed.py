import argparse
import json
import os
import sys

from auth import get_drive_service
from wipe import wipe_test_root
from create import create_structure

HERE = os.path.dirname(os.path.abspath(__file__))
CREDENTIALS = os.path.join(HERE, "credentials.json")
TOKEN = os.path.join(HERE, "token.json")
TEMPLATE_FILE = os.path.join(HERE, "template.json")
TEMPLATES_DIR = os.path.join(HERE, "templates")


def main():
    parser = argparse.ArgumentParser(description="Seed synctropy-test folder in Google Drive")
    parser.add_argument("--yes", action="store_true", help="Skip wipe confirmation")
    args = parser.parse_args()

    if not os.path.exists(CREDENTIALS):
        print(f"ERROR: credentials.json not found at {CREDENTIALS}")
        print("See README.md for GCP setup instructions.")
        sys.exit(1)

    with open(TEMPLATE_FILE) as f:
        template = json.load(f)

    print("Authenticating...")
    service = get_drive_service(CREDENTIALS, TOKEN)

    print(f"Wiping existing '{template['root']}' folder...")
    wipe_test_root(service, template["root"], skip_confirm=args.yes)

    print(f"Creating '{template['root']}'...")
    folder_count, file_count, root_id = create_structure(service, template, TEMPLATES_DIR, CREDENTIALS, TOKEN)
    url = f"https://drive.google.com/drive/folders/{root_id}"

    print(f"\n{template['root']} created: {folder_count} folders, {file_count} files")
    print(f"Root: {url}")


if __name__ == "__main__":
    main()
