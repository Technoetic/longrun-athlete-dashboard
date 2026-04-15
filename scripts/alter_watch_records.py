"""Add new columns to watch_records for Phase 2-C HR stream stats."""
import os, pymysql

url = os.environ['DATABASE_URL']
body = url.split('://', 1)[1]
auth, hostdb = body.split('@', 1)
u, p = auth.split(':', 1)
hp, db = hostdb.rsplit('/', 1)
h, pt = hp.split(':')
conn = pymysql.connect(host=h, port=int(pt), user=u, password=p, database=db, charset='utf8mb4')

try:
    with conn.cursor() as c:
        # Check existing columns
        c.execute("SHOW COLUMNS FROM watch_records")
        existing = {row[0] for row in c.fetchall()}
        print(f"existing columns: {len(existing)}")
        print(f"heart_rate_max present: {'heart_rate_max' in existing}")

        additions = [
            ("heart_rate_max", "FLOAT NULL"),
            ("heart_rate_avg", "FLOAT NULL"),
            ("heart_rate_samples_count", "INT NULL"),
        ]
        for col, ddl in additions:
            if col in existing:
                print(f"  skip {col} (exists)")
                continue
            sql = f"ALTER TABLE watch_records ADD COLUMN {col} {ddl}"
            print(f"  running: {sql}")
            c.execute(sql)
        conn.commit()

        # Verify
        c.execute("SHOW COLUMNS FROM watch_records")
        after = [row[0] for row in c.fetchall()]
        new_cols = [col for col, _ in additions if col in after]
        print(f"\nresult: columns added = {new_cols}")
finally:
    conn.close()
