package com.technoetic.longrun.bridge

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * Debug-only trigger for Phase 1 M1c runtime test.
 *
 * Fire from adb:
 *   adb shell am broadcast -a com.technoetic.longrun.IDO_PING -p com.technoetic.longrun.bridge
 *
 * Logs everything under tag "IdoBleClient" / "IdoDebug". Do NOT ship this in release.
 */
class IdoDebugReceiver : BroadcastReceiver() {

	private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

	override fun onReceive(context: Context, intent: Intent) {
		val mac = intent.getStringExtra("mac") ?: DEFAULT_R21_MAC
		when (intent.action) {
			ACTION_PING -> {
				Log.i(TAG, "IDO_PING received, mac=$mac")
				scope.launch { runPingTest(context, mac) }
			}
			ACTION_HR_ON -> {
				Log.i(TAG, "IDO_HR_ON received, mac=$mac")
				scope.launch { runHrToggleTest(context, mac, enable = true) }
			}
			ACTION_HR_OFF -> {
				Log.i(TAG, "IDO_HR_OFF received, mac=$mac")
				scope.launch { runHrToggleTest(context, mac, enable = false) }
			}
			ACTION_SYNC_SWEEP -> {
				Log.i(TAG, "IDO_SYNC_SWEEP received, mac=$mac")
				scope.launch { runSyncSweepTest(context, mac) }
			}
			ACTION_HEALTH_SYNC -> {
				Log.i(TAG, "IDO_HEALTH_SYNC received, mac=$mac")
				scope.launch { runHealthSyncTest(context, mac) }
			}
			ACTION_DAILY -> {
				Log.i(TAG, "IDO_DAILY received, mac=$mac")
				scope.launch { runDailyTest(context, mac) }
			}
			ACTION_SYNC_NOW -> {
				Log.i(TAG, "IDO_SYNC_NOW received")
				scope.launch {
					val prefs = context.getSharedPreferences("longrun", Context.MODE_PRIVATE)
					val email = prefs.getString("email", "") ?: ""
					if (email.isBlank()) {
						Log.e(TAG, "✗ no email in prefs — log in via WebActivity first")
						return@launch
					}
					Log.i(TAG, "→ HealthBridge.syncOnce($email)")
					val result = HealthBridge.syncOnce(context, email)
					Log.i(TAG, "sync result: $result")
				}
			}
			ACTION_CAT_SWEEP -> {
				Log.i(TAG, "IDO_CAT_SWEEP received, mac=$mac")
				scope.launch { runCatSweep(context, mac) }
			}
			ACTION_CAT3 -> {
				Log.i(TAG, "IDO_CAT3 received, mac=$mac")
				scope.launch { runCat3Dump(context, mac) }
			}
		}
	}

	/** Phase 2-C: fetch cat=0x03 (per-minute activity/HR stream) and dump full
	 * reassembled payload hex to logcat for offline parser development. */
	private suspend fun runCat3Dump(context: Context, mac: String) {
		val client = IdoBleClient(context)
		try {
			if (!client.connect(mac)) {
				Log.e(TAG, "✗ connect failed")
				return
			}
			val req = IdoBleClient.buildHealthQuery(0x03, nseq = 400)
			val reply = client.sendAndAwaitReply(req, timeoutMs = 8_000)
			if (reply == null) {
				Log.e(TAG, "✗ no reply")
				return
			}
			val hex = reply.joinToString("") { "%02x".format(it) }
			Log.i(TAG, "cat=0x03 full ${reply.size}B hex=$hex")
			// chunk to avoid logcat line truncation
			val chunkSize = 500
			var i = 0
			while (i < hex.length) {
				Log.i(TAG, "cat3chunk[${i/chunkSize}]: ${hex.substring(i, minOf(i + chunkSize, hex.length))}")
				i += chunkSize
			}
		} catch (t: Throwable) {
			Log.e(TAG, "cat3 dump crashed", t)
		} finally {
			client.disconnect()
		}
	}

