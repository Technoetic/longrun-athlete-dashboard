package com.technoetic.longrun.bridge

import android.Manifest
import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCallback
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothGattDescriptor
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothProfile
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import androidx.core.content.ContextCompat
import java.util.UUID
import java.util.concurrent.ConcurrentLinkedQueue
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.withTimeout

/**
 * NURUN R21 / IDOsmart BLE client.
 *
 * Phase 1 M1: minimum viable client — connect → discover → subscribe af7/af2 →
 * send keepalive (0x02 0x01) → verify device reply on af7.
 *
 * All facts (UUIDs, opcode bytes) come from Phase 0 reverse engineering, see
 * step_archive/ido_research/PHASE_0_REPORT.md.
 *
 * Legacy v1/v2 framing: raw body, no magic, no CRC. GATT write length IS the packet
 * length. Reply flow: TX cmd → RX (notify) → reply.
 */
class IdoBleClient(private val context: Context) {

	companion object {
		private const val TAG = "IdoBleClient"

		// GATT profile — verified from VeryFit GATT discovery logs (2026-04-15).
		val SERVICE_UUID: UUID = UUID.fromString("00000af0-0000-1000-8000-00805f9b34fb")
		val CHAR_WRITE_NORMAL: UUID = UUID.fromString("00000af6-0000-1000-8000-00805f9b34fb")
		val CHAR_NOTIFY_NORMAL: UUID = UUID.fromString("00000af7-0000-1000-8000-00805f9b34fb")
		val CHAR_WRITE_HEALTH: UUID = UUID.fromString("00000af1-0000-1000-8000-00805f9b34fb")
		val CHAR_NOTIFY_HEALTH: UUID = UUID.fromString("00000af2-0000-1000-8000-00805f9b34fb")
		val CCCD_UUID: UUID = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb")

		// Known commands (from Phase 0 live TX capture)
		// Keepalive: sent by app every 60s. Device replies with 20-byte status frame.
		val CMD_KEEPALIVE_PING = byteArrayOf(0x02, 0x01)

		// Smart HR mode (continuous HR). 16 bytes.
		//   offset 2: 0x55=ON (all four 2-bit fields enabled), 0xAA=OFF
		//   offset 6-7: HR high/low alert thresholds (default 120/50)
		//   offset 10-13: alert time window (23:59 end, 08:07 start in captured sample)
		fun buildSmartHrCmd(enable: Boolean): ByteArray = byteArrayOf(
			0x03, 0x63,
			if (enable) 0x55.toByte() else 0xAA.toByte(),
			0x01, 0x55, 0x55, 0x78, 0x32, 0, 0, 0x17, 0x3B, 0x08, 0x07, 0, 0
		)

		// Common ack prefix seen in TX/RX. First 2 bytes = cmd echo.
		private const val ACK_CMD_0 = 0x07.toByte()
		private const val ACK_CMD_1 = 0x40.toByte()

		// ---- v3 magic-wrapped framing (for HEALTH_DATA sync, JSON, etc.) ----
		// Layout: [magic:5=33 DA AD DA AD] [ver:1=01] [len_field:2 LE]
		//         [cmd:1] [sub:1] [nseq:2 LE] [payload:N] [crc:2 LE]
		//
		// len_field = total_frame_bytes - 3  (empirically verified on 102 frames)
		// crc = CRC16-CCITT-FALSE(poly=0x1021, init=0xFFFF) over frame[1..total-3]
		//       i.e. skip the first magic byte 0x33, exclude the trailing 2-byte CRC.
		// Output CRC is little-endian.
		//
		// Algorithm discovered via differential brute force in
		// scripts/crc16_bruteforce.py (Phase 1 M3β, 2026-04-15).
		private val V3_MAGIC = byteArrayOf(0x33, 0xDA.toByte(), 0xAD.toByte(), 0xDA.toByte(), 0xAD.toByte())

		private fun crc16Ido(data: ByteArray, start: Int, endExclusive: Int): Int {
			var crc = 0xFFFF
			for (i in start until endExclusive) {
				crc = crc xor ((data[i].toInt() and 0xFF) shl 8)
				repeat(8) {
					crc = if ((crc and 0x8000) != 0) ((crc shl 1) xor 0x1021) else (crc shl 1)
					crc = crc and 0xFFFF
				}
			}
			return crc and 0xFFFF
		}

		/**
		 * Build a v3 magic frame ready for BLE characteristic write.
		 *
		 * @param cmd  primary command byte (e.g. 0x04 = HEALTH_DATA)
		 * @param sub  sub-command byte (e.g. 0x08, 0x09, 0x0A for HR sync steps)
		 * @param nseq 16-bit little-endian sequence number chosen by the caller
		 * @param payload variable-length command body (may be empty)
		 */
		fun buildV3Frame(cmd: Byte, sub: Byte, nseq: Int, payload: ByteArray = ByteArray(0)): ByteArray {
			val total = 5 + 1 + 2 + 2 + 2 + payload.size + 2
			val lenField = total - 3
			val out = ByteArray(total)
			// magic
			System.arraycopy(V3_MAGIC, 0, out, 0, 5)
			// version
			out[5] = 0x01
			// length LE
			out[6] = (lenField and 0xFF).toByte()
			out[7] = ((lenField ushr 8) and 0xFF).toByte()
			// cmd + sub
			out[8] = cmd
			out[9] = sub
			// nseq LE
			out[10] = (nseq and 0xFF).toByte()
			out[11] = ((nseq ushr 8) and 0xFF).toByte()
			// payload
			System.arraycopy(payload, 0, out, 12, payload.size)
			// crc over frame[1 .. total-3)  (skip first magic byte, exclude trailing 2-byte crc)
			val crc = crc16Ido(out, 1, total - 2)
			out[total - 2] = (crc and 0xFF).toByte()
			out[total - 1] = ((crc ushr 8) and 0xFF).toByte()
			return out
		}

		/**
		 * v3 HEALTH_DATA query. Frame format (cmd=0x04 sub=0x00):
		 *   payload[0] = 0x00 (request) or 0x01 (confirm)
		 *   payload[1] = category (01=steps, 02=sleep? 05/06/07=activity segments,
		 *                08=HR history?, 0D/0E=various, 10=?, 03=?)
		 *   payload[2] = enabled flag (usually 1)
		 *   payload[3..4] = offset / limit (varies)
		 *
		 * Category 0x07 returned the largest RX payload in Phase 0 captures.
		 * Category 0x08 looked HR-related based on RX offset 7 value. M3β-4 will try
		 * both and observe which one drives af2 HR samples.
		 */
		fun buildHealthQuery(category: Byte, nseq: Int, confirm: Boolean = false): ByteArray {
			val payload = byteArrayOf(
				if (confirm) 0x01 else 0x00,
				category,
				0x01,
				0x00,
				0x00,
			)
			return buildV3Frame(cmd = 0x04, sub = 0x00, nseq = nseq, payload = payload)
		}
	}

