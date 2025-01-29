// 负责扫描本地视频文件
import { promises } from 'fs'
import { join, extname, parse } from 'path'

// 默认配置
const scannerConfig = {
  sourceDir: process.cwd(),
  skipHiddenFiles: true,
  fileTypes: [
    '.mp4',
    '.avi',
    '.mkv',
    '.mov',
    '.wmv',
    '.flv',
    '.webm',
    '.m4v',
    '.mpg',
    '.mpeg',
    '.3gp',
    '.ts',
    '.mts',
  ],
  excludeDirs: ['node_modules', 'temp', 'downloads', '@eaDir'],
}

class Scanner {
  /**
   * 遍历目录获取视频文件信息
   * @param {string} [dirPath] - 要遍历的目录路径，如果提供则覆盖 scannerConfig.sourceDir
   * @returns {Promise<Array<{path: string, name: string}>>} 视频文件信息数组
   */
  async getVideoFiles(dirPath) {
    // 使用传入的目录路径或配置中的目标目录
    const searchPath = dirPath || scannerConfig.sourceDir
    const videoFiles = []

    async function scanDirectory(currentPath) {
      try {
        const items = await promises.readdir(currentPath)

        for (const item of items) {
          // 跳过隐藏文件
          if (scannerConfig.skipHiddenFiles && item.startsWith('.')) continue

          const fullPath = join(currentPath, item)
          const stat = await promises.stat(fullPath)

          if (stat.isDirectory()) {
            // 检查是否为排除目录
            const dirName = parse(fullPath).base
            if (!scannerConfig.excludeDirs.includes(dirName)) {
              await scanDirectory(fullPath)
            }
          } else if (stat.isFile()) {
            // 检查是否为视频文件
            const ext = extname(fullPath).toLowerCase()
            if (scannerConfig.fileTypes.includes(ext)) {
              videoFiles.push({
                path: fullPath,
                name: item,
              })
            }
          }
        }
      } catch (error) {
        console.error(`扫描目录失败: ${currentPath}`, error)
      }
    }

    await scanDirectory(searchPath)
    return videoFiles
  }
}

const scanner = new Scanner()

export { scanner, scannerConfig }
