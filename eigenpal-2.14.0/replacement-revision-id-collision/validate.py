#!/usr/bin/env python3
import json
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
with zipfile.ZipFile(Path(__file__).with_name("actual.docx")) as archive:
    xml = archive.read("word/document.xml")
root = ET.fromstring(xml)
revisions = []
for element in root.iter():
    if element.tag not in (W + "ins", W + "del") or element.get(W + "author") != "Test Author":
        continue
    revisions.append({
        "kind": element.tag.split("}")[-1],
        "id": element.get(W + "id"),
        "text": "".join(node.text or "" for node in element.iter() if node.tag in (W + "t", W + "delText")),
    })
ids = {}
for revision in revisions:
    ids.setdefault(revision["id"], []).append(revision["kind"])
collisions = [{"id": key, "owners": owners} for key, owners in ids.items() if len(owners) > 1]
reproduced = any(sorted(item["owners"]) == ["del", "ins"] for item in collisions)
result = {
    "expected": "A tracked replacement uses distinct unique w:id values for its insertion and deletion, matching Word-authored replacement output.",
    "actual": "The replacement insertion and deletion share one w:id.",
    "revisions": revisions,
    "revisionIdCollisions": collisions,
    "defectReproduced": reproduced,
}
Path(__file__).with_name("validation.json").write_text(json.dumps(result, indent=2) + "\n")
Path(__file__).with_name("result.json").write_text(json.dumps(result, indent=2) + "\n")
Path(__file__).with_name("relevant-document.xml").write_bytes(xml)
print(json.dumps(result, indent=2))
raise SystemExit(0 if reproduced else 1)
