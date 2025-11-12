/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  // カスタムドメイン使用時はbasePath不要
  // GitHub Pages のサブディレクトリ (username.github.io/puzzle) を使う場合は下記を有効化
  // basePath: process.env.NODE_ENV === 'production' ? '/puzzle' : '',
  // assetPrefix: process.env.NODE_ENV === 'production' ? '/puzzle/' : '',
}

module.exports = nextConfig
