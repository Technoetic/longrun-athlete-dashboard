import os, pymysql
url = os.environ['DATABASE_URL']
body = url.split('://', 1)[1]
auth, hostdb = body.split('@', 1)
u, p = auth.split(':', 1)
hp, db = hostdb.rsplit('/', 1)
h, pt = hp.split(':')
c = pymysql.connect(host=h, port=int(pt), user=u, password=p, database=db, charset='utf8mb4')
with c.cursor() as cur:
    cur.execute("""
        SELECT id, heart_rate, resting_heart_rate,
               heart_rate_max, heart_rate_avg, heart_rate_samples_count,
               created_at
        FROM watch_records WHERE user_id=39 ORDER BY id DESC LIMIT 5
    """)
    print("id | hr | rhr | max | avg | samples | at")
    for r in cur.fetchall():
        print(" | ".join(str(x) for x in r))
c.close()
