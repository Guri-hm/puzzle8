const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// 変換する画像のサイズ（正方形）
const TARGET_SIZE = 512; // 1タイルあたりのサイズ（ピクセル）

// publicフォルダ内のpuzzlesディレクトリを処理
const puzzlesDir = path.join(__dirname, '../public/puzzles');

async function convertPuzzleImages() {
  const puzzleFolders = fs.readdirSync(puzzlesDir);

  for (const folder of puzzleFolders) {
    const puzzlePath = path.join(puzzlesDir, folder);
    
    if (!fs.statSync(puzzlePath).isDirectory()) continue;

    console.log(`\n📁 Processing puzzle: ${folder}`);

    const files = fs.readdirSync(puzzlePath);
    const imageFiles = files.filter(file => 
      /\.(png|jpg|jpeg)$/i.test(file) && /tile_\d+\.(png|jpg|jpeg)$/i.test(file)
    );

    for (const file of imageFiles) {
      const inputPath = path.join(puzzlePath, file);
      const outputFile = file.replace(/\.(png|jpg|jpeg)$/i, '.webp');
      const outputPath = path.join(puzzlePath, outputFile);

      try {
        await sharp(inputPath)
          .resize(TARGET_SIZE, TARGET_SIZE, {
            fit: 'cover',
            position: 'center'
          })
          .webp({ quality: 85 }) // 品質85%で圧縮
          .toFile(outputPath);

        const originalSize = fs.statSync(inputPath).size;
        const webpSize = fs.statSync(outputPath).size;
        const reduction = ((1 - webpSize / originalSize) * 100).toFixed(1);

        console.log(`  ✅ ${file} → ${outputFile} (${(originalSize / 1024).toFixed(1)}KB → ${(webpSize / 1024).toFixed(1)}KB, -${reduction}%)`);
      } catch (error) {
        console.error(`  ❌ Error converting ${file}:`, error.message);
      }
    }
  }

  console.log('\n🎉 Conversion complete!');
}

convertPuzzleImages().catch(console.error);
