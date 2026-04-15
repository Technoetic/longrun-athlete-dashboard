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
			// Deliver to the oldest pending reply. M1 doesn't disambiguate by cmd yet.
			pendingReplies.poll()?.complete(value)
		}
	}
}

private fun ByteArray.toHex(): String = joinToString(" ") { "%02X".format(it) }