	// --- State ---
	@Volatile
	private var gatt: BluetoothGatt? = null

	@Volatile
	private var writeCharNormal: BluetoothGattCharacteristic? = null

	@Volatile
	private var writeCharHealth: BluetoothGattCharacteristic? = null

	// Each TX expects a notify reply; deferreds are fulfilled in onCharacteristicChanged.
	private val pendingReplies = ConcurrentLinkedQueue<CompletableDeferred<ByteArray>>()

	// v3 multi-packet reassembly state. IDO v3 frames exceeding the BLE MTU (~244B)
	// are fragmented: first packet carries the full magic prefix (33 DA AD DA AD),
	// subsequent packets are prefixed with a single 0x33 continuation marker followed
	// by raw data bytes. A frame is complete when the accumulated length equals
	// len_field + 3 (observed in Phase 0 logs).
	private var v3Buf: ByteArray? = null
	private var v3Expected: Int = 0

	private var connectedDeferred: CompletableDeferred<Boolean>? = null
	private var servicesDiscoveredDeferred: CompletableDeferred<Boolean>? = null
	private var cccdWriteDeferred: CompletableDeferred<Boolean>? = null

	// --- Permission check ---
	private fun hasBtConnectPermission(): Boolean {
		if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true
		return ContextCompat.checkSelfPermission(
			context,
			Manifest.permission.BLUETOOTH_CONNECT,
		) == PackageManager.PERMISSION_GRANTED
	}

