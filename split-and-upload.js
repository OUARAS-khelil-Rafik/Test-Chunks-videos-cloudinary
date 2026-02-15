// Configuration and imports
require("dotenv").config();
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const { promisify } = require("util");

const execAsync = promisify(exec);

// Initialize Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Video files to process
const files = [
  "./Videos/Git-Github Tuto 01.mp4",
  "./Videos/Git-Github Tuto 02.mp4",
];

// Configuration constants for video splitting and uploading
const MIN_FILE_SIZE = 50 * 1024 * 1024; // Minimum part size
const TARGET_FILE_SIZE = 70 * 1024 * 1024; // Optimal part size
const CLOUDINARY_LIMIT = 100 * 1024 * 1024; // Cloudinary upload limit
const MAX_PARTS = 20; // Maximum chunks per video
const OUTPUT_DIR = "./Videos/split-output"; // Output directory for split files
const MAX_RETRIES = 3; // Upload retry attempts

/**
 * Verify ffmpeg is installed
 */
async function checkFFmpeg() {
  try {
    await execAsync("ffmpeg -version");
    return true;
  } catch {
    return false;
  }
}

/**
 * Get video duration in seconds
 */
async function getVideoDuration(filePath) {
  const cmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`;
  const { stdout } = await execAsync(cmd);
  return parseFloat(stdout.trim());
}

/**
 * Split video into chunks under 100MB each
 */
async function splitVideo(filePath) {
  const fileName = path.basename(filePath, path.extname(filePath));
  const fileSize = fs.statSync(filePath).size;
  
  console.log(`\n📹 Processing: ${path.basename(filePath)}`);
  console.log(`   Size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);

  // Create output directory if needed
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Get video duration and calculate optimal chunk count
  const duration = await getVideoDuration(filePath);
  console.log(`   Duration: ${Math.floor(duration / 60)}m ${Math.floor(duration % 60)}s`);

  let segments = Math.ceil(fileSize / TARGET_FILE_SIZE);
  if (segments > MAX_PARTS) segments = MAX_PARTS;
  while (segments > 1 && (fileSize / segments) < MIN_FILE_SIZE) {
    segments--;
  }

  const segmentDuration = Math.floor(duration / segments);
  console.log(`   Splitting into ${segments} chunks (~${segmentDuration}s each)\n`);

  // Execute ffmpeg to split video
  const outputPattern = path.join(OUTPUT_DIR, `${fileName}-part-%03d.mp4`);
  const cmd = `ffmpeg -i "${filePath}" -c copy -f segment -segment_time ${segmentDuration} -reset_timestamps 1 -avoid_negative_ts make_zero "${outputPattern}"`;
  
  console.log(`   ⏳ Splitting video...`);
  await execAsync(cmd, { maxBuffer: 1024 * 1024 * 10 });
  console.log(`   ✅ Done!\n`);

  // Validate and collect part files
  const parts = fs
    .readdirSync(OUTPUT_DIR)
    .filter((file) => file.startsWith(`${fileName}-part-`) && file.endsWith(".mp4"))
    .sort()
    .map((file) => path.join(OUTPUT_DIR, file));

  // Show part summary
  console.log(`   📦 Generated ${parts.length} parts:`);
  let oversized = false;
  const partSizes = [];

  parts.forEach((part, i) => {
    const size = fs.statSync(part).size;
    const sizeInMB = (size / 1024 / 1024).toFixed(2);
    partSizes.push(size);
    
    let status = "✓ ";
    if (size > CLOUDINARY_LIMIT) {
      status = "❌";
      oversized = true;
    }
    console.log(`      ${status}Part ${i + 1}: ${sizeInMB} MB`);
  });

  const avgSize = (partSizes.reduce((a, b) => a + b, 0) / partSizes.length / 1024 / 1024).toFixed(2);
  console.log(`      Average: ${avgSize} MB\n`);

  if (oversized) {
    throw new Error("Parts exceed 100MB limit");
  }

  return parts;
}

/**
 * Create a visual progress bar
 */
function createProgressBar(percent) {
  const width = 30;
  const filled = Math.round(width * percent / 100);
  const empty = width - filled;
  return `[${'█'.repeat(filled)}${' '.repeat(empty)}] ${percent}%`;
}

/**
 * Format bytes to MB
 */
function formatMB(bytes) {
  return (bytes / 1024 / 1024).toFixed(2);
}

/**
 * Upload file to Cloudinary with retry logic and progress tracking
 */
