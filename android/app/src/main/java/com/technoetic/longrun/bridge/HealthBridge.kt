package com.technoetic.longrun.bridge

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.OxygenSaturationRecord
import androidx.health.connect.client.records.RestingHeartRateRecord
import androidx.health.connect.client.records.HeartRateVariabilityRmssdRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.records.DistanceRecord
import androidx.health.connect.client.records.ActiveCaloriesBurnedRecord
import androidx.health.connect.client.records.TotalCaloriesBurnedRecord
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.time.Duration
import java.time.Instant

object HealthBridge {

	private val syncMutex = Mutex()

	const val BACKEND =
		"https://longrun-coach-dashboard-production.up.railway.app"

	val PERMISSIONS = setOf(
		HealthPermission.getReadPermission(HeartRateRecord::class),
		HealthPermission.getReadPermission(RestingHeartRateRecord::class),
		HealthPermission.getReadPermission(HeartRateVariabilityRmssdRecord::class),
		HealthPermission.getReadPermission(OxygenSaturationRecord::class),
		HealthPermission.getReadPermission(StepsRecord::class),
		HealthPermission.getReadPermission(DistanceRecord::class),
		HealthPermission.getReadPermission(ActiveCaloriesBurnedRecord::class),
		HealthPermission.getReadPermission(TotalCaloriesBurnedRecord::class),
		HealthPermission.getReadPermission(ExerciseSessionRecord::class),
		HealthPermission.getReadPermission(SleepSessionRecord::class),
		// Android 14+: 백그라운드 (잠금/WorkManager) 에서 Health Connect 읽기
		HealthPermission.PERMISSION_READ_HEALTH_DATA_IN_BACKGROUND,
	)

	fun availability(context: Context): Int =
		HealthConnectClient.getSdkStatus(context)

	fun client(context: Context): HealthConnectClient =
		HealthConnectClient.getOrCreate(context)

	suspend fun hasAllPermissions(context: Context): Boolean {
		val granted = client(context).permissionController.getGrantedPermissions()
		return granted.containsAll(PERMISSIONS)
	}