	// --- Main entry: open connection, discover, subscribe. ---
	@SuppressLint("MissingPermission")
	suspend fun connect(address: String): Boolean {
		if (!hasBtConnectPermission()) {
			Log.w(TAG, "BLUETOOTH_CONNECT permission missing")
			return false
		}
		val btMgr = context.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
		val adapter: BluetoothAdapter = btMgr.adapter ?: return false
		val device: BluetoothDevice = try {
			adapter.getRemoteDevice(address)
		} catch (e: IllegalArgumentException) {
			Log.e(TAG, "bad MAC $address", e)
			return false
		}

		connectedDeferred = CompletableDeferred()
		servicesDiscoveredDeferred = CompletableDeferred()

		gatt = device.connectGatt(context, /* autoConnect = */ false, callback)

		return try {
			withTimeout(15_000) {
				if (!connectedDeferred!!.await()) return@withTimeout false
				if (!servicesDiscoveredDeferred!!.await()) return@withTimeout false
				subscribeNotify(CHAR_NOTIFY_NORMAL) && subscribeNotify(CHAR_NOTIFY_HEALTH)
			}
		} catch (_: TimeoutCancellationException) {
			Log.e(TAG, "connect timed out")
			disconnect()
			false
		}
	}

	@SuppressLint("MissingPermission")
	private suspend fun subscribeNotify(notifyUuid: UUID): Boolean {
		val g = gatt ?: return false
		val svc = g.getService(SERVICE_UUID) ?: run {
			Log.e(TAG, "service $SERVICE_UUID not found")
			return false
		}
		val notifyChar = svc.getCharacteristic(notifyUuid) ?: run {
			Log.e(TAG, "notify char $notifyUuid not found")
			return false
		}
		if (!g.setCharacteristicNotification(notifyChar, true)) return false
		val cccd = notifyChar.getDescriptor(CCCD_UUID) ?: return false
		cccdWriteDeferred = CompletableDeferred()
		@Suppress("DEPRECATION")
		cccd.value = BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE
		@Suppress("DEPRECATION")
		if (!g.writeDescriptor(cccd)) return false
		return try {
			withTimeout(3_000) { cccdWriteDeferred!!.await() }
		} catch (_: TimeoutCancellationException) {
			false
		}
	}

	/**
	 * Send a command to the Normal write characteristic (0x00000af6) and wait for the
	 * next notify reply on 0x00000af7. Caller is responsible for matching payload to the
	 * expected reply — M1 only verifies that *some* reply arrives.
	 */
	@SuppressLint("MissingPermission")
	suspend fun sendAndAwaitReply(bytes: ByteArray, timeoutMs: Long = 3_000): ByteArray? {
		val g = gatt ?: return null
		val ch = writeCharNormal ?: run {
			Log.e(TAG, "write char not discovered")
			return null
		}
		val deferred = CompletableDeferred<ByteArray>()
		pendingReplies.add(deferred)
		@Suppress("DEPRECATION")
		ch.value = bytes
		@Suppress("DEPRECATION")
		ch.writeType = BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT
		@Suppress("DEPRECATION")
		val ok = g.writeCharacteristic(ch)
		if (!ok) {
			pendingReplies.remove(deferred)
			return null
		}
		return try {
			withTimeout(timeoutMs) { deferred.await() }
		} catch (_: TimeoutCancellationException) {
			pendingReplies.remove(deferred)
			null
		}
	}

	/**
	 * One-shot helper: connect, fetch cat=0x08 daily summary, parse, disconnect.
	 * Returns null if connection or parsing fails. Caller does NOT need to manage
	 * lifecycle. Safe to call from a SyncWorker coroutine.
	 */
	suspend fun fetchDailySummary(address: String): IdoParser.DailySummary? {
		return try {
			if (!connect(address)) return null
			val req = buildHealthQuery(category = 0x08, nseq = (System.currentTimeMillis() and 0xFFFF).toInt())
			val reply = sendAndAwaitReply(req, timeoutMs = 6_000) ?: return null
			IdoParser.parseDailySummary(reply)
		} catch (t: Throwable) {
			Log.e(TAG, "fetchDailySummary crashed", t)
			null
		} finally {
			disconnect()
		}
	}

	@SuppressLint("MissingPermission")
	fun disconnect() {
		val g = gatt ?: return
		try { g.disconnect() } catch (_: Exception) {}
		try { g.close() } catch (_: Exception) {}
		gatt = null
		writeCharNormal = null
		writeCharHealth = null
		// Fail any pending replies so callers unblock.
		while (true) {
			val d = pendingReplies.poll() ?: break
			d.cancel()
		}
	}

