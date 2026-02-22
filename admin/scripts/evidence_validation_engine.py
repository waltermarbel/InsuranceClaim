#!/usr/bin/env python3
"""
evidence_validation_engine.py

- Walks the Insurance_System workspace.
- For each evidence file, computes SHA256, extracts basic metadata.
- Runs classification rules (deterministic + AI fallback) to assign evidence_class.
- Uses Gemini AI (if API key present) to deep-analyze policy documents and extract clauses.
- Writes/updates ledger.json next to evidence files.
- Validates that claim references have required evidence.
- Emits a compliance report.

Notes:
- Requires 'google-genai' package for AI features: `pip install google-genai`
- Reads API_KEY from environment or argument.
"""

import argparse
import hashlib
import json
import mimetypes
import os
import re
import time
import base64
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional

# Optional AI Import
try:
    from google import genai
    from google.genai import types
    HAS_GENAI = True
except ImportError:
    HAS_GENAI = False

# -----------------------
# Configuration / Rules
# -----------------------

EVIDENCE_CLASSES = [
    "documents_original",
    "document_photos",
    "documents_ai_derived",
    "scene",
    "items",
    "metadata",
]

PROVENANCE_TYPES = ["native", "scanned_photo", "ai_generated", "extracted"]

MIN_EVIDENCE_COUNTS = {
    "account_holder": 1,
    "policy": 1,
    "inventory_item": 1,
    "event": 1,
}

MIN_FILE_CONFIDENCE = 0.7
AI_HINTS = re.compile(r"(ai|ocr|parsed|summary|reconstructed|inferred|template)", re.I)
OFFICIAL_ISSUER_HINTS = re.compile(r"(police|sheriff|department|bank|statement|declaration|declarations|invoice|receipt|merchant)", re.I)

LEDGER_FILENAME = "ledger.json"

# -----------------------
# Utilities
# -----------------------

def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()

def file_mime(path: Path) -> str:
    t, _ = mimetypes.guess_type(str(path))
    return t or "application/octet-stream"

def now_ts() -> int:
    return int(time.time())

def read_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)

def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def encode_file_base64(path: Path) -> str:
    with path.open("rb") as f:
        return base64.b64encode(f.read()).decode('utf-8')

# -----------------------
# AI Extraction Logic
# -----------------------

def ai_extract_policy_clauses(file_path: Path, api_key: str) -> Dict[str, Any]:
    """
    Uses Gemini to extract structured policy clauses.
    Returns a dict with triggers, exclusions, conditions, limits.
    """
    if not HAS_GENAI:
        print("[AI] Skipping AI extraction (google-genai not installed).")
        return {}
    
    try:
        client = genai.Client(api_key=api_key)
        
        prompt = """
        Analyze this insurance policy document. Extract specific clauses and return them as concise lists of strings.
        
        Categories:
        1. Triggers: Covered perils (e.g., "Fire", "Theft", "Windstorm").
        2. Exclusions: What is NOT covered (e.g., "Flood", "Earthquake", "Intentional Acts").
        3. Conditions: Duties of the insured (e.g., "Notify police within 24 hours", "Mitigate damages").
        4. Limits: Special limits of liability (e.g., "$200 for money", "$1500 for jewelry").
        
        Return JSON object with these 4 keys.
        """
        
        with file_path.open("rb") as f:
            file_bytes = f.read()
            
        # Using Gemini 2.5 Flash for speed/efficiency
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[
                types.Content(
                    parts=[
                        types.Part(text=prompt),
                        types.Part(
                            inline_data=types.Blob(
                                mime_type=file_mime(file_path),
                                data=file_bytes
                            )
                        )
                    ]
                )
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=types.Schema(
                    type=types.Type.OBJECT,
                    properties={
                        "triggers": types.Schema(type=types.Type.ARRAY, items=types.Schema(type=types.Type.STRING)),
                        "exclusions": types.Schema(type=types.Type.ARRAY, items=types.Schema(type=types.Type.STRING)),
                        "conditions": types.Schema(type=types.Type.ARRAY, items=types.Schema(type=types.Type.STRING)),
                        "limits": types.Schema(type=types.Type.ARRAY, items=types.Schema(type=types.Type.STRING)),
                    }
                )
            )
        )
        
        if response.text:
            return json.loads(response.text)
        return {}

    except Exception as e:
        print(f"[AI] Extraction failed for {file_path.name}: {e}")
        return {}

# -----------------------
# Classification / Extraction
# -----------------------

