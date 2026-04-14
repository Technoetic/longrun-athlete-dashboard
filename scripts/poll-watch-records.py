import os
import time
import pymysql

url = os.environ["DATABASE_URL"]
body = url.split("://", 1)[1]
auth, hostdb = body.split("@", 1)
u, p = auth.split(":", 1)
hp, db = hostdb.rsplit("/", 1)
h, pt = hp.split(":")

print("폴링 시작 (최대 120초). 폰에서 LongRun 앱 조작하세요.")
print("  login → 홈 → Health Connect 권한 허용\n")

deadline = time.time() + 120
last_count = -1
while time.time() < deadline:
    conn = pymysql.connect(
        host=h,
        port=int(pt),
        user=u,
        password=p,
        database=db,
        charset="utf8mb4",
    )
    try:
        with conn.cursor() as c:
            c.execute("SELECT COUNT(*) FROM watch_records")
            count = c.fetchone()[0]
            if count != last_count:
                ts = time.strftime("%H:%M:%S")
                print(f"[{ts}] watch_records count = {count}")
                if count > 0:
                    c.execute(
                        "SELECT id, user_id, heart_rate, resting_heart_rate, hrv, blood_oxygen, steps, sleep_hours, created_at FROM watch_records ORDER BY id DESC LIMIT 3"
                    )
                    for r in c.fetchall():
                        print("  row:", r)
                last_count = count
    finally:
        conn.close()
    if last_count > 0:
        print("\n✓ 데이터 수신 확인. 종료.")
        break
    time.sleep(2)
else:
    print("\n⏱ 120초 내 수신 없음.")
