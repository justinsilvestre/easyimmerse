// swift-tools-version:5.3

import PackageDescription

let package = Package(
  name: "tauri-plugin-save-copy",
  platforms: [
    .macOS(.v10_13),
    .iOS(.v14),
  ],
  products: [
    .library(
      name: "tauri-plugin-save-copy",
      type: .static,
      targets: ["tauri-plugin-save-copy"])
  ],
  dependencies: [
    .package(name: "Tauri", path: "../.tauri/tauri-api")
  ],
  targets: [
    .target(
      name: "tauri-plugin-save-copy",
      dependencies: [
        .byName(name: "Tauri")
      ],
      path: "Sources")
  ]
)