def classify_evidence(path: Path, api_key: Optional[str] = None) -> Dict[str, Any]:
    p = str(path).lower()
    ext = path.suffix.lower()
    name = path.name
    confidence = 0.75
    
    # 1. Deterministic Classification
    if AI_HINTS.search(name) or "ai_derived" in p:
        evidence_class = "documents_ai_derived"
        provenance = "ai_generated"
        confidence = 0.6
    elif ext == ".pdf" and OFFICIAL_ISSUER_HINTS.search(name):
        evidence_class = "documents_original"
        provenance = "native"
        confidence = 0.95
    elif ext in {".jpg", ".jpeg", ".png", ".heic", ".tiff", ".webp"}:
        if "/evidence/scene" in p or "/events/" in p:
            evidence_class = "scene"
            provenance = "scanned_photo"
            confidence = 0.9
        elif "/items/" in p or "/inventories/" in p or "item" in name.lower():
            evidence_class = "items"
            provenance = "scanned_photo"
            confidence = 0.9
        elif any(x in name for x in ["statement", "policy", "declaration"]):
            evidence_class = "document_photos"
            provenance = "scanned_photo"
            confidence = 0.85
        else:
            evidence_class = "document_photos"
            provenance = "scanned_photo"
            confidence = 0.7
    elif ext in {".json", ".csv", ".tsv"}:
        evidence_class = "metadata"
        provenance = "extracted"
        confidence = 0.8
    else:
        if OFFICIAL_ISSUER_HINTS.search(name):
            evidence_class = "documents_original"
            provenance = "native"
            confidence = 0.85
        else:
            evidence_class = "metadata"
            provenance = "extracted"
            confidence = 0.6

    # 2. Basic Regex Extraction
    extracted = {}
    m = re.search(r"(\d{4}[-_]\d{2}[-_]\d{2})", name)
    if m: extracted["date"] = {"value": m.group(1).replace("_", "-"), "confidence": 0.9}
    
    m2 = re.search(r"\$?(\d{1,3}(?:[,\d]{0,3})?(?:\.\d{2})?)", name)
    if m2: extracted["amount"] = {"value": m2.group(1).replace(",", ""), "confidence": 0.6}

    # 3. AI Enhancement (If applicable and Key present)
    if api_key and evidence_class in ["documents_original", "document_photos"] and "policy" in str(path):
        print(f"[AI] Deep scanning {name}...")
        ai_data = ai_extract_policy_clauses(path, api_key)
        for key in ["triggers", "exclusions", "conditions", "limits"]:
            if key in ai_data and ai_data[key]:
                extracted[key] = {"value": ai_data[key], "confidence": 0.95}

    return {
        "evidence_class": evidence_class,
        "provenance_type": provenance,
        "confidence": round(confidence, 2),
        "extracted_fields": extracted,
    }

# -----------------------
# Ledger Logic
# -----------------------

def ledger_path_for_file(file_path: Path) -> Path:
    p = file_path
    parts = p.parts
    for i, part in enumerate(parts[::-1]):
        if re.match(r"(inv-|ah-|pol-|evt-)", part, re.I):
            idx = len(parts) - 1 - i
            return Path(*parts[: idx + 1]) / LEDGER_FILENAME
    return file_path.parent / LEDGER_FILENAME

def load_ledger(ledger_path: Path) -> Dict[str, Any]:
    if ledger_path.exists():
        try:
            return read_json(ledger_path)
        except Exception:
            return {}
    return {}

def update_ledger_for_file(file_path: Path, root: Path, api_key: Optional[str]) -> Dict[str, Any]:
    file_hash = sha256(file_path)
    lp = ledger_path_for_file(file_path)
    ledger = load_ledger(lp)
    entries = ledger.get("evidence", {})

    # skip if recently analyzed and hash matches? (Optimization)
    # For now, always re-analyze to allow "enhancing" existing entries
    
    cls = classify_evidence(file_path, api_key)
    
    entry = {
        "evidence_id": f"EVD-{file_hash[:10]}",
        "file_name": file_path.name,
        "file_path": str(file_path.relative_to(root)),
        "file_hash": file_hash,
        "mime": file_mime(file_path),
        "size": file_path.stat().st_size,
        "ingest_timestamp": now_ts(),
        "evidence_class": cls["evidence_class"],
        "provenance_type": cls["provenance_type"],
        "primary_weight": {
            "documents_original": 100,
            "document_photos": 70,
            "documents_ai_derived": 40,
            "metadata": 20,
            "scene": 50,
            "items": 60,
        }.get(cls["evidence_class"], 20),
        "confidence": cls["confidence"],
        "extracted_fields": cls["extracted_fields"],
        "is_primary_record": cls["confidence"] >= MIN_FILE_CONFIDENCE,
        "superseded_by": None,
    }

    entries[file_hash] = entry
    ledger["evidence"] = entries
    ledger["updated_at"] = now_ts()
    write_json(lp, ledger)
    return entry

