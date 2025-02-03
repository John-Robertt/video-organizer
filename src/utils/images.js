import fsPromises from 'fs/promises'
import sharp from 'sharp'
import path from 'path'
import axios from 'axios'
import { logger } from '../services/logger.js'

export class Images {
  constructor() {
    // 创建专用的 axios 实例
    this.client = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    })
  }

  /**
   * 分割封面图片
   * @param {Buffer} imageBuffer 图片的Buffer
   * @returns {Promise<Buffer>} 分割后的图片
   */
  async splitCoverImage(imageBuffer) {
    try {
      logger.startStep('image', 'split', '开始处理封面图片')
      const image = sharp(imageBuffer)
      const { width, height } = await image.metadata()

      // 处理奇数宽度
      const halfWidth = Math.ceil(width / 2)

      // 裁剪右半部分
      const rightHalfImage = await image.extract({
        left: halfWidth,
        top: 0,
        width: width - halfWidth,
        height,
      })

      logger.completeStep('image', 'split', '封面处理完成')
      return rightHalfImage.toBuffer()
    } catch (error) {
      logger.failStep('image', 'error', `处理封面图片失败: ${error.message}`)
      throw error
    }
  }

  /**
   * 下载并保存封面图片
   * @param {string} coverUrl 封面图片URL
   * @param {string} outputDir 输出目录
   * @param {number} retryCount 重试次数
   * @returns {Promise<boolean>} 是否成功
   */
  async downloadAndSaveCovers(coverUrl, outputDir, retryCount = 3) {
    if (!coverUrl?.startsWith('http')) {
      throw new Error('无效的封面图片URL')
    }

    let attempt = 0
    while (attempt < retryCount) {
      try {
        // 从URL中获取原始图片扩展名
        const extension = path.extname(new URL(coverUrl).pathname) || '.jpg'
        const fanartPath = path.join(outputDir, `fanart${extension}`)
        const posterPath = path.join(outputDir, `poster${extension}`)

        logger.startStep('image', 'download', `开始下载封面: ${coverUrl}`)
        const coverResponse = await this.client.get(coverUrl, {
          responseType: 'arraybuffer',
          timeout: 30000,
        })
        const imageBuffer = Buffer.from(coverResponse.data)
        logger.completeStep('image', 'download', '封面下载完成')

        // 保存原始封面
        logger.startStep('image', 'fanart', '开始保存原始封面')
        await fsPromises.writeFile(fanartPath, imageBuffer)
        logger.completeStep('image', 'fanart', `原始封面已保存: ${fanartPath}`)

        // 处理并保存海报
        logger.startStep('image', 'poster', '开始处理海报图片')
        const splitCoverBuffer = await this.splitCoverImage(imageBuffer)
        await fsPromises.writeFile(posterPath, splitCoverBuffer)
        logger.completeStep('image', 'poster', `海报已保存: ${posterPath}`)

        return true
      } catch (error) {
        attempt++
        if (attempt === retryCount) {
          logger.failStep(
            'image',
            'error',
            `下载并保存封面失败(重试${retryCount}次): ${error.message}`
          )
          throw error
        }
        logger.startStep(
          'image',
          'retry',
          `下载封面失败，第${attempt}次重试: ${error.message}`
        )
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
      }
    }
  }
}

export const images = new Images()
