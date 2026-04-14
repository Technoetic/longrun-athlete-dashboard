package com.technoetic.longrun.bridge

import android.content.Context
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
		prefs.edit()
			.putString("last_sync_result", msg)
			.putLong("last_sync_at", System.currentTimeMillis())
			.apply()
		android.util.Log.d("LongRun", "periodic sync: $msg")

		return if (msg.startsWith("OK") || msg.startsWith("SKIP")) {
			Result.success()
		} else {
			Result.retry()
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
			JSONObject(body).optString("email", null as String?)
		} catch (_: Exception) {
			null
		}
	}

	companion object {
		const val NAME = "longrun-sync"

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
