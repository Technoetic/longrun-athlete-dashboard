package com.technoetic.longrun.bridge

import android.annotation.SuppressLint
import android.content.Context
import android.os.Bundle
import android.view.View
import android.webkit.CookieManager
import android.webkit.JavascriptInterface
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.lifecycle.lifecycleScope
import com.technoetic.longrun.bridge.databinding.ActivityWebBinding
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

class WebActivity : AppCompatActivity() {

	private lateinit var binding: ActivityWebBinding
	private lateinit var prefs: android.content.SharedPreferences

	companion object {
		const val APP_URL =
			"https://longrun-athlete-frontend-production.up.railway.app/"
		const val BACKEND =
			"https://longrun-coach-dashboard-production.up.railway.app"
	}

	private val permissionLauncher = registerForActivityResult(
		PermissionController.createRequestPermissionResultContract(),
	) { granted ->
		if (granted.containsAll(HealthBridge.PERMISSIONS)) {
			Toast.makeText(this, "Health Connect 권한 승인됨", Toast.LENGTH_SHORT).show()
			triggerSyncIfReady()
		} else {
			Toast.makeText(
				this,
				"Health Connect 권한 일부 거부됨 (동기화 제한)",
				Toast.LENGTH_LONG,
			).show()
		}
	}

	@SuppressLint("SetJavaScriptEnabled")
	override fun onCreate(savedInstanceState: Bundle?) {
		super.onCreate(savedInstanceState)
		binding = ActivityWebBinding.inflate(layoutInflater)
		setContentView(binding.root)

		prefs = getSharedPreferences("longrun", Context.MODE_PRIVATE)

		val web = binding.webView
		val s = web.settings
		s.javaScriptEnabled = true
		s.domStorageEnabled = true
		s.mediaPlaybackRequiresUserGesture = false
		s.cacheMode = WebSettings.LOAD_DEFAULT
		s.userAgentString = s.userAgentString + " LongRunAndroid/0.1"

		CookieManager.getInstance().setAcceptCookie(true)
		CookieManager.getInstance().setAcceptThirdPartyCookies(web, true)

		web.addJavascriptInterface(JsBridge(), "LongRunNative")

		web.webViewClient = object : WebViewClient() {
			override fun onPageFinished(view: WebView, url: String) {
				binding.loading.visibility = View.GONE

				// 홈 화면 진입 시 자동 sync
				if (url.contains("dashboard") || url.contains("#home")) {
					triggerSyncIfReady()
				}

				// 페이지에 네이티브 연결 알림 스니펫 주입
				view.evaluateJavascript(
					"""
					window.LONGRUN_NATIVE = true;
					if (window.__longrunNativeReady) window.__longrunNativeReady();
					""".trimIndent(),
					null,
				)
			}
		}

		// Back 버튼으로 WebView history 뒤로가기
		onBackPressedDispatcher.addCallback(
			this,
			object : OnBackPressedCallback(true) {
				override fun handleOnBackPressed() {
					if (web.canGoBack()) {
						web.goBack()
					} else {
						isEnabled = false
						onBackPressedDispatcher.onBackPressed()
					}
				}
			},
		)

		web.loadUrl(APP_URL)
	}

	override fun onResume() {
		super.onResume()
		// 포그라운드 복귀 시 sync 기회 포착 (쿠키가 유효하면)
		triggerSyncIfReady()
	}

	/**
	 * 쿠키가 있고 email을 획득 가능하면 Health Connect 권한 확인 → 동기화 실행.
	 * 권한이 없으면 요청 다이얼로그 오픈.
	 * email 획득 성공 시 SharedPreferences + WebView 쿠키 문자열 캐시 + SyncWorker
	 * 자동 enqueue 하여 백그라운드/잠금 상태에서도 주기 sync 가 이어지도록 한다.
	 */
	private fun triggerSyncIfReady() {
		val cookie = CookieManager.getInstance().getCookie(BACKEND) ?: return
		if (!cookie.contains("longrun_token")) return

		val sdkStatus = HealthBridge.availability(this)
		if (sdkStatus != HealthConnectClient.SDK_AVAILABLE) return

		lifecycleScope.launch {
			val hasPerm = HealthBridge.hasAllPermissions(this@WebActivity)
			if (!hasPerm) {
				permissionLauncher.launch(HealthBridge.PERMISSIONS)
				return@launch
			}

			val email = fetchEmailFromBackend()
			if (email.isNullOrBlank()) return@launch
			prefs.edit()
				.putString("email", email)
				.putString("cookie", cookie)
				.apply()

			// 백그라운드 주기 sync 를 앱 버전마다 한 번씩 enqueue (unique, UPDATE 정책).
			// versionCode를 기억해서 업데이트 시 새 스케줄 옵션(initialDelay 등)이 반영되도록.
			val currentVc = try {
				packageManager.getPackageInfo(packageName, 0).longVersionCode
			} catch (_: Exception) { -1L }
			val enqueuedVc = prefs.getLong("bg_enqueued_vc", -1L)
			if (enqueuedVc != currentVc) {
				SyncWorker.enqueue(applicationContext)
				prefs.edit()
					.putLong("bg_enqueued_vc", currentVc)
					.putBoolean("bg", true)
					.apply()
				android.util.Log.d("LongRun", "periodic SyncWorker enqueued for vc=$currentVc")
			}

			val result = withContext(Dispatchers.IO) {
				HealthBridge.syncOnce(this@WebActivity, email)
			}
			android.util.Log.d("LongRun", "sync result: $result")

			// 쿠키 만료: 401 받으면 저장된 인증 정보 삭제 + 로그인 페이지로 이동
			if (result.startsWith("FAIL 401")) {
				prefs.edit()
					.remove("cookie")
					.remove("email")
					.remove("bg_enqueued_vc")
					.apply()
				CookieManager.getInstance().removeAllCookies(null)
				Toast.makeText(
					this@WebActivity,
					"세션 만료 — 다시 로그인해주세요",
					Toast.LENGTH_LONG,
				).show()
				binding.webView.loadUrl("$APP_URL#login")
			}
		}
	}

	/**
	 * WebView 쿠키를 사용해 GET /api/user/me 호출 → email 획득
	 */
	private suspend fun fetchEmailFromBackend(): String? =
		withContext(Dispatchers.IO) {
			try {
				val url = URL("$BACKEND/api/user/me")
				val conn = url.openConnection() as HttpURLConnection
				conn.requestMethod = "GET"
				val cookie = CookieManager.getInstance().getCookie(BACKEND)
				if (cookie != null) conn.setRequestProperty("Cookie", cookie)
				conn.connectTimeout = 10000
				conn.readTimeout = 10000
				if (conn.responseCode != 200) {
					conn.disconnect()
					return@withContext null
				}
				val body = conn.inputStream.bufferedReader().use { it.readText() }
				conn.disconnect()
				val json = JSONObject(body)
				if (json.has("email") && !json.isNull("email")) json.getString("email") else null
			} catch (_: Exception) {
				null
			}
		}

	/**
	 * WebView 안에서 JS 로 호출 가능한 네이티브 인터페이스.
	 * 프론트 추가 수정 없이 미래 확장을 위해 준비.
	 */
	inner class JsBridge {
		@JavascriptInterface
		fun requestSync(): String {
			runOnUiThread { triggerSyncIfReady() }
			return "요청됨"
		}

		@JavascriptInterface
		fun isNative(): Boolean = true
	}
}
