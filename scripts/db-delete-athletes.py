import os
import sys

import pymysql

url = os.environ.get("DATABASE_URL", "")
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
    with conn.cursor() as c:
        c.execute(
            "SELECT id, name FROM users WHERE role='athlete' OR role IS NULL ORDER BY id"
        )
        targets = c.fetchall()
        print(f"삭제 대상 athlete: {len(targets)}")
        for t in targets:
            print(f"  id={t[0]} name={t[1]}")

        ids = [t[0] for t in targets]
        if not ids:
            print("대상 없음")
            sys.exit(0)
        id_list = ",".join(str(i) for i in ids)

        # Child tables with ON DELETE CASCADE will auto-delete,
        # but messages references both sender_id and receiver_id;
        # parent_children references parent_id and child_id.
        # We delete explicitly to be safe regardless of FK config.
        child_tables = [
            ("conditions", "user_id"),
            ("menstrual_cycles", "user_id"),
            ("workouts", "user_id"),
            ("injuries", "user_id"),
            ("todos", "user_id"),
            ("notification_settings", "user_id"),
            ("watch_records", "user_id"),
            ("training_logs", "user_id"),
            ("schedules", "user_id"),
        ]
        for table, col in child_tables:
            try:
                c.execute(f"DELETE FROM {table} WHERE {col} IN ({id_list})")
                print(f"  {table}: -{c.rowcount}")
            except Exception as e:
                print(f"  {table}: skip ({e})")

        for col_a, col_b in [("sender_id", "receiver_id"), ("receiver_id", None)]:
            if col_b:
                continue
        try:
            c.execute(
                f"DELETE FROM messages WHERE sender_id IN ({id_list}) OR receiver_id IN ({id_list})"
            )
            print(f"  messages: -{c.rowcount}")
        except Exception as e:
            print(f"  messages: skip ({e})")

        try:
            c.execute(
                f"DELETE FROM parent_children WHERE parent_id IN ({id_list}) OR child_id IN ({id_list})"
            )
            print(f"  parent_children: -{c.rowcount}")
        except Exception as e:
            print(f"  parent_children: skip ({e})")

        c.execute(f"DELETE FROM users WHERE id IN ({id_list})")
        print(f"  users: -{c.rowcount}")

    conn.commit()
    print("commit OK")

    with conn.cursor() as c:
        c.execute("SELECT COUNT(*) FROM users WHERE role='athlete' OR role IS NULL")
        remaining = c.fetchone()[0]
        print(f"남은 athlete: {remaining}")
        c.execute("SELECT id, email, name, role FROM users ORDER BY id")
        print("\n남은 전체 유저:")
        for r in c.fetchall():
            print(f"  {r}")
finally:
    conn.close()
