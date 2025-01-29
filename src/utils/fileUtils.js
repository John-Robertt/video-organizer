// 文件操作工具
import { promises } from 'fs'
import { join, parse } from 'path'
import trash from 'trash'

export class FileUtils {
  /**
   * 移动文件到指定目录
   * @param {string} sourcePath - 源文件路径
   * @param {string} targetDir - 目标目录
   * @param {Object} options - 配置选项
   * @param {boolean} [options.useSafeDelete=true] - 是否使用安全删除（移动到回收站）
   * @param {boolean} [options.overwrite=false] - 是否覆盖已存在的文件
   * @returns {Promise<{success: boolean, path?: string, error?: string}>}
   */
  async moveFile(sourcePath, targetDir, options = {}) {
    const { useSafeDelete = true, overwrite = false } = options

    try {
      // 检查源文件是否存在
      await promises.access(sourcePath)

      // 创建目标目录（如果不存在）
      try {
        await promises.mkdir(targetDir, { recursive: true })
      } catch (error) {
        if (error.code !== 'EEXIST') {
          return {
            success: false,
            error: `创建目标目录失败: ${error.message}`,
          }
        }
      }

      const { base: fileName } = parse(sourcePath)
      let targetPath = join(targetDir, fileName)

      // 如果目标文件已存在且不覆盖
      if (!overwrite) {
        const { ext, name } = parse(fileName)
        let counter = 1

        while (await this.fileExists(targetPath)) {
          targetPath = join(targetDir, `${name} (${counter})${ext}`)
          counter++
        }
      }

      // 检查是否为跨设备移动
      const sourceStats = await promises.stat(sourcePath)
      const targetStats = await promises.stat(targetDir)

      if (sourceStats.dev !== targetStats.dev) {
        // 跨设备移动：先复制后删除
        await promises.copyFile(sourcePath, targetPath)

        if (useSafeDelete) {
          await trash(sourcePath)
        } else {
          await promises.unlink(sourcePath)
        }
      } else {
        // 同设备移动：直接重命名
        await promises.rename(sourcePath, targetPath)
      }

      return {
        success: true,
        path: targetPath,
      }
    } catch (error) {
      console.log(error.message)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  // 辅助函数：检查文件是否存在
  async fileExists(filePath) {
    try {
      await promises.access(filePath)
      return true
    } catch {
      return false
    }
  }
}

export const fileUtils = new FileUtils()