# -----------------------
# Validation Logic
# -----------------------

def gather_claim_references(claim_folder: Path) -> Dict[str, Any]:
    claim_json = claim_folder / "claim.json"
    if not claim_json.exists():
        raise FileNotFoundError(f"Claim file not found: {claim_json}")
    claim = read_json(claim_json)
    return {
        "account_holder_id": claim.get("account_holder_id"),
        "policy_id": claim.get("policy_id"),
        "inventory_set_id": claim.get("inventory_set_id"),
        "inventory_ids": [ci.get("inventory_id") for ci in claim.get("claimed_items", [])],
        "event_id": claim.get("event_id"),
    }

def evidence_count_for_object(root: Path, object_type: str, object_id: str) -> int:
    if object_type == "account_holder": folder = root / "account_holders" / object_id
    elif object_type == "policy": folder = root / "policies" / object_id
    elif object_type == "event": folder = root / "events" / object_id
    elif object_type == "inventory_item":
        folder = None
        for p in root.glob("inventories/**/" + object_id):
            folder = p; break
        if not folder: return 0
    else: return 0

    ledger_file = folder / LEDGER_FILENAME
    if not ledger_file.exists(): return 0
    ledger = load_ledger(ledger_file)
    return len(ledger.get("evidence", {}))

def validate_claim(root: Path, claim_id: str) -> Dict[str, Any]:
    claim_folder = root / "claims" / claim_id
    try:
        refs = gather_claim_references(claim_folder)
    except FileNotFoundError:
        return {"error": "Claim not found"}

    report = { "claim_id": claim_id, "checked_at": now_ts(), "issues": [], "summary": {} }

    for obj_type, min_count in MIN_EVIDENCE_COUNTS.items():
        ref_key = f"{obj_type}_id"
        if obj_type == "inventory_item":
            # Handle list
            ids = refs.get("inventory_ids", [])
            report["summary"]["inventory_items"] = {}
            for iid in ids:
                cnt = evidence_count_for_object(root, obj_type, iid)
                report["summary"]["inventory_items"][iid] = cnt
                if cnt < min_count:
                    report["issues"].append({"object": obj_type, "id": iid, "issue": "insufficient_evidence", "required": min_count, "found": cnt})
        else:
            oid = refs.get(ref_key)
            if oid:
                cnt = evidence_count_for_object(root, obj_type, oid)
                report["summary"][f"{obj_type}_evidence_count"] = cnt
                if cnt < min_count:
                    report["issues"].append({"object": obj_type, "id": oid, "issue": "insufficient_evidence", "required": min_count, "found": cnt})
            else:
                report["issues"].append({"object": obj_type, "issue": "missing_reference"})

    report["status"] = "pass" if not report["issues"] else "fail"
    return report

# -----------------------
# Main
# -----------------------

def main():
    ap = argparse.ArgumentParser(description="Evidence Validation Engine")
    ap.add_argument("--root", required=True, help="Insurance_System root")
    ap.add_argument("--claim", required=False, help="Validate specific claim ID")
    ap.add_argument("--ingest-only", action="store_true")
    ap.add_argument("--api-key", required=False, help="Gemini API Key")
    args = ap.parse_args()

    root = Path(args.root)
    if not root.exists():
        raise SystemExit(f"Root not found: {root}")

    api_key = args.api_key or os.environ.get("API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key and HAS_GENAI:
        print("[Warning] No API Key found. AI features disabled.")

    print(f"[engine] Ingesting evidence from {root}...")
    
    # 1. Ingest
    patterns = [
        root / "account_holders" / "*" / "evidence" / "*",
        root / "policies" / "*" / "documents" / "*",
        root / "inventories" / "*" / "items" / "*" / "evidence" / "*",
        root / "events" / "*" / "evidence" / "*",
    ]
    
    count = 0
    for pat in patterns:
        for p in Path().glob(str(pat)):
            if p.is_file() and p.name != LEDGER_FILENAME:
                try:
                    update_ledger_for_file(p, root, api_key)
                    count += 1
                except Exception as e:
                    print(f"[Error] Failed to ingest {p}: {e}")
    
    print(f"[engine] Processed {count} files.")

    if args.ingest_only:
        return

    # 2. Validate
    if args.claim:
        print(f"[engine] Validating claim {args.claim}...")
        report = validate_claim(root, args.claim)
        out = root / "admin" / "reports" / f"compliance_report_{args.claim}.json"
        write_json(out, report)
        print(json.dumps(report, indent=2))

if __name__ == "__main__":
    main()
