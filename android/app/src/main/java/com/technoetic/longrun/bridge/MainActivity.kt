package com.technoetic.longrun.bridge

import android.content.Context
import android.os.Bundle
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.lifecycle.lifecycleScope
import com.technoetic.longrun.bridge.databinding.ActivityMainBinding
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MainActivity : AppCompatActivity() {

	private lateinit var binding: ActivityMainBinding
	private lateinit var prefs: android.content.SharedPreferences

	private val permissionLauncher = registerForActivityResult(
		PermissionController.createRequestPermissionResultContract(),
	) { granted ->
		log(
			if (granted.containsAll(HealthBridge.PERMISSIONS))
				"권한 승인됨 (${granted.size})"
			else
				"일부 권한 거부됨 (granted=${granted.size}, need=${HealthBridge.PERMISSIONS.size})",
		)
	}

	override fun onCreate(savedInstanceState: Bundle?) {
		super.onCreate(savedInstanceState)
		binding = ActivityMainBinding.inflate(layoutInflater)
		setContentView(binding.root)

		prefs = getSharedPreferences("longrun", Context.MODE_PRIVATE)
		binding.editEmail.setText(prefs.getString("email", ""))
		binding.editPassword.setText(prefs.getString("password", ""))
		updateBackgroundButton()

		log("Health Connect 상태: ${statusLabel(HealthBridge.availability(this))}")

		binding.btnSave.setOnClickListener {
			prefs.edit()
				.putString("email", binding.editEmail.text.toString().trim())
				.putString("password", binding.editPassword.text.toString())
				.apply()
			Toast.makeText(this, "저장됨", Toast.LENGTH_SHORT).show()
			log("계정 저장: ${binding.editEmail.text}")
		}

		binding.btnRequestPerm.setOnClickListener {
			val status = HealthBridge.availability(this)
			if (status != HealthConnectClient.SDK_AVAILABLE) {
				log("FAIL: Health Connect 사용 불가 (${statusLabel(status)})")
				return@setOnClickListener
			}
			permissionLauncher.launch(HealthBridge.PERMISSIONS)
		}

		binding.btnSyncNow.setOnClickListener {
			val email = binding.editEmail.text.toString().trim()
			if (email.isBlank()) {
				log("FAIL: 이메일 먼저 저장")
				return@setOnClickListener
			}
			log("동기화 시작…")
			lifecycleScope.launch {
				val result = withContext(Dispatchers.IO) {
					HealthBridge.syncOnce(this@MainActivity, email)
				}
				log(result)
			}
		}

		binding.btnToggleBackground.setOnClickListener {
			val enabled = prefs.getBoolean("bg", false)
			if (enabled) {
				SyncWorker.cancel(this)
				prefs.edit().putBoolean("bg", false).apply()
				log("백그라운드 sync OFF")
			} else {
				SyncWorker.enqueue(this)
				prefs.edit().putBoolean("bg", true).apply()
				log("백그라운드 sync ON (15분 주기)")
			}
			updateBackgroundButton()
		}
	}

	override fun onResume() {
		super.onResume()
		lifecycleScope.launch {
			if (HealthBridge.availability(this@MainActivity)
				== HealthConnectClient.SDK_AVAILABLE
			) {
				val ok = HealthBridge.hasAllPermissions(this@MainActivity)
				log("권한 상태: ${if (ok) "승인됨" else "미승인"}")
			}
		}
	}

	private fun updateBackgroundButton() {
		val enabled = prefs.getBoolean("bg", false)
		binding.btnToggleBackground.text =
			if (enabled) "백그라운드 동기화 OFF" else "백그라운드 동기화 ON"
	}

	private fun log(msg: String) {
		val ts = SimpleDateFormat("HH:mm:ss", Locale.KOREA).format(Date())
		val line = "[$ts] $msg"
		binding.textLog.text = buildString {
			append(line)
			append("\n")
			append(binding.textLog.text)
		}.take(4000)
	}

	private fun statusLabel(status: Int): String = when (status) {
		HealthConnectClient.SDK_AVAILABLE -> "사용 가능"
		HealthConnectClient.SDK_UNAVAILABLE -> "미지원"
		HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> "업데이트 필요"
		else -> "unknown($status)"
	}
}
