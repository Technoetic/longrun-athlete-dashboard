plugins {
	id("com.android.application")
	id("org.jetbrains.kotlin.android")
}

android {
	namespace = "com.technoetic.longrun.bridge"
	compileSdk = 34

	defaultConfig {
		applicationId = "com.technoetic.longrun.bridge"
		minSdk = 28
		targetSdk = 34
		versionCode = 3
		versionName = "0.2.1"
	}

	buildTypes {
		release {
			isMinifyEnabled = false
		}
	}
	compileOptions {
		sourceCompatibility = JavaVersion.VERSION_17
		targetCompatibility = JavaVersion.VERSION_17
	}
	kotlinOptions {
		jvmTarget = "17"
	}
	buildFeatures {
		viewBinding = true
	}
}

dependencies {
	implementation("androidx.core:core-ktx:1.13.1")
	implementation("androidx.appcompat:appcompat:1.7.0")
	implementation("com.google.android.material:material:1.12.0")
	implementation("androidx.constraintlayout:constraintlayout:2.2.0")
	implementation("androidx.activity:activity-ktx:1.9.3")
	implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.7")

	// Health Connect
	implementation("androidx.health.connect:connect-client:1.1.0-alpha07")

	// WorkManager for periodic sync
	implementation("androidx.work:work-runtime-ktx:2.9.1")

	// Coroutines
	implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")
}
