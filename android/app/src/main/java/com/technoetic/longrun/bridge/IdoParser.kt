package com.technoetic.longrun.bridge

/**
 * Parsers for IDO v3 HEALTH_DATA responses.
 *
 * Structure facts derived from Phase 1 M3β live capture of NURUN R21
 * (firmware v1.00.36) on 2026-04-15. See step_archive/ido_research/PHASE_0_REPORT.md.
 */
object IdoParser {

	/** Daily summary returned by health query category 0x08. */
	data class DailySummary(
		val year: Int,
		val month: Int,
		val day: Int,
		val steps: Int?,
		val distanceMeters: Int?,
		val exerciseMinutes: Int?,
		val activeCalories: Int?,
		val restingHeartRate: Int?,
	) {
		fun isoDate(): String = "%04d-%02d-%02d".format(year, month, day)
	}

	/**
	 * Parse the first 64 bytes of a cat=0x08 response. Returns null if the frame is
	 * too short or the magic/cmd bytes don't match. Treats all metric fields as
	 * optional — individual fields return null if clearly out of range.
	 */
	fun parseDailySummary(frame: ByteArray): DailySummary? {
		if (frame.size < 56) return null
		// magic check
		if (frame[0] != 0x33.toByte() || frame[1] != 0xDA.toByte() ||
			frame[2] != 0xAD.toByte() || frame[3] != 0xDA.toByte() ||
			frame[4] != 0xAD.toByte()
		) return null
		// cmd=0x04 sub=0x00
		if (frame[8] != 0x04.toByte() || frame[9] != 0x00.toByte()) return null
		// echo payload[13] should be category 0x08
		if (frame[13] != 0x08.toByte()) return null

		// Date at offset 27..30: year LE16, month, day
		val year = u16LE(frame, 27)
		val month = frame[29].toInt() and 0xFF
		val day = frame[30].toInt() and 0xFF
		if (year < 2000 || year > 2100 || month !in 1..12 || day !in 1..31) return null

		// Daily metric fields (Phase 1 M3β empirical offsets, observed frame on 2026-04-15):
		//   offset 34: steps (u24 LE)
		//   offset 42: distance_meters (u24 LE)
		//   offset 46: exercise_minutes (u24 LE)
		//   offset 50: resting/avg HR bpm (u16 LE) ← tentative, needs confirmation
		//   offset 52: active calories kcal (u16 LE)
		val steps = u24SafeLE(frame, 34, maxValid = 500_000)
		val distanceMeters = u24SafeLE(frame, 42, maxValid = 2_000_000)
		val exerciseMinutes = u24SafeLE(frame, 46, maxValid = 1440)
		val restingHR = u16SafeLE(frame, 50, min = 30, max = 220)
		val activeCalories = u16SafeLE(frame, 52, min = 0, max = 20_000)

		return DailySummary(
			year = year,
			month = month,
			day = day,
			steps = steps,
			distanceMeters = distanceMeters,
			exerciseMinutes = exerciseMinutes,
			activeCalories = activeCalories,
			restingHeartRate = restingHR,
		)
	}

	// --- helpers ---

	private fun u16LE(frame: ByteArray, offset: Int): Int =
		(frame[offset].toInt() and 0xFF) or ((frame[offset + 1].toInt() and 0xFF) shl 8)

	private fun u24LE(frame: ByteArray, offset: Int): Int =
		(frame[offset].toInt() and 0xFF) or
			((frame[offset + 1].toInt() and 0xFF) shl 8) or
			((frame[offset + 2].toInt() and 0xFF) shl 16)

	private fun u16SafeLE(frame: ByteArray, offset: Int, min: Int, max: Int): Int? {
		if (offset + 2 > frame.size) return null
		val v = u16LE(frame, offset)
		return if (v in min..max) v else null
	}

	private fun u24SafeLE(frame: ByteArray, offset: Int, maxValid: Int): Int? {
		if (offset + 3 > frame.size) return null
		val v = u24LE(frame, offset)
		return if (v in 0..maxValid) v else null
	}
}