	/** Phase 2 exploration: brute-force health query categories 0x01 through 0x20
	 * and log the raw reply for each. Goal: locate HRV and SpO2 data types. */
	private suspend fun runCatSweep(context: Context, mac: String) {
		val client = IdoBleClient(context)
		try {
			if (!client.connect(mac)) {
				Log.e(TAG, "✗ connect failed")
				return
			}
			var nseq = 300
			for (catInt in 0x01..0x20) {
				val cat = catInt.toByte()
				val req = IdoBleClient.buildHealthQuery(cat, nseq++)
				val reply = client.sendAndAwaitReply(req, timeoutMs = 4_000)
				if (reply == null) {
					Log.w(TAG, "[cat=0x${"%02X".format(cat)}] ✗ timeout")
				} else {
					val preview = reply.take(64).joinToString(" ") { "%02X".format(it) }
					Log.i(TAG, "[cat=0x${"%02X".format(cat)}] ${reply.size}B  $preview")
				}
				// send confirm to unblock device before moving on
				val conf = IdoBleClient.buildHealthQuery(cat, nseq++, confirm = true)
				client.sendAndAwaitReply(conf, timeoutMs = 2_000)
				delay(400)
			}
		} catch (t: Throwable) {
			Log.e(TAG, "cat sweep crashed", t)
		} finally {
			client.disconnect()
			Log.i(TAG, "disconnected")
		}
	}

	/**
	 * Phase 1 M4-3: fetch cat=0x08 (daily summary), run it through IdoParser, and
	 * log the structured result. Validates multi-packet reassembly + parser path.
	 */
	private suspend fun runDailyTest(context: Context, mac: String) {
		val client = IdoBleClient(context)
		try {
			Log.i(TAG, "→ connect($mac)")
			if (!client.connect(mac)) {
				Log.e(TAG, "✗ connect failed")
				return
			}
			val req = IdoBleClient.buildHealthQuery(0x08, nseq = 200)
			Log.i(TAG, "→ cat=0x08 request ${req.size}B")
			val reply = client.sendAndAwaitReply(req, timeoutMs = 6_000)
			if (reply == null) {
				Log.e(TAG, "✗ no reply")
				return
			}
			Log.i(TAG, "✓ reply ${reply.size}B (first 64B): " +
				reply.take(64).joinToString(" ") { "%02X".format(it) })
			val parsed = IdoParser.parseDailySummary(reply)
			if (parsed == null) {
				Log.w(TAG, "✗ parser returned null")
			} else {
				Log.i(TAG, "📊 ${parsed.isoDate()} steps=${parsed.steps} " +
					"dist=${parsed.distanceMeters}m exercise=${parsed.exerciseMinutes}min " +
					"rhr=${parsed.restingHeartRate} kcal=${parsed.activeCalories}")
			}
		} catch (t: Throwable) {
			Log.e(TAG, "daily test crashed", t)
		} finally {
			client.disconnect()
			Log.i(TAG, "disconnected")
		}
	}

	/**
	 * Phase 1 M3β-4: replay the HEALTH_DATA v3 query loop from Phase 0 VeryFit
	 * restart. Walks categories 0x01 through 0x10 with sequential nseq, sending
	 * request + confirm pairs. The goal is to observe RX frames (especially on
	 * af2) to learn which category yields HR samples.
	 */
	private suspend fun runHealthSyncTest(context: Context, mac: String) {
		val client = IdoBleClient(context)
		try {
			Log.i(TAG, "→ connect($mac)")
			if (!client.connect(mac)) {
				Log.e(TAG, "✗ connect failed")
				return
			}

			// Categories observed in Phase 0: 01, 02, 03, 05, 06, 07, 08, 0D, 0E, 10
			val categories = byteArrayOf(0x01, 0x02, 0x03, 0x05, 0x06, 0x07, 0x08, 0x0D, 0x0E, 0x10)
			var nseq = 100  // arbitrary starting seq, avoiding collision with VC Runner's own counter
			for (cat in categories) {
				val req = IdoBleClient.buildHealthQuery(cat, nseq++)
				val reqHex = req.joinToString(" ") { "%02X".format(it) }
				Log.i(TAG, "[cat=0x${"%02X".format(cat)}] → req ${req.size}B $reqHex")
				val reply = client.sendAndAwaitReply(req, timeoutMs = 4_000)
				if (reply == null) {
					Log.w(TAG, "[cat=0x${"%02X".format(cat)}] ✗ no reply")
				} else {
					val rhex = reply.joinToString(" ") { "%02X".format(it) }
					Log.i(TAG, "[cat=0x${"%02X".format(cat)}] ✓ reply ${reply.size}B $rhex")
				}
				// Send confirm / next step
				val conf = IdoBleClient.buildHealthQuery(cat, nseq++, confirm = true)
				val confHex = conf.joinToString(" ") { "%02X".format(it) }
				Log.i(TAG, "[cat=0x${"%02X".format(cat)}] → conf ${conf.size}B $confHex")
				val confReply = client.sendAndAwaitReply(conf, timeoutMs = 4_000)
				if (confReply != null) {
					val rhex = confReply.joinToString(" ") { "%02X".format(it) }
					Log.i(TAG, "[cat=0x${"%02X".format(cat)}] ✓ conf reply ${confReply.size}B $rhex")
				}
				delay(500)
			}

			// 30 seconds passive window to see if af2 catches any push.
			Log.i(TAG, "→ passive observation 30s")
			delay(30_000)
		} catch (t: Throwable) {
			Log.e(TAG, "health sync test crashed", t)
		} finally {
			client.disconnect()
			Log.i(TAG, "disconnected")
		}
	}