async function uploadFile(filePath, partNum, totalParts, origName, retryCount = 0) {
  const fileName = path.basename(filePath);
  const fileSize = fs.statSync(filePath).size;

  if (fileSize > CLOUDINARY_LIMIT) {
    throw new Error(`File ${formatMB(fileSize)}MB exceeds 100MB limit`);
  }

  console.log(`   📤 Part ${partNum}/${totalParts}: ${fileName} (${formatMB(fileSize)} MB)`);
  if (retryCount > 0) {
    console.log(`      Retry ${retryCount}/${MAX_RETRIES}`);
  }

  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    let uploadStarted = false;
    const progressInterval = setInterval(() => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
      if (uploadStarted) {
        const estimate = (fileSize / 1024 / 1024 / 10).toFixed(0); // Rough estimate
        process.stdout.write(`\r      ⏳ Uploading... ${elapsed}s elapsed (${formatMB(fileSize)} MB)`);
      }
    }, 1000);

    const timeout = setTimeout(() => {
      uploadStarted = true;
    }, 2000);

    cloudinary.uploader.upload_large(
      filePath,
      {
        resource_type: "video",
        folder: "split-videos",
        public_id: `${path.parse(origName).name}-part-${partNum}`,
        chunk_size: 6 * 1024 * 1024,
        timeout: 600000,
      },
      async (err, result) => {
        clearInterval(progressInterval);
        clearTimeout(timeout);
        // Clear the progress line
        process.stdout.write('\r' + ' '.repeat(80) + '\r');

        if (err) {
          console.error(`      ❌ ${err.message}`);

          // Retry on transient errors
          if (retryCount < MAX_RETRIES && 
              (err.message.includes("timeout") || err.http_code === 503 || err.http_code === 504)) {
            console.log(`      🔄 Retrying...`);
            try {
              const res = await uploadFile(filePath, partNum, totalParts, origName, retryCount + 1);
              resolve(res);
            } catch (e) {
              reject(e);
            }
          } else {
            reject(err);
          }
        } else {
          const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
          console.log(`      ✅ Uploaded in ${totalTime}s: ${result.secure_url}`);
          resolve(result);
        }
      }
    );
  });
}

/**
 * Process a single video: split and upload all parts
 */
async function processVideo(filePath) {
  const origName = path.basename(filePath);

  try {
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      return { success: false, error: "File not found", file: filePath };
    }

    const fileSize = fs.statSync(filePath).size;

    // Upload directly if under limit
    if (fileSize <= CLOUDINARY_LIMIT) {
      console.log(`\n💡 Direct upload (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);
      try {
        const res = await uploadFile(filePath, 1, 1, origName);
        return { success: true, file: filePath, parts: [res] };
      } catch (err) {
        return { success: false, error: err.message, file: filePath };
      }
    }

    // Split and upload
    const parts = await splitVideo(filePath);
    console.log(`🚀 Uploading ${parts.length} parts...\n`);

    const results = [];
    for (let i = 0; i < parts.length; i++) {
      try {
        const res = await uploadFile(parts[i], i + 1, parts.length, origName);
        results.push({ success: true, result: res, file: parts[i] });
      } catch (err) {
        console.error(`      Failed: ${err.message}`);
        results.push({ success: false, error: err.message, file: parts[i] });
      }
    }

    const successful = results.filter((r) => r.success).length;
    const failed = results.length - successful;
    console.log(`\n   📊 Complete: ${successful}/${results.length} uploaded`);
    if (failed > 0) {
      console.log(`   ⚠️  Failed: ${failed} part(s)\n`);
    }

    return { success: successful === results.length, file: filePath, parts: results };
  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
    return { success: false, error: err.message, file: filePath };
  }
}

/**
 * Main function
 */
async function main() {
  console.log("🎬 Video Splitter & Uploader for Cloudinary\n");
  console.log("=".repeat(60));

  console.log("\n🔍 Checking requirements...");
  const hasFFmpeg = await checkFFmpeg();

  if (!hasFFmpeg) {
    console.error("\n❌ ffmpeg is not installed!");
    console.log("   macOS: brew install ffmpeg");
    console.log("   Or: https://ffmpeg.org/download.html");
    process.exit(1);
  }

  console.log("✅ ffmpeg found");
  console.log(`✅ Part size: ${(MIN_FILE_SIZE / 1024 / 1024).toFixed(0)}-${(TARGET_FILE_SIZE / 1024 / 1024).toFixed(0)}MB`);
  console.log(`✅ Max parts: ${MAX_PARTS} | Retries: ${MAX_RETRIES}`);
  console.log("=".repeat(60));

  const startTime = Date.now();
  const results = [];

  for (let i = 0; i < files.length; i++) {
    console.log(`\n[${i + 1}/${files.length}] ${files[i]}`);
    console.log("-".repeat(60));
    const result = await processVideo(files[i]);
    results.push(result);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  const successful = results.filter((r) => r.success).length;

  console.log("\n" + "=".repeat(60));
  console.log("📊 SUMMARY\n");
  console.log(`   Videos: ${files.length} | Success: ${successful}`);
  console.log(`   Time: ${duration}s\n`);

  results.forEach((result) => {
    if (result.success) {
      console.log(`✅ ${path.basename(result.file)}`);
    } else {
      console.log(`❌ ${path.basename(result.file)}: ${result.error}`);
    }
  });

  console.log("\n" + "=".repeat(60));
  if (successful === results.length) {
    console.log("\n🎉 All complete! Clean up: rm -rf ./Videos/split-output\n");
  } else {
    console.log("\n⚠️  Some uploads failed.\n");
  }
}

// Run the script
main().catch((error) => {
  console.error("💥 Fatal error:", error);
  process.exit(1);
});
