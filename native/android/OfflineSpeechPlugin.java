package app.sktranslate.mobile;

import android.Manifest;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.ArrayList;

@CapacitorPlugin(name = "OfflineSpeech", permissions = {
    @Permission(alias = "microphone", strings = { Manifest.permission.RECORD_AUDIO })
})
public class OfflineSpeechPlugin extends Plugin {
    private final Handler main = new Handler(Looper.getMainLooper());
    private SpeechRecognizer recognizer;
    private PluginCall active;
    private String session;
    private boolean released;
    private String latest = "";
    private Runnable timeout;

    @PluginMethod(returnType = PluginMethod.RETURN_CALLBACK)
    public void start(PluginCall call) {
        main.post(() -> {
            if (active != null) {
                call.reject("Micro đang được sử dụng; hãy thả nút trước khi giữ mic khác.");
                return;
            }
            if (Build.VERSION.SDK_INT < 31 || !SpeechRecognizer.isOnDeviceRecognitionAvailable(getContext())) {
                call.reject("Cần Android 12 trở lên và dịch vụ nhận giọng ngoại tuyến trên máy. Hãy cập nhật Speech Services và tải gói ngôn ngữ.");
                return;
            }
            active = call;
            session = call.getString("sessionId", "");
            released = false;
            latest = "";
            call.setKeepAlive(true);
            if (getPermissionState("microphone") != PermissionState.GRANTED) {
                requestPermissionForAlias("microphone", call, "microphoneResult");
            } else begin(call);
        });
    }

    @PermissionCallback
    private void microphoneResult(PluginCall call) {
        main.post(() -> {
            if (active != call) return;
            if (getPermissionState("microphone") != PermissionState.GRANTED) {
                finish("Chưa được cấp quyền micro. Vào cài đặt Android để cho phép SK Translate dùng micro.");
            } else if (released) finish(null);
            else begin(call);
        });
    }

    private void begin(PluginCall call) {
        if (active != call || released) return;
        try {
            // Never use createSpeechRecognizer: that service may upload audio.
            recognizer = SpeechRecognizer.createOnDeviceSpeechRecognizer(getContext());
            recognizer.setRecognitionListener(new RecognitionListener() {
                public void onReadyForSpeech(Bundle params) {}
                public void onBeginningOfSpeech() {}
                public void onRmsChanged(float rms) {}
                public void onBufferReceived(byte[] buffer) {}
                public void onEndOfSpeech() {}
                public void onEvent(int type, Bundle params) {}
                public void onPartialResults(Bundle results) {
                    if (active == call) sendText(results, false);
                }
                public void onResults(Bundle results) {
                    if (active != call) return;
                    sendText(results, true);
                    finish(null);
                }
                public void onError(int error) {
                    if (active != call) return;
                    if (error == SpeechRecognizer.ERROR_NO_MATCH || error == SpeechRecognizer.ERROR_SPEECH_TIMEOUT) {
                        finish(released ? null : "no-speech");
                    } else if (error == 12 || error == 13) {
                        finish("Máy chưa có gói nhận giọng ngoại tuyến cho ngôn ngữ này. Hãy tải gói Tiếng Việt / 中文 / English trong dịch vụ giọng nói Android.");
                    } else if (error == SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS) {
                        finish("Android chưa cho phép sử dụng micro.");
                    } else {
                        finish("Nhận giọng ngoại tuyến chưa khả dụng (Android " + error + "). Hãy kiểm tra gói ngôn ngữ trên máy.");
                    }
                }
            });
            Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, call.getString("language", "vi-VN"));
            intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
            intent.putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true);
            intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
            recognizer.startListening(intent);
        } catch (Exception error) {
            finish("Không mở được nhận giọng ngoại tuyến trên Android. Hãy kiểm tra dịch vụ giọng nói và quyền micro.");
        }
    }

    private void sendText(Bundle results, boolean isFinal) {
        if (active == null || results == null) return;
        ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
        if (matches == null || matches.isEmpty()) return;
        latest = matches.get(0);
        JSObject event = new JSObject();
        event.put("text", latest);
        event.put("final", isFinal);
        active.resolve(event);
    }

    @PluginMethod
    public void stop(PluginCall call) {
        main.post(() -> {
            if (active != null && session.equals(call.getString("sessionId", ""))) {
                released = true;
                if (recognizer == null) finish(null);
                else {
                    recognizer.stopListening();
                    // Keep the last partial if the service never returns a final result.
                    timeout = () -> finish(null);
                    main.postDelayed(timeout, 900);
                }
            }
            call.resolve();
        });
    }

    private void finish(String error) {
        if (timeout != null) main.removeCallbacks(timeout);
        timeout = null;
        PluginCall call = active;
        active = null;
        if (recognizer != null) {
            recognizer.destroy();
            recognizer = null;
        }
        if (call == null) return;
        JSObject event = new JSObject();
        if (error != null) event.put("error", error);
        else {
            event.put("text", latest);
            event.put("final", true);
            event.put("done", true);
        }
        call.resolve(event);
        call.setKeepAlive(false);
        getBridge().releaseCall(call);
    }

    @Override
    protected void handleOnPause() { main.post(() -> finish("aborted")); }

    @Override
    protected void handleOnDestroy() { main.post(() -> finish("aborted")); }
}