	/**
	 * Phase 1 M3 α: replay the VeryFit "connect + init" legacy command sweep observed
	 * in Phase 0 logs (after VeryFit force-stop restart). Goal: find out whether any
	 * 02 XX command triggers R21 to push HR history on af2 without requiring v3.
	 */
	private suspend fun runSyncSweepTest(context: Context, mac: String) {
		val client = IdoBleClient(context)
		try {
			Log.i(TAG, "→ connect($mac)")
			if (!client.connect(mac)) {
				Log.e(TAG, "✗ connect failed")
				return
			}

			// 8 legacy "02 XX" commands observed in VeryFit restart sequence
			// (Phase 0 log: gatt_discovery.log, MARK_after_force_stop → onboarding)
			val sweep = listOf(
				byteArrayOf(0x02, 0x04),  // device id / MAC echo
				byteArrayOf(0x02, 0x02),  // device info
				byteArrayOf(0x02, 0x07),  // firmware?
				byteArrayOf(0x02, 0xF0.toByte()),  // battery?
				byteArrayOf(0x02, 0x30),
				byteArrayOf(0x02, 0x01),  // keepalive
				byteArrayOf(0x02, 0xF4.toByte()),
				byteArrayOf(0x02, 0xEB.toByte()),
			)
			for ((i, cmd) in sweep.withIndex()) {
				val hex = cmd.joinToString(" ") { "%02X".format(it) }
				Log.i(TAG, "[sweep $i] → $hex")
				val reply = client.sendAndAwaitReply(cmd, timeoutMs = 3_000)
				if (reply == null) {
					Log.w(TAG, "[sweep $i] ✗ no reply")
				} else {
					val rhex = reply.joinToString(" ") { "%02X".format(it) }
					Log.i(TAG, "[sweep $i] ✓ len=${reply.size} $rhex")
				}
				delay(300)
			}

			// 2 minute passive window to see if any notify (especially af2) fires.
			Log.i(TAG, "→ passive observation window 120s")
			val windowMs = 120_000L
			val stepMs = 30_000L
			var elapsed = 0L
			while (elapsed < windowMs) {
				delay(stepMs)
				elapsed += stepMs
				Log.i(TAG, "... $elapsed/$windowMs ms, keepalive")
				val ping = client.sendAndAwaitReply(IdoBleClient.CMD_KEEPALIVE_PING, timeoutMs = 2_000)
				if (ping == null) {
					Log.w(TAG, "✗ keepalive lost")
					break
				}
			}
		} catch (t: Throwable) {
			Log.e(TAG, "sweep test crashed", t)
		} finally {
			client.disconnect()
			Log.i(TAG, "disconnected")
		}
	}

