import os
import sys

import pymysql

url = os.environ.get("DATABASE_URL", "")
# mysql+pymysql://user:pass@host:port/dbname
if not url.startswith("mysql"):
    print("DATABASE_URL 필요", file=sys.stderr)
    sys.exit(1)

body = url.split("://", 1)[1]
auth, host_db = body.split("@", 1)
user, password = auth.split(":", 1)
host_port, dbname = host_db.rsplit("/", 1)
host, port = host_port.split(":")

conn = pymysql.connect(
    host=host,
    port=int(port),
    user=user,
    password=password,
    database=dbname,
    charset="utf8mb4",
)

try:
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM users")
        total = cur.fetchone()[0]
        print(f"total users: {total}")
        print()
        cur.execute(
            "SELECT id, email, name, role, sport, team_code, player_code, created_at FROM users ORDER BY id"
        )
        rows = cur.fetchall()
        print(f"{'id':>4} {'email':<40} {'name':<12} {'role':<8} {'sport':<12} {'team':<10} {'player_code':<10} created_at")
        print("-" * 130)
        for r in rows:
            id_, email, name, role, sport, team_code, player_code, created = r
            print(
                f"{id_:>4} {str(email)[:40]:<40} {str(name)[:12]:<12} "
                f"{str(role)[:8]:<8} {str(sport or '-')[:12]:<12} "
                f"{str(team_code or '-')[:10]:<10} {str(player_code or '-')[:10]:<10} {created}"
            )
finally:
    conn.close()
