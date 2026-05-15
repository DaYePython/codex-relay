package com.directfetch

import com.margelo.nitro.core.Promise
import com.margelo.nitro.directfetch.DirectFetchDownloadRequest
import com.margelo.nitro.directfetch.DirectFetchDownloadResponse
import com.margelo.nitro.directfetch.DirectFetchRequest
import com.margelo.nitro.directfetch.DirectFetchResponse
import com.margelo.nitro.directfetch.DirectFetchStreamChunk
import com.margelo.nitro.directfetch.HybridDirectFetchSpec
import java.io.File
import java.io.FileOutputStream
import java.net.URI
import java.net.HttpURLConnection
import java.net.URL
import org.json.JSONArray
import org.json.JSONObject

class HybridDirectFetch: HybridDirectFetchSpec() {
    override fun fetch(request: DirectFetchRequest): Promise<DirectFetchResponse> {
        val promise = Promise<DirectFetchResponse>()
        Thread {
            try {
                promise.resolve(performRequest(request))
            } catch (error: Throwable) {
                promise.reject(error)
            }
        }.start()
        return promise
    }

    override fun download(request: DirectFetchDownloadRequest): Promise<DirectFetchDownloadResponse> {
        val promise = Promise<DirectFetchDownloadResponse>()
        Thread {
            try {
                promise.resolve(performDownloadRequest(request))
            } catch (error: Throwable) {
                promise.reject(error)
            }
        }.start()
        return promise
    }

    override fun stream(
        request: DirectFetchRequest,
        onChunk: (chunk: DirectFetchStreamChunk) -> Unit
    ): Promise<DirectFetchResponse> {
        val promise = Promise<DirectFetchResponse>()
        Thread {
            try {
                promise.resolve(performStreamingRequest(request, onChunk))
            } catch (error: Throwable) {
                promise.reject(error)
            }
        }.start()
        return promise
    }

    private fun performRequest(request: DirectFetchRequest): DirectFetchResponse {
        val connection = URL(request.url).openConnection() as HttpURLConnection
        connection.requestMethod = (request.method ?: "GET").uppercase()
        connection.instanceFollowRedirects = true
        request.timeoutMs?.let {
            val timeout = it.toInt()
            connection.connectTimeout = timeout
            connection.readTimeout = timeout
        }
        decodeHeaders(request.headersJson).forEach { (key, value) ->
            connection.setRequestProperty(key, value)
        }
        request.bodyString?.let { body ->
            connection.doOutput = true
            connection.outputStream.use { stream ->
                stream.write(body.toByteArray(Charsets.UTF_8))
            }
        }

        val status = connection.responseCode
        val finalUrl = connection.url.toString()
        val statusText = connection.responseMessage ?: ""
        val headers = connection.headerFields
            .filterKeys { it != null }
            .flatMap { (key, values) ->
                values.orEmpty().map { value -> key to value }
            }
        val body = try {
            val stream = if (status >= 400) connection.errorStream else connection.inputStream
            stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() } ?: ""
        } finally {
            connection.disconnect()
        }