	private suspend fun runPingTest(context: Context, mac: String) {
		val client = IdoBleClient(context)
		try {
			Log.i(TAG, "→ connect($mac)")
			val connected = client.connect(mac)
			Log.i(TAG, "connect result=$connected")
			if (!connected) return

			Log.i(TAG, "→ sendAndAwaitReply(keepalive 02 01)")
			val reply = client.sendAndAwaitReply(IdoBleClient.CMD_KEEPALIVE_PING)
			if (reply == null) {
				Log.e(TAG, "✗ keepalive: no reply within timeout")
			} else {
				val hex = reply.joinToString(" ") { "%02X".format(it) }
				Log.i(TAG, "✓ keepalive reply len=${reply.size} hex=$hex")
				// Expected per Phase 0: 20 bytes starting with 02 01 6A 1F 01 01 00 ...
				val ok = reply.size == 20 && reply[0] == 0x02.toByte() && reply[1] == 0x01.toByte()
				Log.i(TAG, if (ok) "✓ reply shape matches spec" else "✗ reply shape unexpected")
			}
		} catch (t: Throwable) {
			Log.e(TAG, "test crashed", t)
		} finally {
			client.disconnect()
			Log.i(TAG, "disconnected")
		}
	}

	/**
	 * Phase 1 M2: send smart HR toggle command, then keep the connection open for ~2
	 * minutes while passively logging any notify frames. This lets us see whether
	 * af2 (health) actually streams HR samples after continuous-HR is enabled.
	 */
	private suspend fun runHrToggleTest(context: Context, mac: String, enable: Boolean) {
		val client = IdoBleClient(context)
		try {
			Log.i(TAG, "→ connect($mac)")
			if (!client.connect(mac)) {
				Log.e(TAG, "✗ connect failed")
				return
			}

			val cmd = IdoBleClient.buildSmartHrCmd(enable)
			val cmdHex = cmd.joinToString(" ") { "%02X".format(it) }
			Log.i(TAG, "→ sendAndAwaitReply(smart HR ${if (enable) "ON" else "OFF"}) hex=$cmdHex")
			val reply = client.sendAndAwaitReply(cmd, timeoutMs = 5_000)
			if (reply == null) {
				Log.e(TAG, "✗ HR toggle: no reply")
			} else {
				val replyHex = reply.joinToString(" ") { "%02X".format(it) }
				Log.i(TAG, "✓ HR toggle reply len=${reply.size} hex=$replyHex")
			}

			// Keep the GATT connection alive for 120s while IdoBleClient logs any
			// incoming notify frames (especially on af2). Send periodic keepalive
			// pings to prevent the device from timing us out.
			Log.i(TAG, "→ passive observation window 120s")
			val windowMs = 120_000L
			val stepMs = 30_000L
			var elapsed = 0L
			while (elapsed < windowMs) {
				delay(stepMs)
				elapsed += stepMs
				Log.i(TAG, "... $elapsed/$windowMs ms, sending keepalive")
				val ping = client.sendAndAwaitReply(IdoBleClient.CMD_KEEPALIVE_PING, timeoutMs = 2_000)
				if (ping == null) {
					Log.w(TAG, "✗ keepalive lost (device may have dropped us)")
					break
				}
			}
		} catch (t: Throwable) {
			Log.e(TAG, "hr test crashed", t)
		} finally {
			client.disconnect()
			Log.i(TAG, "disconnected")
		}
	}

	companion object {
		private const val TAG = "IdoDebug"
		const val ACTION_PING = "com.technoetic.longrun.IDO_PING"
		const val ACTION_HR_ON = "com.technoetic.longrun.IDO_HR_ON"
		const val ACTION_HR_OFF = "com.technoetic.longrun.IDO_HR_OFF"
		const val ACTION_SYNC_SWEEP = "com.technoetic.longrun.IDO_SYNC_SWEEP"
		const val ACTION_HEALTH_SYNC = "com.technoetic.longrun.IDO_HEALTH_SYNC"
		const val ACTION_DAILY = "com.technoetic.longrun.IDO_DAILY"
		const val ACTION_SYNC_NOW = "com.technoetic.longrun.IDO_SYNC_NOW"
		const val ACTION_CAT_SWEEP = "com.technoetic.longrun.IDO_CAT_SWEEP"
		const val ACTION_CAT3 = "com.technoetic.longrun.IDO_CAT3"

		// R21 MAC captured in Phase 0. Override with --es mac <addr> from adb.
		private const val DEFAULT_R21_MAC = "1F:0F:C7:77:05:66"
	}
}