	// --- GATT callback ---
	private val callback = object : BluetoothGattCallback() {
		@SuppressLint("MissingPermission")
		override fun onConnectionStateChange(g: BluetoothGatt, status: Int, newState: Int) {
			when (newState) {
				BluetoothProfile.STATE_CONNECTED -> {
					Log.i(TAG, "connected; discovering services")
					connectedDeferred?.complete(true)
					g.discoverServices()
				}
				BluetoothProfile.STATE_DISCONNECTED -> {
					Log.i(TAG, "disconnected (status=$status)")
					connectedDeferred?.complete(false)
					servicesDiscoveredDeferred?.complete(false)
				}
			}
		}

		override fun onServicesDiscovered(g: BluetoothGatt, status: Int) {
			if (status != BluetoothGatt.GATT_SUCCESS) {
				Log.e(TAG, "service discovery failed status=$status")
				servicesDiscoveredDeferred?.complete(false)
				return
			}
			val svc = g.getService(SERVICE_UUID)
			if (svc == null) {
				Log.e(TAG, "IDO service not present")
				servicesDiscoveredDeferred?.complete(false)
				return
			}
			writeCharNormal = svc.getCharacteristic(CHAR_WRITE_NORMAL)
			writeCharHealth = svc.getCharacteristic(CHAR_WRITE_HEALTH)
			val ok = writeCharNormal != null && writeCharHealth != null
			Log.i(TAG, "services discovered; writeN=$writeCharNormal writeH=$writeCharHealth")
			servicesDiscoveredDeferred?.complete(ok)
		}

		override fun onDescriptorWrite(
			g: BluetoothGatt,
			descriptor: BluetoothGattDescriptor,
			status: Int,
		) {
			val ok = status == BluetoothGatt.GATT_SUCCESS
			Log.i(TAG, "descriptor write uuid=${descriptor.uuid} ok=$ok")
			cccdWriteDeferred?.complete(ok)
		}

		@Deprecated("Deprecated in API 33 but still required for <33")
		override fun onCharacteristicChanged(
			g: BluetoothGatt,
			characteristic: BluetoothGattCharacteristic,
		) {
			@Suppress("DEPRECATION")
			val value = characteristic.value ?: return
			Log.d(TAG, "notify ${characteristic.uuid} len=${value.size} hex=${value.toHex()}")
			handleNotify(value)
		}
	}

	/**
	 * Notify dispatcher. Recognises:
	 *   - v1/v2 legacy frames (no magic) → immediately deliver to pending reply.
	 *   - v3 frame start (33 DA AD DA AD ...) → begin reassembly; deliver when complete.
	 *   - v3 continuation (0x33 prefix + raw data) → append to pending buffer.
	 */
	private fun handleNotify(value: ByteArray) {
		if (value.isEmpty()) return

		// Detect v3 frame start: magic is 33 DA AD DA AD
		val isV3Start = value.size >= 5 &&
			value[0] == 0x33.toByte() && value[1] == 0xDA.toByte() &&
			value[2] == 0xAD.toByte() && value[3] == 0xDA.toByte() &&
			value[4] == 0xAD.toByte()

		if (isV3Start) {
			// New v3 frame. Parse length field at offset 6..7 (LE).
			if (value.size < 8) {
				Log.w(TAG, "v3 start too short")
				return
			}
			val lenField = (value[6].toInt() and 0xFF) or ((value[7].toInt() and 0xFF) shl 8)
			val totalExpected = lenField + 3
			if (value.size >= totalExpected) {
				// Single-packet frame, deliver immediately.
				v3Buf = null
				v3Expected = 0
				pendingReplies.poll()?.complete(value.copyOf(totalExpected))
			} else {
				// Multi-packet, start buffer.
				v3Buf = value.copyOf()
				v3Expected = totalExpected
				Log.d(TAG, "v3 reassembly start: have=${value.size} expected=$totalExpected")
			}
			return
		}

		// Continuation of a v3 multi-packet frame: first byte is 0x33 marker, rest is data.
		val buf = v3Buf
		if (buf != null && value.isNotEmpty() && value[0] == 0x33.toByte()) {
			val contData = value.copyOfRange(1, value.size)
			val merged = buf + contData
			if (merged.size >= v3Expected) {
				// Complete.
				val completed = merged.copyOf(v3Expected)
				v3Buf = null
				v3Expected = 0
				Log.d(TAG, "v3 reassembly complete: len=${completed.size}")
				pendingReplies.poll()?.complete(completed)
			} else {
				v3Buf = merged
				Log.d(TAG, "v3 reassembly progress: have=${merged.size}/$v3Expected")
			}
			return
		}

		// Legacy v1/v2 frame: deliver raw bytes.
		pendingReplies.poll()?.complete(value)
	}
}

private fun ByteArray.toHex(): String = joinToString(" ") { "%02X".format(it) }
