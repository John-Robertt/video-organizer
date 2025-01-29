// 项目入口文件
import { Organizer } from './core/organizer.js'
import { logger } from './services/logger.js'
import { config } from './services/config.js'

// 监听步骤更新事件
logger.on('stepUpdate', (stepInfo) => {
  const { taskId, step, status, message, error, startTime, duration, level } =
    stepInfo
  const statusEmoji = {
    processing: '🔄',
    completed: '✅',
    failed: '❌',
  }[status]

  const levelColors = {
    info: '\x1b[32m', // 绿色
    warn: '\x1b[33m', // 黄色
    error: '\x1b[31m', // 红色
  }
  const resetColor = '\x1b[0m'

  // 格式化时间
  const time = new Date(startTime).toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  })

  // 构建输出消息
  let logMessage = `[${time}] ${statusEmoji} [${taskId}] ${step}: ${message}`

  // 添加持续时间（如果有）
  if (duration) {
    logMessage += ` (耗时: ${duration}ms)`
  }

  // 添加错误信息（如果有）
  if (error) {
    logMessage += `\n  错误: ${error}`
  }

  // 根据日志级别使用不同颜色输出
  console.log(`${levelColors[level] || ''}${logMessage}${resetColor}`)
})

async function processAllVideos() {
  try {
    await config.load()
    await logger.initLogFile()

    // 初始化 organizer
    const organizer = new Organizer()
    const outputDir = config.get('base.outputDir')

    // 直接调用 organizer 处理所有视频
    const results = await organizer.processVideos(config, outputDir)

    // 输出处理结果统计
    const successCount = results.filter((r) => r.success).length
    const failCount = results.filter((r) => !r.success).length
    logger.completeStep(
      'main',
      'process',
      `处理完成：成功 ${successCount} 个，失败 ${failCount} 个`
    )
  } catch (error) {
    logger.failStep('main', 'process', error.message)
  }
}

// 启动处理
processAllVideos()
