# Data Migration Plan
## MyVision Equipment Tracker — Initial Import

_Date: 2 April 2026_
_Status: Draft_

---

## 1. Source Data

**File:** `data/MyVision-V1-InventoryList.csv`
**Rows:** 46 (expands to 55 after quantity splitting)
**Approach:** Treat as an item list only. Most CSV fields (Condition, Status, Resell price, Date, URL) are either placeholder data, redundant, or don't map cleanly to the schema. Only three source columns are used: Name, Manufacturer, and Product type.

---

## 2. Transformation Summary

| Source Column | Target Field | Transformation |
|---|---|---|
| Name | `name` | Strip trailing `\n`, `\xa0`, and whitespace. Split multi-quantity rows into individual records with `(1)`, `(2)` suffixes. |
| Manufacturer | `make` | Direct copy after trimming. |
| Product type | `deviceCategory` | Mapped via lookup table (see §3). |
| Quantity | — | Used to split rows; not stored. |
| — | `acquisitionType` | Default: `DONATED_DEMO` for all items. Reclassify manually post-import. |
| — | `condition` | Default: `GOOD` for all items. Update manually post-import. |

All other CSV columns (Condition, Status, URL, Resell price, Date, ID) are discarded.

---

## 3. Category Mapping

| CSV Product Type | Schema DeviceCategory |
|---|---|
| Digital Magnifier | `DIGITAL_MAGNIFIER` |
| Digital Magnifier, Lighting | `DIGITAL_MAGNIFIER` |
| CCTV, Digital Magnifier | `CCTV_MAGNIFIER` |
| CCTV, Digital Magnifier, TTS Device | `CCTV_MAGNIFIER` |
| TTS Device | `TEXT_TO_SPEECH` |
| tablet/phone (iPad*) | `TABLET` |
| tablet/phone (iPhone*) | `SMARTPHONE` |
| computer/laptop | `MONITOR` |
| Screen Reader / Screen mag | `OTHER` |
| Screen Reader / Screen mag, computer/laptop | `OTHER` |
| Computer Accessories | `OTHER` |
| Daily Living Aids | `OTHER` |
| Smart Glasses | `OTHER` |
| Lighting | `OTHER` |
| Eye Wear | `OTHER` |

---

## 4. Quantity Splitting

7 source rows have Quantity > 1. These are expanded into individual records:

| Source Name | Qty | Output Names |
|---|---|---|
| iPad 9th gen | 2 | iPad 9th gen (1), iPad 9th gen (2) |
| iPhone SE | 2 | iPhone SE (1), iPhone SE (2) |
| iPad Pro 11" M1 | 2 | iPad Pro 11" M1 (1), iPad Pro 11" M1 (2) |
| Dolphin SuperNova touchscreen demo PC | 2 | ...demo PC (1), ...demo PC (2) |
| PenFriend 3 Audio Labeller | 3 | ...Labeller (1), (2), (3) |
| Talking Kitchen Scale | 2 | ...Scale (1), ...Scale (2) |
| ZoomText Large-Print Keyboard | 2 | ...Keyboard (1), ...Keyboard (2) |
| Apple iMac 21.5" | 2 | ...iMac (1), ...iMac (2) |

---

## 5. Items Requiring Manual Review Post-Import

### Reclassify acquisition type

All items default to `DONATED_DEMO`. After import, an Admin should reclassify:
- Items that were purchased → `PURCHASED`
- Donated items available for client loan → `DONATED_GIVEABLE`

This will auto-set each item's initial operational status correctly (AVAILABLE_FOR_DEMO vs AVAILABLE_FOR_LOAN).

### Flagged items

| Item | Issue | Recommended Action |
|---|---|---|
| JAWS license | Software licence, not physical equipment | Exclude from import or categorise as OTHER |
| Dolphin SuperNova touchscree demo PC (1/2) | Typo in source: "touchscree" → "touchscreen" | Corrected in import-ready CSV |

---

## 6. Import Procedure

1. Review `data/import-ready.csv` — confirm item names and categories are correct
2. Run dry-run: `npm run import:equipment -- --file=data/import-ready.csv --dry-run`
3. Check dry-run output for validation errors
4. Run live import: `npm run import:equipment -- --file=data/import-ready.csv`
5. Verify in the app: check item count on the dashboard matches 55
6. Begin manual reclassification of acquisition types via the admin panel

---

## 7. Output File

**Import-ready CSV:** `data/import-ready.csv`

Columns: `name`, `acquisitionType`, `deviceCategory`, `make`, `condition`

55 rows. All match the import column spec in [PRD §5.11](../PRD.md).
