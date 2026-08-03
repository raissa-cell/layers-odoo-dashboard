"""READ-ONLY: valida o funil de pre-vendas por SDR (Luanna=103, Douglas=104)."""
import os
import xmlrpc.client
import json


def load_env(path=".env.local"):
    env = {}
    base = os.path.dirname(os.path.abspath(__file__))
    with open(os.path.join(base, path), "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, _, v = line.partition("=")
            k, v = k.strip(), v.strip()
            if len(v) >= 2 and v[0] == v[-1] and v[0] in ("'", '"'):
                v = v[1:-1]
            env[k] = v
    return env


env = load_env()
URL, DB, USER, KEY = env["ODOO_URL"], env["ODOO_DB"], env["ODOO_USER"], env["ODOO_API_KEY"]
common = xmlrpc.client.ServerProxy(f"{URL}/xmlrpc/2/common")
uid = common.authenticate(DB, USER, KEY, {})
models = xmlrpc.client.ServerProxy(f"{URL}/xmlrpc/2/object")


def call(model, method, args, kwargs=None):
    return models.execute_kw(DB, uid, KEY, model, method, args, kwargs or {})


SDRS = {103: "Luanna", 104: "Douglas"}

print("=== Total de leads com SDR preenchido ===")
total = call("crm.lead", "search_count", [[["sdr_id", "!=", False]]])
print("Total:", total)

print("\n=== Leads por SDR ===")
grp = call("crm.lead", "read_group",
           [[["sdr_id", "in", list(SDRS)]]],
           {"fields": ["sdr_id"], "groupby": ["sdr_id"]})
print(json.dumps(grp, indent=2, ensure_ascii=False))

print("\n=== Funil: por SDR x stage ===")
grp2 = call("crm.lead", "read_group",
            [[["sdr_id", "in", list(SDRS)]]],
            {"fields": ["sdr_id"], "groupby": ["sdr_id", "stage_id"], "lazy": False})
for row in grp2:
    sdr = row.get("sdr_id")
    stage = row.get("stage_id")
    print(f"  SDR={sdr[1] if sdr else '-':25} stage={stage[1] if stage else '-':25} count={row['__count']}")

print("\n=== Reunioes: agendadas (com data) x realizadas (check-in) por SDR ===")
for sid, sname in SDRS.items():
    agendadas = call("crm.lead", "search_count", [[["sdr_id", "=", sid], ["sdr_meeting_start", "!=", False]]])
    realizadas = call("crm.lead", "search_count", [[["sdr_id", "=", sid], ["sdr_meeting_attended", "=", True]]])
    print(f"  {sname:10} agendadas={agendadas:5}  realizadas(check-in)={realizadas}")
