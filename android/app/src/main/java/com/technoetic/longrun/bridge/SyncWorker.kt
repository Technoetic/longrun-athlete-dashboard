package com.technoetic.longrun.bridge

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.TimeUnit

class SyncWorker(
	context: Context,
	params: WorkerParameters,
) : CoroutineWorker(context, params) {

	override suspend fun doWork(): Result {
		val prefs = applicationContext.getSharedPreferences(
			"longrun",
			Context.MODE_PRIVATE,
		)
		var email = prefs.getString("email", "") ?: ""
		val cookie = prefs.getString("cookie", "") ?: ""

		// email 이 없지만 쿠키가 있으면 백엔드에서 email 재조회 (fallback)
		if (email.isBlank() && cookie.isNotBlank()) {
			email = fetchEmailWithCookie(cookie) ?: ""
			if (email.isNotBlank()) {
				prefs.edit().putString("email", email).apply()
			}
		}

		if (email.isBlank()) return Result.failure()

		val msg = HealthBridge.syncOnce(applicationContext, email)
		val ok = msg.startsWith("OK") || msg.startsWith("SKIP")
		val failStreak = if (ok) 0 else prefs.getInt("fail_streak", 0) + 1
		prefs.edit()
			.putString("last_sync_result", msg)
			.putLong("last_sync_at", System.currentTimeMillis())
			.putInt("fail_streak", failStreak)
			.apply()
		android.util.Log.d("LongRun", "periodic sync: $msg (streak=$failStreak)")

		// 연속 3회 실패 시 알림
		if (failStreak == 3) notifyFailure(applicationContext, msg)

		return if (ok) Result.success() else Result.retry()
	}

	private fun notifyFailure(context: Context, msg: String) {
		if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
			val granted = ContextCompat.checkSelfPermission(
				context,
				"android.permission.POST_NOTIFICATIONS",
			) == PackageManager.PERMISSION_GRANTED
			if (!granted) return
		}
		val nm = context.getSystemService(Context.NOTIFICATION_SERVICE)
			as NotificationManager
		if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
			val channel = NotificationChannel(
				CHANNEL_ID,
				"LongRun 동기화",
				NotificationManager.IMPORTANCE_DEFAULT,
			)
			nm.createNotificationChannel(channel)
		}
		val launch = Intent(context, WebActivity::class.java).apply {
			flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
		}
		val pi = PendingIntent.getActivity(
			context,
			0,
			launch,
			PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
		)
		val notif = NotificationCompat.Builder(context, CHANNEL_ID)
			.setSmallIcon(android.R.drawable.stat_notify_sync_noanim)
			.setContentTitle("LongRun 동기화 실패")
			.setContentText(msg.take(80))
			.setStyle(NotificationCompat.BigTextStyle().bigText(msg))
			.setContentIntent(pi)
			.setAutoCancel(true)
			.build()
		try {
			NotificationManagerCompat.from(context).notify(NOTIF_ID, notif)
		} catch (_: SecurityException) {
			// 알림 권한 거부된 경우 조용히 무시
		}
	}

	private fun fetchEmailWithCookie(cookie: String): String? {
		return try {
			val url = URL("${HealthBridge.BACKEND}/api/user/me")
			val conn = url.openConnection() as HttpURLConnection
			conn.requestMethod = "GET"
			conn.setRequestProperty("Cookie", cookie)
			conn.connectTimeout = 10000
			conn.readTimeout = 10000
			if (conn.responseCode != 200) {
				conn.disconnect()
				return null
			}
			val body = conn.inputStream.bufferedReader().use { it.readText() }
			conn.disconnect()
			val json = JSONObject(body)
			if (json.has("email") && !json.isNull("email")) json.getString("email") else null
		} catch (_: Exception) {
			null
		}
	}

	companion object {
		const val NAME = "longrun-sync"
		const val CHANNEL_ID = "longrun-sync-failure"
		const val NOTIF_ID = 4201

		fun enqueue(context: Context) {
			val req = PeriodicWorkRequestBuilder<SyncWorker>(
				15, TimeUnit.MINUTES,
			)
				.setConstraints(
					Constraints.Builder()
						.setRequiredNetworkType(NetworkType.CONNECTED)
						.build(),
				)
				.build()
			WorkManager.getInstance(context).enqueueUniquePeriodicWork(
				NAME,
				ExistingPeriodicWorkPolicy.UPDATE,
				req,
			)
		}

		fun cancel(context: Context) {
			WorkManager.getInstance(context).cancelUniqueWork(NAME)
		}
	}
}
