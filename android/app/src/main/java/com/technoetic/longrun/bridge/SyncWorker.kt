package com.technoetic.longrun.bridge

import android.content.Context
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
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
		val email = prefs.getString("email", "") ?: ""
		if (email.isBlank()) return Result.failure()

		val msg = HealthBridge.syncOnce(applicationContext, email)
		prefs.edit()
			.putString("last_sync_result", msg)
			.putLong("last_sync_at", System.currentTimeMillis())
			.apply()

		return if (msg.startsWith("OK") || msg.startsWith("SKIP")) {
			Result.success()
		} else {
			Result.retry()
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
