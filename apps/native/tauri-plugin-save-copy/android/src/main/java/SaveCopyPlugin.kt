package com.easyimmerse.savecopy

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.provider.DocumentsContract
import androidx.activity.result.ActivityResult
import app.tauri.Logger
import app.tauri.annotation.ActivityCallback
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import java.io.BufferedInputStream
import java.io.BufferedOutputStream
import java.io.File
import java.io.FileInputStream
import java.io.IOException
import kotlin.concurrent.thread

@InvokeArg
class SaveCopyArgs {
  lateinit var path: String
  lateinit var fileName: String
  var mimeType: String = "application/octet-stream"
}

/**
 * Lets the user keep a copy of a file the app wrote, through the system's document picker.
 * The file is deleted once the user has kept a copy, cancelled, or the copy failed.
 */
@TauriPlugin
class SaveCopyPlugin(private val activity: Activity) : Plugin(activity) {
  @Command
  fun saveCopy(invoke: Invoke) {
    try {
      val args = invoke.parseArgs(SaveCopyArgs::class.java)
      val intent = Intent(Intent.ACTION_CREATE_DOCUMENT)
      intent.addCategory(Intent.CATEGORY_OPENABLE)
      intent.type = args.mimeType
      intent.putExtra(Intent.EXTRA_TITLE, args.fileName)
      startActivityForResult(invoke, intent, "saveCopyResult")
    } catch (ex: Exception) {
      rejectWith(invoke, ex, "Could not open the save picker")
    }
  }

  @ActivityCallback
  fun saveCopyResult(invoke: Invoke, result: ActivityResult) {
    val staged: File
    try {
      staged = File(invoke.parseArgs(SaveCopyArgs::class.java).path)
    } catch (ex: Exception) {
      rejectWith(invoke, ex, "Could not read the file to save")
      return
    }
    val uri = result.data?.data
    when {
      result.resultCode == Activity.RESULT_OK && uri != null -> copyInBackground(invoke, staged, uri)
      result.resultCode == Activity.RESULT_CANCELED -> {
        staged.delete()
        invoke.resolve(savedResult(false))
      }
      else -> {
        staged.delete()
        invoke.reject("The save picker chose no location")
      }
    }
  }

  /** Copies off the main thread, since a package with media can take a while to write. */
  private fun copyInBackground(invoke: Invoke, staged: File, uri: Uri) {
    thread {
      try {
        copyInto(staged, uri)
        invoke.resolve(savedResult(true))
      } catch (ex: Exception) {
        deletePartialCopy(uri)
        rejectWith(invoke, ex, "Could not save the copy")
      } finally {
        staged.delete()
      }
    }
  }

  private fun copyInto(staged: File, uri: Uri) {
    val output = activity.contentResolver.openOutputStream(uri)
      ?: throw IOException("Could not open the chosen location")
    BufferedOutputStream(output).use { buffered ->
      BufferedInputStream(FileInputStream(staged)).use { input -> input.copyTo(buffered) }
    }
  }

  /** Removes the document the picker created, so that a failed copy leaves no empty or truncated file. */
  private fun deletePartialCopy(uri: Uri) {
    try {
      DocumentsContract.deleteDocument(activity.contentResolver, uri)
    } catch (ex: Exception) {
      Logger.error(ex.message ?: "Could not delete the partial copy")
    }
  }

  private fun savedResult(saved: Boolean): JSObject {
    val result = JSObject()
    result.put("saved", saved)
    return result
  }

  private fun rejectWith(invoke: Invoke, ex: Exception, fallback: String) {
    val message = ex.message ?: fallback
    Logger.error(message)
    invoke.reject(message)
  }
}
