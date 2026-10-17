import Foundation
import Tauri
import UIKit

struct SaveCopyArgs: Decodable {
  let path: String
  let fileName: String
  var mimeType: String?
}

/// Lets the user keep a copy of a file the app wrote, through the document picker in export mode.
/// The file is deleted once the user has kept a copy or cancelled.
class SaveCopyPlugin: Plugin {
  /// The picker holds its delegate weakly, so the plugin keeps it until the picker answers.
  private var pickerDelegate: ExportPickerDelegate?

  @objc public func saveCopy(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(SaveCopyArgs.self)
    let staged = URL(fileURLWithPath: args.path)
    let exported = try namedForExport(staged, args.fileName)
    let removeFiles = { removeExported(exported, staged) }
    DispatchQueue.main.async {
      self.presentPicker(exporting: exported, invoke, removeFiles)
    }
  }

  private func presentPicker(
    exporting file: URL, _ invoke: Invoke, _ removeFiles: @escaping () -> Void
  ) {
    guard let presenter = manager.viewController else {
      removeFiles()
      invoke.reject("No view is available to present the save picker from")
      return
    }
    let picker = UIDocumentPickerViewController(forExporting: [file], asCopy: true)
    let delegate = ExportPickerDelegate { [weak self] saved in
      self?.pickerDelegate = nil
      removeFiles()
      invoke.resolve(["saved": saved])
    }
    pickerDelegate = delegate
    picker.delegate = delegate
    presenter.present(picker, animated: true, completion: nil)
  }
}

/// Answers once with whether the user kept a copy.
class ExportPickerDelegate: NSObject, UIDocumentPickerDelegate {
  private let onFinish: (Bool) -> Void

  init(onFinish: @escaping (Bool) -> Void) {
    self.onFinish = onFinish
  }

  func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL])
  {
    onFinish(true)
  }

  func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
    onFinish(false)
  }
}

/// The picker names the copy after the file it exports, so a file with another name is moved into a fresh directory under the name the copy should have.
private func namedForExport(_ staged: URL, _ fileName: String) throws -> URL {
  if staged.lastPathComponent == fileName {
    return staged
  }
  let directory = staged.deletingLastPathComponent().appendingPathComponent(UUID().uuidString)
  try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
  let renamed = directory.appendingPathComponent(fileName)
  try FileManager.default.moveItem(at: staged, to: renamed)
  return renamed
}

/// Deletes the exported file, and the directory it was moved into when it was renamed.
private func removeExported(_ exported: URL, _ staged: URL) {
  try? FileManager.default.removeItem(at: exported)
  if exported != staged {
    try? FileManager.default.removeItem(at: exported.deletingLastPathComponent())
  }
}

@_cdecl("init_plugin_save_copy")
func initPlugin() -> Plugin {
  return SaveCopyPlugin()
}
