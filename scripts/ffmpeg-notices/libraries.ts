/** A third-party library that can end up statically linked into an ffmpeg build. */
export interface Library {
  name: string;
  /** SPDX license expression; `OR` offers a choice, `WITH` adds an exception. */
  license: string;
  /** Plain-text license file, fetched once by the generator. */
  licenseUrl: string;
  /** Keeps only the first lines of the file, for a license that heads a source file. */
  licenseLineCount?: number;
}

const github = (repo: string, path: string) =>
  `https://raw.githubusercontent.com/${repo}/${path}`;
const freedesktop = (repo: string, path: string) =>
  `https://gitlab.freedesktop.org/${repo}/-/raw/${path}`;
const videolan = (repo: string, path: string) =>
  `https://code.videolan.org/${repo}/-/raw/${path}`;
const sourceforge = (project: string, path: string) =>
  `https://sourceforge.net/p/${project}/ci/master/tree/${path}?format=raw`;

/**
 * Libraries that ffmpeg configure flags bring in, including the dependencies the BtbN
 * build scripts link along with them. Licenses were read from each project's license file.
 */
// biome-ignore format: one line per entry keeps the table easy to scan
export const libraries = {
  amf: { name: "AMF", license: "MIT", licenseUrl: github("GPUOpen-LibrariesAndSDKs/AMF", "master/LICENSE.txt") },
  aom: { name: "libaom", license: "BSD-2-Clause", licenseUrl: "https://aomedia.googlesource.com/aom/+/refs/heads/main/LICENSE?format=TEXT" },
  aribb24: { name: "aribb24", license: "LGPL-3.0-or-later", licenseUrl: github("nkoriyama/aribb24", "master/COPYING") },
  aribcaption: { name: "libaribcaption", license: "MIT", licenseUrl: github("xqq/libaribcaption", "master/LICENSE") },
  brotli: { name: "Brotli", license: "MIT", licenseUrl: github("google/brotli", "master/LICENSE") },
  cairo: { name: "cairo", license: "LGPL-2.1-only OR MPL-1.1", licenseUrl: freedesktop("cairo/cairo", "master/COPYING-LGPL-2.1") },
  chromaprint: { name: "Chromaprint", license: "MIT AND LGPL-2.1-only", licenseUrl: github("acoustid/chromaprint", "master/LICENSE.md") },
  dav1d: { name: "dav1d", license: "BSD-2-Clause", licenseUrl: videolan("videolan/dav1d", "master/COPYING") },
  fftw3: { name: "FFTW", license: "GPL-2.0-or-later", licenseUrl: github("FFTW/fftw3", "master/COPYING") },
  fontconfig: { name: "Fontconfig", license: "HPND-sell-variant", licenseUrl: freedesktop("fontconfig/fontconfig", "main/COPYING") },
  freetype: { name: "FreeType", license: "FTL OR GPL-2.0-or-later", licenseUrl: freedesktop("freetype/freetype", "master/docs/FTL.TXT") },
  fribidi: { name: "GNU FriBidi", license: "LGPL-2.1-or-later", licenseUrl: github("fribidi/fribidi", "master/COPYING") },
  gcc_gomp: { name: "GNU Offloading and Multi Processing Runtime Library (libgomp)", license: "GPL-3.0-or-later WITH GCC-exception-3.1", licenseUrl: github("gcc-mirror/gcc", "master/COPYING.RUNTIME") },
  glib: { name: "GLib", license: "LGPL-2.1-or-later", licenseUrl: github("GNOME/glib", "main/COPYING") },
  glslang: { name: "glslang", license: "BSD-3-Clause AND BSD-2-Clause AND MIT AND Apache-2.0 AND GPL-3.0-or-later WITH Bison-exception-2.2", licenseUrl: github("KhronosGroup/glslang", "main/LICENSE.txt") },
  gme: { name: "Game_Music_Emu", license: "LGPL-2.1-or-later", licenseUrl: github("libgme/game-music-emu", "master/license.txt") },
  gmp: { name: "GNU MP", license: "LGPL-3.0-or-later OR GPL-2.0-or-later", licenseUrl: "https://www.gnu.org/licenses/lgpl-3.0.txt" },
  harfbuzz: { name: "HarfBuzz", license: "MIT-Modern-Variant", licenseUrl: github("harfbuzz/harfbuzz", "main/COPYING") },
  highway: { name: "Highway", license: "Apache-2.0 OR BSD-3-Clause", licenseUrl: github("google/highway", "master/LICENSE") },
  kvazaar: { name: "Kvazaar", license: "BSD-3-Clause", licenseUrl: github("ultravideo/kvazaar", "master/LICENSE") },
  lame: { name: "LAME", license: "LGPL-2.0-or-later", licenseUrl: "https://sourceforge.net/p/lame/svn/HEAD/tree/trunk/lame/COPYING?format=raw" },
  lcevcdec: { name: "LCEVCdec", license: "BSD-3-Clause-Clear", licenseUrl: github("v-novaltd/LCEVCdec", "main/LICENSE.md") },
  lcms2: { name: "Little CMS", license: "MIT", licenseUrl: github("mm2/Little-CMS", "master/LICENSE") },
  libass: { name: "libass", license: "ISC", licenseUrl: github("libass/libass", "master/COPYING") },
  libbluray: { name: "libbluray", license: "LGPL-2.1-or-later", licenseUrl: videolan("videolan/libbluray", "master/COPYING") },
  libdrm: { name: "libdrm", license: "MIT", licenseUrl: freedesktop("mesa/libdrm", "libdrm-2.4.125/xf86drm.h"), licenseLineCount: 33 },
  libffi: { name: "libffi", license: "MIT", licenseUrl: github("libffi/libffi", "master/LICENSE") },
  libiconv: { name: "GNU libiconv", license: "LGPL-2.1-or-later", licenseUrl: "https://git.savannah.gnu.org/cgit/libiconv.git/plain/COPYING.LIB" },
  libjxl: { name: "libjxl", license: "BSD-3-Clause", licenseUrl: github("libjxl/libjxl", "main/LICENSE") },
  libpciaccess: { name: "libpciaccess", license: "MIT", licenseUrl: freedesktop("xorg/lib/libpciaccess", "master/COPYING") },
  libplacebo: { name: "libplacebo", license: "LGPL-2.1-or-later", licenseUrl: videolan("videolan/libplacebo", "master/LICENSE") },
  libpng: { name: "libpng", license: "libpng-2.0", licenseUrl: github("pnggroup/libpng", "libpng16/LICENSE") },
  librist: { name: "librist", license: "BSD-2-Clause", licenseUrl: videolan("rist/librist", "master/COPYING") },
  librsvg: { name: "librsvg", license: "LGPL-2.1-or-later", licenseUrl: github("GNOME/librsvg", "main/COPYING.LIB") },
  libsamplerate: { name: "libsamplerate", license: "BSD-2-Clause", licenseUrl: github("libsndfile/libsamplerate", "master/COPYING") },
  libssh: { name: "libssh", license: "LGPL-2.1-or-later", licenseUrl: "https://gitlab.com/libssh/libssh-mirror/-/raw/master/COPYING" },
  libudfread: { name: "libudfread", license: "LGPL-2.1-or-later", licenseUrl: videolan("videolan/libudfread", "master/COPYING") },
  libunibreak: { name: "libunibreak", license: "Zlib", licenseUrl: github("adah1972/libunibreak", "master/LICENCE") },
  libva: { name: "libva", license: "MIT", licenseUrl: github("intel/libva", "master/COPYING") },
  libvpl: { name: "Intel VPL", license: "MIT", licenseUrl: github("intel/libvpl", "main/LICENSE") },
  libvpx: { name: "libvpx", license: "BSD-3-Clause", licenseUrl: github("webmproject/libvpx", "main/LICENSE") },
  libwebp: { name: "libwebp", license: "BSD-3-Clause", licenseUrl: github("webmproject/libwebp", "main/COPYING") },
  libx11: { name: "libX11 and the X extension libraries", license: "MIT AND X11", licenseUrl: freedesktop("xorg/lib/libx11", "master/COPYING") },
  libxcb: { name: "libxcb and libXau", license: "X11", licenseUrl: freedesktop("xorg/lib/libxcb", "master/COPYING") },
  libxml2: { name: "libxml2", license: "MIT", licenseUrl: github("GNOME/libxml2", "master/Copyright") },
  lilv: { name: "Lilv, Serd, Sord, Sratom, Zix and LV2", license: "ISC", licenseUrl: github("lv2/lilv", "main/COPYING") },
  mbedtls: { name: "Mbed TLS", license: "Apache-2.0 OR GPL-2.0-or-later", licenseUrl: github("Mbed-TLS/mbedtls", "development/LICENSE") },
  mingw_runtime: { name: "MinGW-w64 runtime", license: "ZPL-2.1 AND LicenseRef-MinGW-w64-runtime", licenseUrl: sourceforge("mingw-w64/mingw-w64", "COPYING.MinGW-w64-runtime/COPYING.MinGW-w64-runtime.txt") },
  mingw_std_threads: { name: "mingw-std-threads", license: "BSD-2-Clause", licenseUrl: github("meganz/mingw-std-threads", "master/LICENSE") },
  nvcodec: { name: "FFmpeg nv-codec-headers", license: "MIT", licenseUrl: github("FFmpeg/nv-codec-headers", "master/include/ffnvcodec/nvEncodeAPI.h"), licenseLineCount: 26 },
  ogg: { name: "libogg", license: "BSD-3-Clause", licenseUrl: github("xiph/ogg", "master/COPYING") },
  openal: { name: "OpenAL Soft", license: "LGPL-2.0-or-later", licenseUrl: github("kcat/openal-soft", "master/COPYING") },
  openapv: { name: "OpenAPV", license: "BSD-3-Clause", licenseUrl: github("AcademySoftwareFoundation/openapv", "main/LICENSE") },
  opencl: { name: "OpenCL ICD Loader and headers", license: "Apache-2.0", licenseUrl: github("KhronosGroup/OpenCL-ICD-Loader", "main/LICENSE") },
  opencore_amr: { name: "OpenCORE AMR", license: "Apache-2.0", licenseUrl: sourceforge("opencore-amr/code", "LICENSE") },
  openh264: { name: "OpenH264", license: "BSD-2-Clause", licenseUrl: github("cisco/openh264", "master/LICENSE") },
  openjpeg: { name: "OpenJPEG", license: "BSD-2-Clause", licenseUrl: github("uclouvain/openjpeg", "master/LICENSE") },
  openmpt: { name: "libopenmpt", license: "BSD-3-Clause", licenseUrl: github("OpenMPT/openmpt", "master/LICENSE") },
  openssl: { name: "OpenSSL", license: "Apache-2.0", licenseUrl: github("openssl/openssl", "master/LICENSE.txt") },
  opus: { name: "Opus", license: "BSD-3-Clause", licenseUrl: github("xiph/opus", "main/COPYING") },
  pango: { name: "Pango", license: "LGPL-2.0-or-later", licenseUrl: github("GNOME/pango", "main/COPYING") },
  pcre2: { name: "PCRE2", license: "BSD-3-Clause WITH PCRE2-exception", licenseUrl: github("PCRE2Project/pcre2", "master/LICENCE.md") },
  pixman: { name: "pixman", license: "MIT", licenseUrl: freedesktop("pixman/pixman", "master/COPYING") },
  pulseaudio: { name: "PulseAudio client library", license: "LGPL-2.1-or-later", licenseUrl: freedesktop("pulseaudio/pulseaudio", "master/LGPL") },
  rav1e: { name: "rav1e", license: "BSD-2-Clause", licenseUrl: github("xiph/rav1e", "master/LICENSE") },
  sdl2: { name: "SDL 2", license: "Zlib", licenseUrl: github("libsdl-org/SDL", "SDL2/LICENSE.txt") },
  shaderc: { name: "shaderc", license: "Apache-2.0", licenseUrl: github("google/shaderc", "main/LICENSE") },
  snappy: { name: "Snappy", license: "BSD-3-Clause", licenseUrl: github("google/snappy", "main/COPYING") },
  soxr: { name: "SoX Resampler", license: "LGPL-2.1-or-later", licenseUrl: sourceforge("soxr/code", "COPYING.LGPL") },
  spirv_cross: { name: "SPIRV-Cross", license: "Apache-2.0", licenseUrl: github("KhronosGroup/SPIRV-Cross", "main/LICENSE") },
  spirv_headers: { name: "SPIRV-Headers", license: "MIT", licenseUrl: github("KhronosGroup/SPIRV-Headers", "main/LICENSE") },
  spirv_tools: { name: "SPIRV-Tools", license: "Apache-2.0", licenseUrl: github("KhronosGroup/SPIRV-Tools", "main/LICENSE") },
  srt: { name: "SRT", license: "MPL-2.0", licenseUrl: github("Haivision/srt", "master/LICENSE") },
  svtav1: { name: "SVT-AV1", license: "BSD-3-Clause-Clear", licenseUrl: "https://gitlab.com/AOMediaCodec/SVT-AV1/-/raw/master/LICENSE.md" },
  theora: { name: "libtheora", license: "BSD-3-Clause", licenseUrl: github("xiph/theora", "master/COPYING") },
  twolame: { name: "TwoLAME", license: "LGPL-2.1-or-later", licenseUrl: github("njh/twolame", "main/COPYING") },
  uavs3d: { name: "uavs3d", license: "BSD-3-Clause", licenseUrl: github("uavs3/uavs3d", "master/COPYING") },
  vmaf: { name: "libvmaf", license: "BSD-2-Clause-Patent", licenseUrl: github("Netflix/vmaf", "master/LICENSE") },
  vorbis: { name: "libvorbis", license: "BSD-3-Clause", licenseUrl: github("xiph/vorbis", "master/COPYING") },
  vulkan_headers: { name: "Vulkan-Headers", license: "Apache-2.0 OR MIT", licenseUrl: github("KhronosGroup/Vulkan-Headers", "main/LICENSE.md") },
  vulkan_loader: { name: "Vulkan-Shim-Loader", license: "MIT", licenseUrl: github("BtbN/Vulkan-Shim-Loader", "master/LICENSE") },
  vvenc: { name: "VVenC", license: "BSD-3-Clause-Clear", licenseUrl: github("fraunhoferhhi/vvenc", "master/LICENSE.txt") },
  winpthreads: { name: "winpthreads", license: "MIT AND BSD-3-Clause", licenseUrl: sourceforge("mingw-w64/mingw-w64", "mingw-w64-libraries/winpthreads/COPYING") },
  xz: { name: "XZ Utils (liblzma)", license: "0BSD", licenseUrl: github("tukaani-project/xz", "master/COPYING.0BSD") },
  zimg: { name: "zimg", license: "WTFPL", licenseUrl: github("sekrit-twc/zimg", "master/COPYING") },
  zlib: { name: "zlib", license: "Zlib", licenseUrl: github("madler/zlib", "master/LICENSE") },
  zmq: { name: "ZeroMQ (libzmq)", license: "MPL-2.0", licenseUrl: github("zeromq/libzmq", "master/LICENSE") },
  zvbi: { name: "ZVBI", license: "LGPL-2.0-or-later AND GPL-2.0-only AND GPL-2.0-or-later AND MIT", licenseUrl: github("zapping-vbi/zvbi", "main/COPYING.md") },
} satisfies Record<string, Library>;

export type LibraryKey = keyof typeof libraries;
