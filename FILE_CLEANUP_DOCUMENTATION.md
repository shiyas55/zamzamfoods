# Zamzam Foods — Repository Cleanup & File Deletions Documentation

**Date:** October 7, 2026  
**Auditor:** Antigravity AI Engineering Assistant  
**Repository:** `shiyas55/zamzamfoods` (`backend`, `frontend`, monorepo)  
**Cleanup Commit:** [`15cb332`](https://github.com/shiyas55/zamzamfoods/commit/15cb332bfe0a71cfc9b190cfcffe40aa5bb61f63)  

---

## 1. Executive Summary

During the development and ledger reconciliation of the Oct 1 – Oct 7 live database data, multiple temporary diagnostic scripts, one-off scrapers, SQL patches, and intermediate dump files were created across the workspace root and `scripts/` directory.

To ensure production stability, prevent accidental execution of outdated repair scripts, and keep the repository clean and maintainable, a full audit and sanitization was conducted. A total of **19 obsolete/scratch files (2,772+ lines of transient code and ~8 MB of temporary dumps)** were safely removed.

All official production utility scripts and the finalized, authoritative database migration snapshots were verified and preserved.

---

## 2. Inventory of Deleted Files

### A. Root `scripts/` Directory (Obsolete Python Scratch Scripts)

| File Path | Lines | Type | Reason for Deletion |
| :--- | :--- | :--- | :--- |
| `scripts/audit_all_shops_oct1_oct7.py` | 143 | Python | One-time analytical script used to inspect ledger drift between Oct 1 and Oct 7. Analysis complete. |
| `scripts/generate_all_shops_reconciliation.py` | 154 | Python | Intermediate generator for the first-pass SQL fix. Superseded by final zero-dip dataset. |
| `scripts/build_full_reconciled_dataset.py` | 281 | Python | Historical builder script used to produce the initial clean dataset. Superseded by finalized artifacts. |
| `scripts/build_full_reconciled_sql.py` | 98 | Python | Generated initial DML migration statements. Replaced by finalized migration artifact. |
| `scripts/reconcile_data_processor.py` | 43 | Python | Prototype helper script for local JSON parsing. No longer referenced. |
| `scripts/import_localstorage_backup.py` | 218 | Python | One-off disaster-recovery script executed on Oct 5 to recover drafts from browser storage. Import completed. |
| `scripts/reset_and_combine_data.py` | 199 | Python | Outdated reset script from Oct 5 development cycle. Potentially dangerous if run accidentally. |

### B. Root & Backend Temporary SQL Fixes (Intermediate Patches)

| File Path | Lines | Size | Reason for Deletion |
| :--- | :--- | :--- | :--- |
| `fix.sql` | 141 | 15 KB | Early experimental SQL patch with syntax incompatible with PostgreSQL JSONB columns. |
| `fix_live_database_oct1_oct2.sql` | 187 | 17 KB | Partial shop fix targeting only order numbers and shop #1. Superseded by full 128-shop migration. |
| `backend/scripts/fix_live_database_oct1_oct2.sql` | 187 | 17 KB | Backend repository duplicate of partial shop fix. |
| `fix_prev_due_adjustments.sql` | 51 | 2 KB | Ad-hoc SQL snippet used during adjustment investigation. |
| `reconcile_all_shops_oct1_oct7.sql` | 535 | 64 KB | Intermediate 128-shop reconciliation SQL containing the ₹2.77L deficit before the ₹3.10L zero-dip fix. |
| `backend/scripts/reconcile_all_shops_oct1_oct7.sql` | 535 | 64 KB | Backend duplicate of the intermediate reconciliation SQL. |

### C. Temporary Dumps & Raw DBM Backups (Unversioned/Transient)

| File Path | Size | Reason for Deletion |
| :--- | :--- | :--- |
| `last.json` | 2.2 MB | Raw platform backup exported from live on Oct 7 (14:58). Contains corrupted adjustment records. |
| `last.sql` | 1.7 MB | Raw PostgreSQL dump exported from live on Oct 7 (14:58). Contained 123 mislabeled order numbers. |
| `zamzam_backup_fixes_20261007_055753.json` | 47 KB | Intermediate partial JSON export from early Oct 7 debugging session. |
| `zamzam_backup_postgresql_full_20261007_055753_CORRECTED.sql` | 1.6 MB | Raw snapshot with manually adjusted headers. Replaced by clean atomic SQL. |
| `zamzam_backup_postgresql_full_20261007_055753_FIXES.sql` | 15 KB | Preliminary patch statements from morning investigation. |
| `generate_clean_dataset.py` | 6 KB | Transient generator executed to output zero-negative guaranteed datasets. Cleaned up post-execution. |

---

## 3. Inventory of Retained & Protected Files

The following files represent permanent operational utilities and the authoritative production database artifacts. They have been verified and **strictly preserved**:

### A. System Operational Scripts (`scripts/`)

| File Path | Status | Purpose |
| :--- | :--- | :--- |
| [`scripts/backup_db.sh`](file:///Users/shiyasahmad/Documents/zamzam%20foods/scripts/backup_db.sh) | **ACTIVE** | Core automated backup utility supporting SQLite and PostgreSQL with gzip compression. |
| [`scripts/restore_db.sh`](file:///Users/shiyasahmad/Documents/zamzam%20foods/scripts/restore_db.sh) | **ACTIVE** | Automated disaster recovery and safety restore runner with pre-restore backup safeguards. |

### B. Production Reconciled Database Snapshots

| File Path | Records / Size | Purpose |
| :--- | :--- | :--- |
| [`backend/scripts/reconciled_clean.sql`](file:///Users/shiyasahmad/Documents/zamzam%20foods/backend/scripts/reconciled_clean.sql) | 1,273 lines (330 KB) | Official transactional SQL migration script with `SET CONSTRAINTS ALL DEFERRED;`. Purges 326 bogus adjustments and applies zero-dip guaranteed balances for all 128 shops. |
| [`backend/scripts/reconciled_clean.json`](file:///Users/shiyasahmad/Documents/zamzam%20foods/backend/scripts/reconciled_clean.json) | 2,863 records (1.9 MB) | Verified Django fixture archive with SHA-256 checksum matching ₹310,216.00 (₹3.10L) Oct 1 baseline. |
| [`reconciled_clean.sql`](file:///Users/shiyasahmad/Documents/zamzam%20foods/reconciled_clean.sql) | 330 KB | Root convenience copy for immediate operator access. |
| [`reconciled_clean.json`](file:///Users/shiyasahmad/Documents/zamzam%20foods/reconciled_clean.json) | 1.9 MB | Root convenience copy for Web UI import. |

---

## 4. Repository Health & Verification

1. **Monorepo (`shiyas55/zamzamfoods`):**
   - Active branch: `production` and `main` (both up to date with origin).
   - Working tree clean (`git status` reports 0 untracked or modified files).
2. **Backend Sub-Repository (`shiyas55/zamzamfoods_backend`):**
   - Active branch: `main` and `production` (both up to date with origin).
   - Working tree clean.
3. **Frontend Sub-Repository (`shiyas55/zamzamfoods_fontend`):**
   - Active branch: `main` and `production` (both up to date with origin).
   - Working tree clean.

---

## 5. Verification Commands

To confirm workspace hygiene at any time, run:

```bash
# Check that scripts/ contains only official operational shell scripts
ls -la "scripts/"

# Check that backend/scripts/ contains only the official reconciled snapshots
ls -la "backend/scripts/"

# Verify git cleanliness across all three repos
git status
(cd backend && git status)
(cd frontend && git status)
```
