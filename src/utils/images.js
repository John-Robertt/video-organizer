import fsPromises from 'fs/promises'
import sharp from 'sharp'
import path from 'path'
import axios from 'axios'

class Images {
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
   * @param {string} coverUrl 封面图片URL
   * @returns {Promise<Buffer>} 分割后的图片
   */

  async splitCoverImage(coverUrl) {
    if (!coverUrl?.startsWith('http')) {
      throw new Error('无效的封面图片URL')
    }

    try {
      // 下载图片（使用更长的超时时间）
      const response = await this.client.get(coverUrl, {
        responseType: 'arraybuffer',
        timeout: 30000, // 图片下载专用超时
      })

      const imageBuffer = Buffer.from(response.data)
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

      // 直接返回buffer，移除文件保存
      return rightHalfImage.toBuffer()
    } catch (error) {
      console.error(`[Images] 处理封面图片失败: ${error.message}`)
      throw error
    }
  }

  /**
   * 下载并保存封面图片
   * @param {string} coverUrl 封面图片URL
   * @param {string} outputDir 输出目录
   * @returns {Promise<void>}
   */
  async downloadAndSaveCovers(coverUrl, outputDir) {
    try {
      // 从URL中获取原始图片扩展名
      const extension = path.extname(new URL(coverUrl).pathname) || '.jpg'
      const fanartPath = path.join(outputDir, `fanart${extension}`)
      const posterPath = path.join(outputDir, `poster${extension}`)

      // 下载原始封面并直接保存
      const coverResponse = await this.client.get(coverUrl, {
        responseType: 'arraybuffer',
      })
      await fsPromises.writeFile(fanartPath, Buffer.from(coverResponse.data))

      // 获取分割后的封面并保存
      const splitCoverBuffer = await this.splitCoverImage(coverUrl)
      await fsPromises.writeFile(posterPath, splitCoverBuffer)
    } catch (error) {
      console.error(`[Images] 下载并保存封面失败: ${error.message}`)
      throw error
    }
  }
}

export const images = new Images()
