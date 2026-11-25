package com.soundwave.music;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ComponentName;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Base64;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.view.WindowInsets;
import android.widget.FrameLayout;

import androidx.media3.common.C;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;
import androidx.media3.common.Player;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.session.MediaController;
import androidx.media3.session.SessionToken;
import androidx.webkit.JavaScriptReplyProxy;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;

import com.google.common.util.concurrent.ListenableFuture;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@UnstableApi
public final class MainActivity extends Activity {
    private static final String ORIGIN = "https://spotify-music-personal.vercel.app";
    private static final int OPEN_AUDIO = 1;
    private static final String CACHE_KEY = "[a-zA-Z0-9_-]{1,80}";
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final List<JSONObject> pendingCommands = new ArrayList<>();
    private WebView webView;
    private ListenableFuture<MediaController> controllerFuture;
    private MediaController controller;
    private JavaScriptReplyProxy webClient;
    private ValueCallback<Uri[]> filePicker;
    private boolean visible;
    private int playbackRequest;

    private final Runnable updatePosition = new Runnable() {
        @Override
        public void run() {
            publishState();
            handler.postDelayed(this, 500);
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        FrameLayout container = new FrameLayout(this);
        container.setBackgroundColor(Color.BLACK);
        container.setOnApplyWindowInsetsListener((view, insets) -> {
            if (Build.VERSION.SDK_INT >= 30) {
                var bars = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            } else {
                view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                        insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            }
            return insets;
        });
        webView = new WebView(this);
        webView.setBackgroundColor(Color.BLACK);
        webView.getSettings().setJavaScriptEnabled(true);
        webView.getSettings().setDomStorageEnabled(true);
        webView.getSettings().setAllowFileAccess(false);
        webView.getSettings().setAllowContentAccess(false);
        webView.getSettings().setUserAgentString(webView.getSettings().getUserAgentString() + " SoundWaveAndroid/1");
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (!request.isForMainFrame() || isSoundWave(uri)) return false;
                if ("https".equals(uri.getScheme()) || "http".equals(uri.getScheme())) {
                    try {
                        startActivity(new Intent(Intent.ACTION_VIEW, uri));
                    } catch (ActivityNotFoundException ignored) {
                    }
                }
                return true;
            }

            @Override
            public void onPageStarted(WebView view, String url, android.graphics.Bitmap icon) {
                webClient = null;
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                                             FileChooserParams params) {
                if (filePicker != null) filePicker.onReceiveValue(null);
                filePicker = callback;
                try {
                    startActivityForResult(params.createIntent(), OPEN_AUDIO);
                } catch (ActivityNotFoundException error) {
                    filePicker = null;
                    callback.onReceiveValue(null);
                }
                return true;
            }
        });
        if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            WebViewCompat.addWebMessageListener(webView, "SoundWaveAndroid",
                    Collections.singleton(ORIGIN), (view, message, source, isMainFrame, reply) -> {
                        if (isMainFrame && isSoundWave(source)) handleMessage(message.getData(), reply);
                    });
        }
        container.addView(webView, new FrameLayout.LayoutParams(-1, -1));
        setContentView(container);
        connectController();
        if (savedInstanceState == null || webView.restoreState(savedInstanceState) == null) {
            webView.loadUrl(ORIGIN + "/");
        }
    }

    private boolean isSoundWave(Uri uri) {
        return "https".equals(uri.getScheme())
                && "spotify-music-personal.vercel.app".equals(uri.getHost())
                && (uri.getPort() == -1 || uri.getPort() == 443)
                && uri.getUserInfo() == null;
    }

    private void connectController() {
        SessionToken token = new SessionToken(this, new ComponentName(this, PlaybackService.class));
        controllerFuture = new MediaController.Builder(this, token).buildAsync();
        controllerFuture.addListener(() -> {
            if (isDestroyed()) return;
            try {
                controller = controllerFuture.get();
                controller.addListener(new Player.Listener() {
                    @Override
                    public void onEvents(Player player, Player.Events events) {
                        publishState();
                    }
                });
                for (JSONObject command : pendingCommands) dispatch(command);
                pendingCommands.clear();
                publishState();
            } catch (Exception error) {
                publishError("", "Không kết nối được trình phát Android.");
            }
        }, this::runOnUiThread);
    }

    private void handleMessage(String payload, JavaScriptReplyProxy reply) {
        if (payload == null || payload.length() > 350_000) return;
        webClient = reply;
        try {
            JSONObject command = new JSONObject(payload);
            if ("file".equals(command.getString("action"))) {
                writeAudioFile(command);
            } else if (controller == null) {
                if (pendingCommands.size() < 30) pendingCommands.add(command);
            } else {
                dispatch(command);
            }
        } catch (IOException | JSONException | IllegalArgumentException error) {
            publishError("", "Không đọc được yêu cầu phát nhạc.");
        }
    }

    private void dispatch(JSONObject command) {
        String action = command.optString("action");
        try {
            switch (action) {
                case "sync":
                    publishState();
                    break;
                case "play":
                    MediaItem song = toMediaItem(command.getJSONObject("song"));
                    if (song == null) throw new IllegalArgumentException("Missing audio");
                    List<MediaItem> playlist = new ArrayList<>();
                    playlist.add(song);
                    playlist.addAll(toItems(command.optJSONArray("queue")));
                    playbackRequest = command.optInt("request");
                    controller.setMediaItems(playlist, 0, milliseconds(command, "position"));
                    controller.setPlayWhenReady(command.optBoolean("autoplay", true));
                    controller.prepare();
                    break;
                case "queue":
                    if (controller.getMediaItemCount() == 0
                            || !controller.getCurrentMediaItem().mediaId.equals(command.optString("currentId"))) return;
                    int next = controller.getCurrentMediaItemIndex() + 1;
                    controller.replaceMediaItems(next, controller.getMediaItemCount(),
                            toItems(command.optJSONArray("queue")));
                    break;
                case "resume":
                    if (controller.getPlaybackState() == Player.STATE_ENDED) controller.seekTo(0);
                    if (controller.getPlaybackState() == Player.STATE_IDLE) controller.prepare();
                    controller.play();
                    break;
                case "pause":
                    controller.pause();
                    break;
                case "stop":
                    controller.pause();
                    controller.clearMediaItems();
                    break;
                case "seek":
                    controller.seekTo(milliseconds(command, "position"));
                    break;
                case "next":
                    if (controller.hasNextMediaItem()) controller.seekToNextMediaItem();
                    break;
                case "previous":
                    controller.seekToPrevious();
                    break;
                case "rate":
                    controller.setPlaybackSpeed((float) Math.max(0.25, Math.min(4, command.getDouble("value"))));
                    break;
                case "volume":
                    controller.setVolume((float) Math.max(0, Math.min(1, command.getDouble("value"))));
                    break;
                case "shuffle":
                    controller.setShuffleModeEnabled(command.optBoolean("enabled"));
                    break;
                case "repeat":
                    String mode = command.optString("mode");
                    controller.setRepeatMode("one".equals(mode) ? Player.REPEAT_MODE_ONE
                            : "all".equals(mode) ? Player.REPEAT_MODE_ALL : Player.REPEAT_MODE_OFF);
                    break;
                default:
                    return;
            }
        } catch (JSONException | IllegalArgumentException error) {
            publishError(command.optString("id"), "Không mở được nguồn nhạc Android.");
        }
    }

    private long milliseconds(JSONObject command, String key) {
        return Math.max(0, Math.round(command.optDouble(key, 0) * 1000));
    }

    private List<MediaItem> toItems(JSONArray tracks) throws JSONException {
        List<MediaItem> items = new ArrayList<>();
        if (tracks == null) return items;
        for (int i = 0; i < tracks.length(); i++) {
            MediaItem item = toMediaItem(tracks.getJSONObject(i));
            if (item != null) items.add(item);
        }
        return items;
    }

    private MediaItem toMediaItem(JSONObject song) throws JSONException {
        Uri media;
        String key = song.optString("cacheKey");
        if (!key.isEmpty()) {
            File file = audioCache(key);
            if (!file.isFile()) return null;
            media = Uri.fromFile(file);
        } else {
            media = httpsUri(song.optString("url"));
            if (media == null) return null;
        }
        MediaMetadata.Builder metadata = new MediaMetadata.Builder()
                .setTitle(song.optString("title"))
                .setArtist(song.optString("artist"))
                .setAlbumTitle(song.optString("album"));
        Uri artwork = httpsUri(song.optString("artwork"));
        if (artwork != null) metadata.setArtworkUri(artwork);
        return new MediaItem.Builder()
                .setMediaId(song.getString("id"))
                .setUri(media)
                .setMediaMetadata(metadata.build())
                .build();
    }

    private Uri httpsUri(String value) {
        Uri uri = Uri.parse(value);
        return "https".equals(uri.getScheme()) && uri.getHost() != null ? uri : null;
    }

    private File audioCache(String key) {
        if (!key.matches(CACHE_KEY)) throw new IllegalArgumentException("Invalid audio cache key");
        File folder = new File(getCacheDir(), "audio");
        folder.mkdirs();
        return new File(folder, key);
    }

    private void writeAudioFile(JSONObject command) throws IOException, JSONException {
        String key = command.getString("key");
        File target = audioCache(key);
        File temporary = new File(target.getParentFile(), key + ".partial");
        boolean first = command.optBoolean("first");
        if (!first && !temporary.isFile()) throw new IOException("Missing initial audio chunk");
        try (FileOutputStream file = new FileOutputStream(temporary, !first)) {
            file.write(Base64.decode(command.getString("data"), Base64.NO_WRAP));
        } catch (IOException | IllegalArgumentException error) {
            temporary.delete();
            throw error;
        }
        if (command.optBoolean("last") && !temporary.renameTo(target)) {
            temporary.delete();
            throw new IOException("Could not save audio");
        }
    }

    private void publishError(String id, String message) {
        JSONObject error = new JSONObject();
        try {
            error.put("type", "error").put("id", id).put("message", message);
            if (webClient != null) webClient.postMessage(error.toString());
        } catch (JSONException | IllegalStateException ignored) {
        }
    }

    private void publishState() {
        if (controller == null || webClient == null || !visible) return;
        try {
            MediaItem item = controller.getCurrentMediaItem();
            long duration = controller.getDuration();
            JSONObject state = new JSONObject()
                    .put("type", "state")
                    .put("id", item == null ? "" : item.mediaId)
                    .put("request", playbackRequest)
                    .put("playing", controller.getPlayWhenReady()
                            && controller.getPlaybackState() != Player.STATE_ENDED
                            && controller.getPlaybackState() != Player.STATE_IDLE)
                    .put("position", controller.getCurrentPosition() / 1000.0)
                    .put("duration", duration == C.TIME_UNSET ? 0 : duration / 1000.0)
                    .put("error", controller.getPlayerError() != null);
            webClient.postMessage(state.toString());
        } catch (JSONException | IllegalStateException ignored) {
        }
    }

    @Override
    protected void onStart() {
        super.onStart();
        visible = true;
        handler.post(updatePosition);
    }

    @Override
    protected void onStop() {
        visible = false;
        handler.removeCallbacks(updatePosition);
        super.onStop();
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == OPEN_AUDIO && filePicker != null) {
            filePicker.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data));
            filePicker = null;
        }
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) webView.goBack();
        else moveTaskToBack(true);
    }

    @Override
    protected void onDestroy() {
        if (filePicker != null) filePicker.onReceiveValue(null);
        if (controllerFuture != null) MediaController.releaseFuture(controllerFuture);
        webClient = null;
        ((FrameLayout) webView.getParent()).removeView(webView);
        webView.destroy();
        super.onDestroy();
    }
}
