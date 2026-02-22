#!/usr/bin/env python3
"""
Unit tests for evidence_validation_engine.py

Creates a temporary Insurance_System layout with minimal files and asserts:
- ledger.json files are created
- compliance report flags missing evidence when appropriate
- a valid minimal claim passes when evidence present
"""

import json
import os
import shutil
import tempfile
from pathlib import Path
import subprocess
import sys
import time
import pytest

ROOT_SCRIPT = Path(__file__).parent / "evidence_validation_engine.py"

def run_engine(root, claim=None, ingest_only=False):
    cmd = [sys.executable, str(ROOT_SCRIPT), "--root", str(root)]
    if claim:
        cmd += ["--claim", claim]
    if ingest_only:
        cmd += ["--ingest-only"]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    return proc

@pytest.fixture
def sample_workspace(tmp_path):
    root = tmp_path / "Insurance_System"
    # create structure
    (root / "account_holders" / "AH-0001" / "evidence").mkdir(parents=True)
    (root / "policies" / "POL-2024-HO4-001" / "documents").mkdir(parents=True)
    (root / "inventories" / "INVSET-AH-0001" / "items" / "INV-0042" / "evidence").mkdir(parents=True)
    (root / "events" / "EVT-2026-0003" / "evidence").mkdir(parents=True)
    (root / "claims" / "CLM-2026-0012").mkdir(parents=True)

    # create minimal files
    ah_id = root / "account_holders" / "AH-0001" / "evidence" / "id_document.pdf"
    ah_id.write_text("ID PDF content")
    pol_doc = root / "policies" / "POL-2024-HO4-001" / "documents" / "declarations.pdf"
    pol_doc.write_text("Declarations")
    receipt = root / "inventories" / "INVSET-AH-0001" / "items" / "INV-0042" / "evidence" / "receipt_2023-03-10.pdf"
    receipt.write_text("Receipt for MacBook")
    scene = root / "events" / "EVT-2026-0003" / "evidence" / "police_report_2026-02-11.pdf"
    scene.write_text("Police report")

    # create claim.json referencing these
    claim = {
        "claim_id": "CLM-2026-0012",
        "account_holder_id": "AH-0001",
        "policy_id": "POL-2024-HO4-001",
        "inventory_set_id": "INVSET-AH-0001",
        "event_id": "EVT-2026-0003",
        "claimed_items": [{"inventory_id": "INV-0042", "claimed_status": "stolen"}]
    }
    write = root / "claims" / "CLM-2026-0012" / "claim.json"
    write.write_text(json.dumps(claim))

    return root

def test_ingest_and_ledger_creation(sample_workspace):
    root = sample_workspace
    proc = run_engine(root, ingest_only=True)
    assert proc.returncode == 0
    # check ledgers created
    ah_ledger = root / "account_holders" / "AH-0001" / "ledger.json"
    assert ah_ledger.exists()
    pol_ledger = root / "policies" / "POL-2024-HO4-001" / "ledger.json"
    assert pol_ledger.exists()
    inv_ledger = root / "inventories" / "INVSET-AH-0001" / "items" / "INV-0042" / "ledger.json"
    assert inv_ledger.exists()
    evt_ledger = root / "events" / "EVT-2026-0003" / "ledger.json"
    assert evt_ledger.exists()

def test_claim_validation_pass(sample_workspace):
    root = sample_workspace
    proc = run_engine(root, claim="CLM-2026-0012")
    assert proc.returncode == 0
    report = root / "admin" / "reports" / "compliance_report_CLM-2026-0012.json"
    assert report.exists()
    data = json.loads(report.read_text())
    assert data["status"] == "pass"
    assert data["summary"]["account_holder_evidence_count"] >= 1

def test_claim_validation_fail_missing_evidence(sample_workspace):
    root = sample_workspace
    # remove the policy document to simulate missing evidence
    pol_doc = root / "policies" / "POL-2024-HO4-001" / "documents" / "declarations.pdf"
    pol_doc.unlink()
    # run ingest + validate
    proc = run_engine(root, claim="CLM-2026-0012")
    assert proc.returncode == 0
    report = root / "admin" / "reports" / "compliance_report_CLM-2026-0012.json"
    assert report.exists()
    data = json.loads(report.read_text())
    assert data["status"] == "fail"
    # find policy insufficient issue
    issues = [i for i in data["issues"] if i.get("object") == "policy"]
    assert len(issues) == 1
    assert issues[0]["issue"] == "insufficient_evidence"
