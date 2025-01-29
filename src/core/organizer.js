// 处理文件整理和归类
import path from 'path'
import fs from 'fs/promises'
import { scraper } from './scraper.js'
import { images } from '../utils/images.js'
import { nfo } from '../services/nfo.js'

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
    try {
      // 获取视频在刮削网站上信息
      const metadata = await scraper.javdb.getVideoInfo(videoCode)

      // 创建以视频编号命名的目录
      const videoDir = path.join(this.targetDir, metadata.code)
      await fs.mkdir(videoDir, { recursive: true })

      // 生成 NFO 文件
      const nfoPath = path.join(videoDir, `${metadata.code}.nfo`)
      await nfo.generateNfo(metadata, nfoPath)

      // 下载并保存封面图片
      await images.downloadAndSaveCovers(metadata.coverUrl, videoDir)

      console.log(`成功处理视频 ${metadata.code} 并生成封面图片`)
      return {
        success: true,
        code: metadata.code,
        path: videoDir,
      }
    } catch (error) {
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
