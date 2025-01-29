// 处理文件整理和归类
import path from 'path'
import fs from 'fs/promises'
import { scraper } from './scraper.js'
import { images } from '../utils/images.js'
import { nfo } from '../services/nfo.js'
import { logger } from '../services/logger.js'
import { scanner } from './scanner.js'
import { fileUtils } from '../utils/fileUtils.js'

export class Organizer {
  /**
   * 处理视频文件
   * @param {string} videoCode 视频编号
   * @param {Object} config 配置对象
   * @param {string} targetDir 目标目录
   * @param {number} [retryCount=3] 重试次数
   */
  async processVideo(videoCode, config, targetDir, retryCount = 3) {
    let attempt = 0
    while (attempt < retryCount) {
      try {
        let videoDir = null
        let sourceVideoPath = null

        // 扫描视频文件
        logger.startStep(videoCode, 'scan', `正在扫描视频文件 ${videoCode}`)
        const videoFiles = await scanner.getVideoFiles(config)

        const videoFile = videoFiles.find((file) =>
          file.name.toUpperCase().includes(videoCode.toUpperCase())
        )
        if (!videoFile) {
          throw new Error(`未找到视频文件: ${videoCode}`)
        }
        sourceVideoPath = videoFile.path
        logger.completeStep(
          videoCode,
          'scan',
          `找到视频文件: ${sourceVideoPath}`
        )

        // 获取视频信息
        logger.startStep(
          videoCode,
          'scrape',
          `正在获取视频 ${videoCode} 的信息`
        )
        const metadata = await scraper.javdb.getVideoInfo(videoCode, config)
        logger.completeStep(
          videoCode,
          'scrape',
          `成功获取视频 ${videoCode} 的信息`
        )

        // 创建临时目录
        logger.startStep(videoCode, 'createDir', '正在创建视频目录')
        videoDir = path.join(targetDir, metadata.code)
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
          const moveResult = await fileUtils.moveFile(
            sourceVideoPath,
            videoDir,
            {
              useSafeDelete: true,
              overwrite: false,
            }
          )
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
                config
                  .get('fileTypes.video')
                  .includes(path.extname(file).toLowerCase())
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
        attempt++
        if (attempt === retryCount) {
          logger.failStep(
            videoCode,
            'process',
            `处理失败(重试${retryCount}次): ${error.message}`
          )
          return {
            success: false,
            code: videoCode,
            error: error.message,
          }
        }
        logger.startStep(
          videoCode,
          'retry',
          `处理失败，第${attempt}次重试: ${error.message}`
        )
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
      }
    }
  }

  /**
   * 批量处理视频文件
   * @param {string[]} videoCodes 视频编号列表
   * @param {Object} config 配置对象
   * @param {string} targetDir 目标目录
   */
  async processVideos(videoCodes, config, targetDir) {
    const results = []
    for (const code of videoCodes) {
      try {
        const result = await this.processVideo(code, config, targetDir)
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
