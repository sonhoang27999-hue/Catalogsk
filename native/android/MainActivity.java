package app.sktranslate.mobile;

import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.io.ByteArrayOutputStream;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(OfflineSpeechPlugin.class);
        super.onCreate(savedInstanceState);
        // The APK supplies the adapter even when the published site is not updated.
        bridge.setWebViewClient(new BridgeWebViewClient(bridge) {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                // A bundled build has no server.url: the app is served from the WebView's own files,
                // so the adapter is injected there too. A URL build must stay on its configured site.
                String appUrl = bridge.getConfig().getServerUrl();
                if (appUrl != null && !url.startsWith(appUrl)) return;
                try (InputStream in = getAssets().open("speech-bridge.js")) {
                    ByteArrayOutputStream out = new ByteArrayOutputStream();
                    byte[] buffer = new byte[4096];
                    int count;
                    while ((count = in.read(buffer)) != -1) out.write(buffer, 0, count);
                    view.evaluateJavascript(new String(out.toByteArray(), StandardCharsets.UTF_8), null);
                } catch (Exception error) {
                    android.util.Log.e("SKTranslate", "Cannot load microphone adapter", error);
                }
            }
        });
    }
}