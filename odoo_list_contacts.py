"""Conecta na API do Odoo (XML-RPC) e lista os 10 primeiros contatos.

Le as credenciais do arquivo .env.local (mesma pasta), sem dependencias externas.
"""
import os
import xmlrpc.client


def load_env(path=".env.local"):
    """Parser simples de .env: ignora comentarios e remove aspas dos valores."""
    env = {}
    base = os.path.dirname(os.path.abspath(__file__))
    full = os.path.join(base, path)
    with open(full, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            key = key.strip()
            value = value.strip()
            if len(value) >= 2 and value[0] == value[-1] and value[0] in ("'", '"'):
                value = value[1:-1]
            env[key] = value
    return env


def main():
    env = load_env()
    ODOO_URL = env["ODOO_URL"]
    ODOO_DB = env["ODOO_DB"]
    ODOO_USER = env["ODOO_USER"]
    ODOO_API_KEY = env["ODOO_API_KEY"]

    # Autenticacao
    common = xmlrpc.client.ServerProxy(f"{ODOO_URL}/xmlrpc/2/common")
    uid = common.authenticate(ODOO_DB, ODOO_USER, ODOO_API_KEY, {})
    if not uid:
        raise SystemExit("Falha na autenticacao: verifique DB, usuario e API key.")
    print(f"Autenticado com sucesso (uid={uid})\n")

    # Consulta res.partner
    models = xmlrpc.client.ServerProxy(f"{ODOO_URL}/xmlrpc/2/object")
    contatos = models.execute_kw(
        ODOO_DB, uid, ODOO_API_KEY,
        "res.partner", "search_read",
        [[]],
        {"fields": ["id", "name", "email", "phone", "city"], "limit": 10, "order": "id asc"},
    )

    print(f"{'ID':<6} {'Nome':<35} {'Email':<35} {'Telefone':<18} {'Cidade'}")
    print("-" * 120)
    for c in contatos:
        print(
            f"{c.get('id',''):<6} "
            f"{str(c.get('name') or ''):<35} "
            f"{str(c.get('email') or ''):<35} "
            f"{str(c.get('phone') or ''):<18} "
            f"{str(c.get('city') or '')}"
        )


if __name__ == "__main__":
    main()
