// 负责扫描本地视频文件
import { promises } from 'fs'
import { join, extname, parse } from 'path'

class Scanner {
  /**
   * 遍历目录获取视频文件信息
   * @param {Object} config 配置对象
   * @param {string} [dirPath] 要遍历的目录路径
   * @returns {Promise<Array<{path: string, name: string}>>} 视频文件信息数组
   */
  async getVideoFiles(config, dirPath) {
    const searchPath = dirPath || config.get('base.sourceDir')
    const videoFiles = []

    async function scanDirectory(currentPath) {
      try {
        const items = await promises.readdir(currentPath)

        for (const item of items) {
          // 跳过隐藏文件
          if (config.get('base.skipHiddenFiles') && item.startsWith('.'))
            continue

          const fullPath = join(currentPath, item)
          const stat = await promises.stat(fullPath)

          if (stat.isDirectory()) {
            // 检查是否为排除目录
            const dirName = parse(fullPath).base
            if (!config.get('base.excludeDirs').includes(dirName)) {
              await scanDirectory(fullPath)
            }
          } else if (stat.isFile()) {
            // 检查是否为视频文件
            const ext = extname(fullPath).toLowerCase()
            if (config.get('fileTypes.video').includes(ext)) {
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

export const scanner = new Scanner()
