// 处理与 javdb 的交互
import axios from 'axios'
import * as cheerio from 'cheerio'
import fs from 'fs'

export class JavdbService {
  /**
   * 创建JavdbService实例
   * @param {string} cookieFile cookie文件路径,默认为'cookie.txt'
   */
  constructor(cookieFile = 'config/cookie.txt') {
    this.baseUrl = 'https://javdb.com'

    // 验证cookie文件
    if (cookieFile && !fs.existsSync(cookieFile)) {
      console.warn(`Cookie文件 ${cookieFile} 不存在，将使用空cookie`)
      this.cookies = ''
    } else {
      this.cookies = this.parseCookieFile(cookieFile)
    }

    // 创建axios实例并配置
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000, // 设置超时时间
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        Cookie: this.cookies,
      },
      validateStatus: (status) => status >= 200 && status < 300, // 验证响应状态
      retry: 3,
      retryDelay: 1000,
      retryCondition: (error) => {
        return axios.isNetworkError(error) || error.response?.status === 429
      },
    })
  }

  /**
   * 解析cookie文件
   * @param {string} filePath cookie文件路径
   * @returns {string} cookie字符串
   */
  parseCookieFile(filePath) {
    if (!filePath) return ''
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      const lines = content.split('\n')

      // 过滤注释行和空行,解析cookie
      const cookieItems = lines
        .filter((line) => line && !line.startsWith('#'))
        .map((line) => {
          // 按tab分割行
          const [domain, name, value] = line.split('\t')

          // 验证必要字段
          if (!domain?.includes('javdb.com') || !name || !value) {
            return null
          }

          return `${name.trim()}=${value.trim()}`
        })
        .filter(Boolean)

      // 使用Map去重,保留最新的cookie
      const cookieMap = new Map()
      cookieItems.forEach((item) => {
        const [name] = item.split('=')
        cookieMap.set(name, item)
      })

      return Array.from(cookieMap.values()).join('; ')
    } catch (error) {
      console.error('解析cookie文件失败:', error)
      return ''
    }
  }

  /**
   * 搜索视频信息
   * @param {string} code 视频编号
   * @returns {Promise<Object>} 视频元数据
   */
  async getVideoInfo(code) {
    if (!code?.trim()) {
      throw new Error('视频编号不能为空')
    }

    try {
      // 搜索页面，添加中文区域参数
      const searchUrl = `/search?q=${encodeURIComponent(code.trim())}&f=all&locale=zh`
      const searchResponse = await this.client.get(searchUrl)
      const $ = cheerio.load(searchResponse.data)

      // 遍历搜索结果列表查找匹配的番号
      let detailUrl = null
      $('.movie-list .item').each((_, item) => {
        const $item = $(item)
        const videoTitle = $item.find('.video-title').text()
        const videoCode = videoTitle.match(/^([a-zA-Z0-9-]+)/)?.[1]

        if (
          videoCode &&
          videoCode.replace(/\s+/g, '').toLowerCase() ===
            code.trim().toLowerCase()
        ) {
          detailUrl = this.baseUrl + $item.find('a').attr('href')
          return false
        }
      })

      if (!detailUrl) {
        throw new Error('未找到匹配的视频信息')
      }

      // 获取详情页面
      const detailResponse = await this.client.get(detailUrl)
      const detail$ = cheerio.load(detailResponse.data)
      const videoInfo = {
        title: detail$('.video-detail .title .current-title').text().trim(),
        code: detail$('.movie-panel-info .panel-block:contains("番號") .value')
          .text()
          .trim(),
        releaseDate: detail$(
          '.movie-panel-info .panel-block:contains("日期") .value'
        )
          .text()
          .trim(),
        duration: detail$(
          '.movie-panel-info .panel-block:contains("時長") .value'
        )
          .text()
          .trim(),
        maker: detail$('.movie-panel-info .panel-block:contains("片商") .value')
          .text()
          .trim(),
        series: detail$(
          '.movie-panel-info .panel-block:contains("系列") .value'
        )
          .text()
          .trim(),
        rating: detail$(
          '.movie-panel-info .panel-block:contains("評分") .value'
        )
          .text()
          .trim(),
        categories: detail$(
          '.movie-panel-info .panel-block:contains("類別") .value a'
        )
          .map((_, el) => detail$(el).text().trim())
          .get(),
        actors: detail$(
          '.movie-panel-info .panel-block:contains("演員") .value a'
        )
          .map((_, el) => detail$(el).text().trim())
          .get(),
        coverUrl: detail$('.column-video-cover img').attr('src'),
      }
      // 解析视频信息
      return videoInfo
    } catch (error) {
      console.error(`[JavdbService] 获取视频信息失败: ${error.message}`)
      throw error
    }
  }

  // 添加请求重试处理
  async request(config) {
    let retries = 0
    while (retries < this.client.defaults.retry) {
      try {
        return await this.client(config)
      } catch (error) {
        if (
          !this.client.defaults.retryCondition(error) ||
          retries === this.client.defaults.retry - 1
        ) {
          throw error
        }
        retries++
        await new Promise((resolve) =>
          setTimeout(resolve, this.client.defaults.retryDelay * retries)
        )
      }
    }
  }
}

export const javdb = new JavdbService()
