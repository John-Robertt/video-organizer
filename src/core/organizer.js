// 处理文件整理和归类
import path from 'path'
import fs from 'fs/promises'
import { scraper } from './scraper.js'
import { images } from '../utils/images.js'
import { nfo } from '../services/nfo.js'
import { logger } from '../services/logger.js'
import { scanner, scannerConfig } from './scanner.js'
import { fileUtils } from '../utils/fileUtils.js'

export class Organizer {
  /**
   * 创建文件组织器实例
   * @param {string} targetDir 目标目录
   */
  constructor(targetDir) {
    this.targetDir = targetDir
  }

  /**
   * 处理视频文件
   * @param {string} videoCode 视频编号
   */
  async processVideo(videoCode) {
    let videoDir = null
    let sourceVideoPath = null

    try {
      // 扫描视频文件
      logger.startStep(videoCode, 'scan', `正在扫描视频文件 ${videoCode}`)
      const videoFiles = await scanner.getVideoFiles()
      console.log(videoFiles)

      const videoFile = videoFiles.find((file) =>
        file.name.toUpperCase().includes(videoCode.toUpperCase())
      )
      if (!videoFile) {
        throw new Error(`未找到视频文件: ${videoCode}`)
      }
      sourceVideoPath = videoFile.path
      logger.completeStep(videoCode, 'scan', `找到视频文件: ${sourceVideoPath}`)

      // 获取视频信息
      logger.startStep(videoCode, 'scrape', `正在获取视频 ${videoCode} 的信息`)
      const metadata = await scraper.javdb.getVideoInfo(videoCode)
      logger.completeStep(
        videoCode,
        'scrape',
        `成功获取视频 ${videoCode} 的信息`
      )

      // 创建临时目录
      logger.startStep(videoCode, 'createDir', '正在创建视频目录')
      videoDir = path.join(this.targetDir, metadata.code)
      await fs.mkdir(videoDir, { recursive: true })
      logger.completeStep(videoCode, 'createDir', `成功创建目录: ${videoDir}`)

      try {
        // 生成 NFO 文件
        logger.startStep(videoCode, 'nfo', '正在生成NFO文件')
        const nfoPath = path.join(videoDir, `${metadata.code}.nfo`)
        await nfo.generateNfo(metadata, nfoPath)
        logger.completeStep(videoCode, 'nfo', '成功生成NFO文件')

        // 下载并保存封面图片
        logger.startStep(videoCode, 'covers', '正在下载封面图片')
        await images.downloadAndSaveCovers(metadata.coverUrl, videoDir)
        logger.completeStep(videoCode, 'covers', '成功下载并处理封面图片')

        // 移动视频文件
        logger.startStep(videoCode, 'move', '正在移动视频文件')
        const moveResult = await fileUtils.moveFile(sourceVideoPath, videoDir, {
          useSafeDelete: true,
          overwrite: false,
        })
        if (!moveResult.success) {
          throw new Error(`移动视频文件失败: ${moveResult.error}`)
        }
        logger.completeStep(videoCode, 'move', '成功移动视频文件')

        return {
          success: true,
          code: metadata.code,
          path: videoDir,
        }
      } catch (error) {
        // 如果在处理NFO或封面时出错，检查并恢复视频文件
        if (videoDir) {
          try {
            // 检查视频文件是否在目标目录中
            const videoFiles = await fs.readdir(videoDir)
            const videoFile = videoFiles.find((file) =>
              scannerConfig.fileTypes.includes(path.extname(file).toLowerCase())
            )

            if (videoFile) {
              // 如果找到视频文件，将其移回原位置
              const currentVideoPath = path.join(videoDir, videoFile)
              await fileUtils.moveFile(
                currentVideoPath,
                path.dirname(sourceVideoPath),
                {
                  useSafeDelete: false,
                  overwrite: false,
                  newName: path.basename(sourceVideoPath),
                }
              )
            }

            // 删除临时目录
            await fs.rm(videoDir, { recursive: true, force: true })
          } catch (cleanupError) {
            console.error('清理临时文件时出错:', cleanupError)
          }
        }
        throw error
      }
    } catch (error) {
      logger.failStep(videoCode, 'process', error.message)
      console.error(`处理视频 ${videoCode} 失败:`, error)
      return {
        success: false,
        code: videoCode,
        error: error.message,
      }
    }
  }

  /**
   * 批量处理视频文件
   * @param {string[]} videoCodes 视频编号列表
   */
  async processVideos(videoCodes) {
    const results = []
    for (const code of videoCodes) {
      try {
        const result = await this.processVideo(code)
        results.push(result)
      } catch (error) {
        console.error(`处理视频 ${code} 时发生错误，继续处理下一个视频:`, error)
        results.push({
          success: false,
          code: code,
          error: error.message,
        })
        continue
      }
    }
    return results
  }
}