        return DirectFetchResponse(
            finalUrl,
            status.toDouble(),
            statusText,
            encodeHeaders(headers),
            body
        )
    }

    private fun performDownloadRequest(request: DirectFetchDownloadRequest): DirectFetchDownloadResponse {
        val connection = URL(request.url).openConnection() as HttpURLConnection
        connection.requestMethod = (request.method ?: "GET").uppercase()
        connection.instanceFollowRedirects = true
        request.timeoutMs?.let {
            val timeout = it.toInt()
            connection.connectTimeout = timeout
            connection.readTimeout = timeout
        }
        decodeHeaders(request.headersJson).forEach { (key, value) ->
            connection.setRequestProperty(key, value)
        }
        request.bodyString?.let { body ->
            connection.doOutput = true
            connection.outputStream.use { stream ->
                stream.write(body.toByteArray(Charsets.UTF_8))
            }
        }

        val status = connection.responseCode
        val finalUrl = connection.url.toString()
        val statusText = connection.responseMessage ?: ""
        val headers = connection.headerFields
            .filterKeys { it != null }
            .flatMap { (key, values) ->
                values.orEmpty().map { value -> key to value }
            }
        val destination = fileFromUri(request.fileUri)
        destination.parentFile?.mkdirs()
        val tempDestination = File(destination.absolutePath + ".direct-fetch.tmp")
        tempDestination.delete()

        var bytesWritten = 0L
        try {
            val stream = if (status >= 400) connection.errorStream else connection.inputStream
            FileOutputStream(tempDestination).use { output ->
                if (stream != null) {
                    stream.use { input ->
                        val buffer = ByteArray(DEFAULT_BUFFER_SIZE)
                        while (true) {
                            val read = input.read(buffer)
                            if (read < 0) {
                                break
                            }
                            if (read == 0) {
                                continue
                            }
                            output.write(buffer, 0, read)
                            bytesWritten += read
                        }
                    }
                }
            }
            if (destination.exists() && !destination.delete()) {
                throw IllegalStateException("Failed to replace existing file: ${request.fileUri}")
            }
            if (!tempDestination.renameTo(destination)) {
                tempDestination.copyTo(destination, overwrite = true)
                tempDestination.delete()
            }
        } finally {
            connection.disconnect()
            tempDestination.delete()
        }

        return DirectFetchDownloadResponse(
            finalUrl,
            status.toDouble(),
            statusText,
            encodeHeaders(headers),
            request.fileUri,
            bytesWritten.toDouble()
        )
    }

    private fun performStreamingRequest(
        request: DirectFetchRequest,
        onChunk: (chunk: DirectFetchStreamChunk) -> Unit
    ): DirectFetchResponse {
        val connection = URL(request.url).openConnection() as HttpURLConnection
        connection.requestMethod = (request.method ?: "GET").uppercase()
        connection.instanceFollowRedirects = true
        request.timeoutMs?.let {
            val timeout = it.toInt()
            connection.connectTimeout = timeout
            connection.readTimeout = timeout
        }
        decodeHeaders(request.headersJson).forEach { (key, value) ->
            connection.setRequestProperty(key, value)
        }
        request.bodyString?.let { body ->
            connection.doOutput = true
            connection.outputStream.use { stream ->
                stream.write(body.toByteArray(Charsets.UTF_8))
            }
        }

        val status = connection.responseCode
        val finalUrl = connection.url.toString()
        val statusText = connection.responseMessage ?: ""
        val headers = connection.headerFields
            .filterKeys { it != null }
            .flatMap { (key, values) ->
                values.orEmpty().map { value -> key to value }
            }
        val body = StringBuilder()
        try {
            val stream = if (status >= 400) connection.errorStream else connection.inputStream
            stream?.bufferedReader(Charsets.UTF_8)?.use { reader ->
                val buffer = CharArray(4096)
                while (true) {
                    val read = reader.read(buffer)
                    if (read < 0) {
                        break
                    }
                    if (read == 0) {
                        continue
                    }
                    val text = String(buffer, 0, read)
                    body.append(text)
                    if (status < 400) {
                        onChunk(DirectFetchStreamChunk(text))
                    }
                }
            }
        } finally {
            connection.disconnect()
        }

        return DirectFetchResponse(
            finalUrl,
            status.toDouble(),
            statusText,
            encodeHeaders(headers),
            body.toString()
        )
    }

    private fun decodeHeaders(headersJson: String?): List<Pair<String, String>> {
        if (headersJson.isNullOrBlank()) {
            return emptyList()
        }
        val headers = JSONArray(headersJson)
        return (0 until headers.length()).mapNotNull { index ->
            val header = headers.optJSONObject(index) ?: return@mapNotNull null
            val key = header.optString("key", "")
            val value = header.optString("value", "")
            if (key.isBlank()) {
                null
            } else {
                key to value
            }
        }
    }

    private fun encodeHeaders(headers: List<Pair<String, String>>): String {
        val array = JSONArray()
        headers.forEach { (key, value) ->
            array.put(JSONObject().put("key", key).put("value", value))
        }
        return array.toString()
    }

    private fun fileFromUri(fileUri: String): File {
        return if (fileUri.startsWith("file://")) {
            File(URI(fileUri))
        } else {
            File(fileUri)
        }
    }
}
