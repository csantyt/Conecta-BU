import json
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DB = Path.home() / ".n8n" / "database.sqlite"
PROJECT_ID = "TFi795aiZSSKgaHH"
AUTHOR = "carlos.torres.c@uniautonoma.edu.co"
USER_ID = "67fef3bb-3ac7-4ab4-9c38-d43d505daaa7"


def now():
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S.000")


def workflow(name: str, path: str, code_file: str):
    version_id = str(uuid.uuid4())
    workflow_id = str(uuid.uuid4())
    webhook_id = str(uuid.uuid4())
    code = (ROOT / code_file).read_text(encoding="utf-8")
    nodes = [
        {
            "parameters": {
                "httpMethod": "POST",
                "path": path,
                "responseMode": "lastNode",
                "options": {},
            },
            "id": str(uuid.uuid4()),
            "name": "Webhook",
            "type": "n8n-nodes-base.webhook",
            "typeVersion": 2.1,
            "position": [260, 300],
            "webhookId": webhook_id,
        },
        {
            "parameters": {"jsCode": code},
            "id": str(uuid.uuid4()),
            "name": "Asistente",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [540, 300],
        },
    ]
    connections = {
        "Webhook": {
            "main": [[{"node": "Asistente", "type": "main", "index": 0}]]
        }
    }
    settings = {"executionOrder": "v1"}
    return {
        "id": workflow_id,
        "versionId": version_id,
        "name": name,
        "path": path,
        "webhookId": webhook_id,
        "nodes": json.dumps(nodes, ensure_ascii=False),
        "connections": json.dumps(connections, ensure_ascii=False),
        "settings": json.dumps(settings),
    }


def upsert(cur, wf):
    existing = cur.execute(
        "SELECT id, versionId FROM workflow_entity WHERE name = ?",
        (wf["name"],),
    ).fetchone()
    stamp = now()
    if existing:
        workflow_id, old_version = existing
        cur.execute("DELETE FROM webhook_entity WHERE workflowId = ?", (workflow_id,))
        cur.execute("DELETE FROM workflow_published_version WHERE workflowId = ?", (workflow_id,))
        cur.execute(
            "UPDATE workflow_entity SET activeVersionId = NULL WHERE id = ?",
            (workflow_id,),
        )
        cur.execute("DELETE FROM workflow_history WHERE workflowId = ?", (workflow_id,))
        wf["id"] = workflow_id
        wf["versionId"] = str(uuid.uuid4())

    cur.execute(
        """
        INSERT INTO workflow_entity (
          id, name, active, nodes, connections, settings, staticData, pinData,
          versionId, triggerCount, meta, isArchived, versionCounter, description,
          activeVersionId, nodeGroups, createdAt, updatedAt
        ) VALUES (?, ?, 1, ?, ?, ?, '{}', '{}', ?, 1, '{}', 0, 1, ?, NULL, '[]', ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name=excluded.name,
          active=1,
          nodes=excluded.nodes,
          connections=excluded.connections,
          settings=excluded.settings,
          versionId=excluded.versionId,
          triggerCount=1,
          updatedAt=excluded.updatedAt
        """,
        (
            wf["id"],
            wf["name"],
            wf["nodes"],
            wf["connections"],
            wf["settings"],
            wf["versionId"],
            "Webhook de Conecta BU",
            stamp,
            stamp,
        ),
    )
    cur.execute(
        """
        INSERT INTO workflow_history (
          versionId, workflowId, authors, nodes, connections, name, autosaved,
          description, nodeGroups, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, '[]', ?, ?)
        """,
        (
            wf["versionId"],
            wf["id"],
            AUTHOR,
            wf["nodes"],
            wf["connections"],
            wf["name"],
            "Webhook de Conecta BU",
            stamp,
            stamp,
        ),
    )
    cur.execute(
        "UPDATE workflow_entity SET activeVersionId = ?, versionId = ? WHERE id = ?",
        (wf["versionId"], wf["versionId"], wf["id"]),
    )
    cur.execute(
        """
        INSERT INTO workflow_published_version (workflowId, publishedVersionId, createdAt, updatedAt)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(workflowId) DO UPDATE SET
          publishedVersionId=excluded.publishedVersionId,
          updatedAt=excluded.updatedAt
        """,
        (wf["id"], wf["versionId"], stamp, stamp),
    )
    cur.execute(
        """
        INSERT INTO shared_workflow (workflowId, projectId, role, createdAt, updatedAt)
        VALUES (?, ?, 'workflow:owner', ?, ?)
        ON CONFLICT(workflowId, projectId) DO UPDATE SET updatedAt=excluded.updatedAt
        """,
        (wf["id"], PROJECT_ID, stamp, stamp),
    )
    cur.execute(
        """
        INSERT INTO webhook_entity (workflowId, webhookPath, method, node, webhookId, pathLength)
        VALUES (?, ?, 'POST', 'Webhook', ?, 1)
        """,
        (wf["id"], wf["path"], wf["webhookId"]),
    )
    cur.execute(
        """
        INSERT INTO workflow_publish_history (workflowId, versionId, event, userId, createdAt)
        VALUES (?, ?, 'activated', ?, ?)
        """,
        (wf["id"], wf["versionId"], USER_ID, stamp),
    )


def main():
    con = sqlite3.connect(DB, timeout=30)
    cur = con.cursor()
    workflows = [
        workflow("Conecta BU Orientacion", "conecta-bu-orientacion", "code-orientacion.js"),
        workflow(
            "Conecta BU Recomendaciones",
            "conecta-bu-recomendaciones",
            "code-recomendaciones.js",
        ),
    ]
    for wf in workflows:
        upsert(cur, wf)
        print("OK", wf["name"], wf["path"])
    con.commit()
    con.close()


if __name__ == "__main__":
    main()