	/**
	 * 최근 24시간 Health Connect 데이터를 읽어 /api/watch-data 로 POST.
	 * 성공: "OK — hr=.. spo2=.. steps=..", 실패: 에러 문자열
	 */
	suspend fun syncOnce(context: Context, email: String): String = syncMutex.withLock {
		if (email.isBlank()) return@withLock "FAIL: 계정 저장 필요"

		val client = client(context)
		val end = Instant.now()
		val start = end.minus(Duration.ofHours(24))
		val range = TimeRangeFilter.between(start, end)

		val payload = JSONObject()
		payload.put("email", email)

		try {
			val hr = client.readRecords(
				ReadRecordsRequest(HeartRateRecord::class, range),
			).records
			val latestHrSample = hr
				.flatMap { it.samples }
				.maxByOrNull { it.time }
			if (latestHrSample != null) {
				val ageMin = Duration.between(latestHrSample.time, end).toMinutes()
				payload.put("heart_rate", latestHrSample.beatsPerMinute)
				payload.put("heart_rate_age_min", ageMin)
			}

			val rhr = client.readRecords(
				ReadRecordsRequest(RestingHeartRateRecord::class, range),
			).records
			val latestRhr = rhr.lastOrNull()?.beatsPerMinute
			if (latestRhr != null) payload.put("resting_heart_rate", latestRhr)

			val hrv = client.readRecords(
				ReadRecordsRequest(HeartRateVariabilityRmssdRecord::class, range),
			).records
			val latestHrv = hrv.lastOrNull()?.heartRateVariabilityMillis
			if (latestHrv != null) payload.put("hrv", latestHrv)

			val spo2 = client.readRecords(
				ReadRecordsRequest(OxygenSaturationRecord::class, range),
			).records
			val latestSpo2 = spo2.lastOrNull()?.percentage?.value
			if (latestSpo2 != null) payload.put("blood_oxygen", latestSpo2)

			val steps = client.readRecords(
				ReadRecordsRequest(StepsRecord::class, range),
			).records.sumOf { it.count }
			if (steps > 0) payload.put("steps", steps)

			val distance = client.readRecords(
				ReadRecordsRequest(DistanceRecord::class, range),
			).records.sumOf { it.distance.inKilometers }
			if (distance > 0) payload.put("distance_km", distance)

			val activeCal = client.readRecords(
				ReadRecordsRequest(ActiveCaloriesBurnedRecord::class, range),
			).records.sumOf { it.energy.inKilocalories }
			if (activeCal > 0) payload.put("active_calories", activeCal)

			val totalCal = client.readRecords(
				ReadRecordsRequest(TotalCaloriesBurnedRecord::class, range),
			).records.sumOf { it.energy.inKilocalories }
			if (totalCal > 0 && totalCal > activeCal) {
				payload.put("basal_calories", totalCal - activeCal)
			}

			val exercise = client.readRecords(
				ReadRecordsRequest(ExerciseSessionRecord::class, range),
			).records
			val exerciseMinutes = exercise.sumOf {
				Duration.between(it.startTime, it.endTime).toMinutes()
			}
			if (exerciseMinutes > 0) payload.put("exercise_minutes", exerciseMinutes)

			val sleep = client.readRecords(
				ReadRecordsRequest(SleepSessionRecord::class, range),
			).records
			val sleepHours = sleep.sumOf {
				Duration.between(it.startTime, it.endTime).toMinutes()
			} / 60.0
			if (sleepHours > 0) payload.put("sleep_hours", sleepHours)
		} catch (e: SecurityException) {
			return@withLock "FAIL: 권한 거부 — ${e.message}"
		} catch (e: Exception) {
			return@withLock "FAIL: Health Connect 읽기 실패 — ${e.javaClass.simpleName}: ${e.message}"
		}

		// Phase 1 M4: IDO BLE direct fetch. Supplements Health Connect with fields
		// VoiceCaddie Runner never writes (resting HR, up-to-the-minute steps/kcal).
		// Non-blocking contract: IDO failures must not fail the whole sync.
		val prefs = context.getSharedPreferences("longrun", Context.MODE_PRIVATE)
		val idoMac = prefs.getString("ido_mac", null) ?: "1F:0F:C7:77:05:66"
		try {
			val fetch = IdoBleClient(context).fetchDaily(idoMac)
			val ido = fetch.summary
			val hr = fetch.hrStream
			android.util.Log.d(
				"LongRun",
				"IDO daily=${ido?.let { "${it.isoDate()} steps=${it.steps} rhr=${it.restingHeartRate}" } ?: "null"} " +
					"stream=${hr?.let { "n=${it.sampleCount} max=${it.maxBpm} avg=${it.avgBpm} latest=${it.latestBpm}" } ?: "null"}",
			)
			if (ido != null) {
				// R21 워치 실측값이 우선 (LongRun은 R21 생태계 대시보드).
				ido.steps?.let { payload.put("steps", it) }
				ido.distanceMeters?.let { payload.put("distance_km", it / 1000.0) }
				ido.exerciseMinutes?.let { payload.put("exercise_minutes", it) }
				ido.activeCalories?.let { payload.put("active_calories", it) }
				ido.restingHeartRate?.let {
					payload.put("resting_heart_rate", it)
				}
			}
			// HR stream 이 있으면 그게 가장 신선한 live HR이므로 heart_rate를 여기서 결정.
			// Phase 3-A: heart_rate_max/avg/samples_count 컬럼이 DB에 추가됐으므로 함께 저장.
			if (hr != null) {
				payload.put("heart_rate", hr.latestBpm)
				payload.put("heart_rate_age_min", 0)
				payload.put("heart_rate_max", hr.maxBpm)
				payload.put("heart_rate_avg", hr.avgBpm)
				payload.put("heart_rate_samples_count", hr.sampleCount)
			} else if (ido?.restingHeartRate != null) {
				// Fallback: daily summary's rhr if HR stream missing.
				payload.put("heart_rate", ido.restingHeartRate)
				payload.put("heart_rate_age_min", 0)
			}
		} catch (e: Exception) {
			android.util.Log.w("LongRun", "IDO fetch threw: ${e.javaClass.simpleName}: ${e.message}")
		}

		val size = payload.length()
		if (size <= 1) return@withLock "SKIP: 최근 24h 데이터 없음"

		try {
			postJson("$BACKEND/api/watch-data", payload.toString())
		} catch (e: Exception) {
			"FAIL: POST 실패 — ${e.javaClass.simpleName}: ${e.message}"
		}
	}

	private fun postJson(urlStr: String, body: String): String {
		val url = URL(urlStr)
		val conn = url.openConnection() as HttpURLConnection
		conn.requestMethod = "POST"
		conn.doOutput = true
		conn.setRequestProperty("Content-Type", "application/json")
		conn.connectTimeout = 10000
		conn.readTimeout = 10000
		conn.outputStream.use { it.write(body.toByteArray()) }
		val code = conn.responseCode
		val resp = try {
			(if (code in 200..299) conn.inputStream else conn.errorStream)
				.bufferedReader().use { it.readText() }
		} catch (_: Exception) { "" }
		conn.disconnect()
		return if (code in 200..299) {
			"OK $code — ${resp.take(200)}"
		} else {
			"FAIL $code — ${resp.take(200)}"
		}
	}
}
