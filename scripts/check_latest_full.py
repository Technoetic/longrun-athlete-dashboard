import os, pymysql
url = os.environ['DATABASE_URL']
body = url.split('://', 1)[1]
auth, hostdb = body.split('@', 1)
u, p = auth.split(':', 1)
hp, db = hostdb.rsplit('/', 1)
h, pt = hp.split(':')
conn = pymysql.connect(host=h, port=int(pt), user=u, password=p, database=db, charset='utf8mb4')
with conn.cursor() as c:
    c.execute("""
        SELECT id, heart_rate, resting_heart_rate, steps, distance_km,
               active_calories, basal_calories, exercise_minutes, created_at
        FROM watch_records WHERE user_id=39 ORDER BY id DESC LIMIT 5
    """)
    rows = c.fetchall()
    print("id | hr | rhr | steps | dist_km | active_cal | basal_cal | ex_min | at")
    for r in rows:
        print(" | ".join(str(x) for x in r))
conn.close()
