import datetime
import pathlib
import uuid

import openpyxl

SOURCE = pathlib.Path(r"C:\Users\samtr\Downloads\Updated_LotID_Address (2).xlsx")
OUTPUT = pathlib.Path("tmp/import_deans_pond_lots.sql")
COMMUNITY_ID = "f57eadc0-5101-4c88-a651-9f7560910c61"


def quote(value):
    return "'" + str(value).replace("'", "''") + "'"


workbook = openpyxl.load_workbook(SOURCE, data_only=True)
sheet = workbook.active
headers = [str(cell.value).strip() if cell.value is not None else "" for cell in sheet[1]]

rows = []
for row in sheet.iter_rows(min_row=2, values_only=True):
    item = {
        headers[index]: "" if row[index] is None else str(row[index]).strip()
        for index in range(len(headers))
    }
    if any(item.values()):
        rows.append(item)

values = []
for row in rows:
    status = (row.get("Status") or "active").strip().lower().replace(" ", "_")
    if status not in {"active", "inactive"}:
        status = "active"
    values.append(
        "("
        f"{quote(uuid.uuid4())}::uuid, "
        f"{quote(row['Lot Number'])}, "
        f"{quote(row['Address'])}, "
        f"{quote(status)}, "
        f"{quote(row['Owner Name'])}"
        ")"
    )

sql = [
    "BEGIN;",
    "CREATE TEMP TABLE lot_import (id uuid, lot_number text, address text, status text, owner_name text);",
    "INSERT INTO lot_import (id, lot_number, address, status, owner_name) VALUES",
    ",\n".join(values) + ";",
    'INSERT INTO property_lots (id, "lotNumber", address, status, "hoaCommunityId", "createdAt", "updatedAt")',
    f"SELECT id, lot_number, address, status::enum_property_lots_status, {quote(COMMUNITY_ID)}::uuid, NOW(), NOW()",
    "FROM lot_import imported",
    "WHERE NOT EXISTS (",
    "  SELECT 1 FROM property_lots existing",
    f'  WHERE existing."hoaCommunityId" = {quote(COMMUNITY_ID)}::uuid',
    '    AND existing."lotNumber" = imported.lot_number',
    "    AND COALESCE(existing.address, '') = COALESCE(imported.address, '')",
    ");",
    "COMMIT;",
]

OUTPUT.write_text("\n".join(sql), encoding="utf-8")
print(f"Wrote {OUTPUT} with {len(rows)} source rows")
