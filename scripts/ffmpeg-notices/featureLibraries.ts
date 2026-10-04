import type { LibraryKey } from "./libraries.ts";

/**
 * Libraries linked into ffmpeg for each enabled configure feature, as named by
 * `listEnabledFeatures`. A feature's entry includes the dependencies that the BtbN
 * build scripts (github.com/BtbN/FFmpeg-Builds, `scripts.d/`) build for it.
 */
// biome-ignore format: one line per entry keeps the table easy to scan
export const featureLibraries: Record<string, LibraryKey[]> = {
  amf: ["amf"],
  chromaprint: ["chromaprint", "fftw3"],
  ffnvcodec: ["nvcodec"],
  fontconfig: ["fontconfig", "freetype", "libxml2", "libiconv"],
  gmp: ["gmp"],
  iconv: ["libiconv"],
  "lib:gomp": ["gcc_gomp"],
  "lib:iconv": ["libiconv"],
  libaom: ["aom", "vmaf"],
  libaribb24: ["aribb24", "libpng"],
  libaribcaption: ["aribcaption", "freetype", "fontconfig", "openssl"],
  libass: ["libass", "freetype", "fontconfig", "harfbuzz", "fribidi", "libunibreak", "libiconv"],
  libbluray: ["libbluray", "libudfread", "libxml2", "freetype", "fontconfig"],
  libdav1d: ["dav1d"],
  libdrm: ["libdrm", "libpciaccess"],
  libfreetype: ["freetype", "libpng", "zlib", "brotli", "harfbuzz"],
  libfribidi: ["fribidi"],
  libgme: ["gme"],
  libharfbuzz: ["harfbuzz", "freetype"],
  libjxl: ["libjxl", "highway", "brotli", "lcms2"],
  libkvazaar: ["kvazaar"],
  "liblcevc-dec": ["lcevcdec"],
  libmp3lame: ["lame"],
  liboapv: ["openapv"],
  "libopencore-amrnb": ["opencore_amr"],
  "libopencore-amrwb": ["opencore_amr"],
  libopenh264: ["openh264"],
  libopenjpeg: ["openjpeg"],
  libopenmpt: ["openmpt", "zlib", "ogg", "vorbis"],
  libopus: ["opus"],
  libplacebo: ["libplacebo", "vulkan_loader", "vulkan_headers"],
  libpulse: ["pulseaudio", "libsamplerate", "soxr", "openssl", "libiconv"],
  librav1e: ["rav1e"],
  librist: ["librist", "mbedtls"],
  librsvg: ["librsvg", "glib", "cairo", "pango", "pixman", "pcre2", "libffi", "libpng", "libxml2", "dav1d", "fontconfig", "freetype", "harfbuzz", "fribidi"],
  libshaderc: ["shaderc", "glslang", "spirv_tools", "spirv_headers", "spirv_cross"],
  libsnappy: ["snappy"],
  libsoxr: ["soxr"],
  libsrt: ["srt", "openssl"],
  libssh: ["libssh", "zlib", "openssl"],
  libsvtav1: ["svtav1"],
  libtheora: ["theora", "ogg"],
  libtwolame: ["twolame"],
  libuavs3d: ["uavs3d"],
  libvmaf: ["vmaf"],
  libvorbis: ["vorbis", "ogg"],
  libvpl: ["libvpl"],
  libvpx: ["libvpx"],
  libvvenc: ["vvenc"],
  libwebp: ["libwebp"],
  libxcb: ["libxcb"],
  libxml2: ["libxml2", "libiconv"],
  libzimg: ["zimg"],
  libzmq: ["zmq"],
  libzvbi: ["zvbi", "libiconv"],
  lv2: ["lilv"],
  lzma: ["xz"],
  openal: ["openal"],
  opencl: ["opencl"],
  openssl: ["openssl", "zlib"],
  sdl2: ["sdl2", "libsamplerate", "libiconv"],
  "target-os:mingw32": ["mingw_runtime", "winpthreads", "mingw_std_threads"],
  vaapi: ["libva"],
  vulkan: ["vulkan_loader", "vulkan_headers"],
  xlib: ["libx11", "libxcb"],
  zlib: ["zlib"],
};

/** Features that link no third-party code, or only libraries the operating system provides. */
export const featuresWithoutLibraries = new Set([
  "audiotoolbox",
  "cross-compile",
  "cuda-llvm",
  "lib:dl",
  "lib:m",
  "lib:pthread",
  "pic",
  "pthreads",
  "schannel",
  "static",
  "target-os:darwin",
  "target-os:linux",
  "version3",
  "videotoolbox",
]);

/**
 * Features a bundled build may never enable, with the reason: the GPL and nonfree switches
 * change the licence of the whole build, and the named libraries are excluded by the media
 * compatibility constraints even where their own licence would allow them.
 */
export const forbiddenFeatures: Record<string, string> = {
  gpl: "it makes the whole build GPL",
  nonfree: "it makes the build non-redistributable",
  libx264: "it is GPL",
  libx265: "it is GPL",
  libxvid: "it is GPL",
  libmp3lame: "the bundled ffmpeg must not include an MP3 encoder",
  libopenh264: "compiling an H.264 encoder brings patent exposure",
};
