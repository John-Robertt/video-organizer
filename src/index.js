// 项目入口文件
import { Organizer } from './core/organizer.js'
import { logger } from './services/logger.js'
import { scanner } from './core/scanner.js'

// 监听步骤更新事件
logger.on('stepUpdate', (stepInfo) => {
  const { taskId, step, status, message, error, startTime } = stepInfo
  const statusEmoji = {
    processing: '🔄',
    completed: '✅',
    failed: '❌',
  }[status]

  // 格式化时间
  const time = new Date(startTime).toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  })

  console.log(
    `[${time}] ${statusEmoji} [${taskId}] ${step}: ${message}${
      error ? ` (${error})` : ''
    }`
  )
})

async function processAllVideos() {
  try {
    // 获取所有视频文件
    const videoFiles = await scanner.getVideoFiles()
    logger.startStep('main', 'scan', `找到 ${videoFiles.length} 个视频文件`)

    // 使用文件名作为视频编号，并清洗文件名
    const videoCodes = videoFiles.map((file) => {
      // 获取不带扩展名的文件名
      const fileName = file.name.replace(/\.[^/.]+$/, '')

      // 清洗文件名，提取番号
      const match = fileName.match(/([A-Z]+-\d+)(?:-[A-Z])?/i)
      return match ? match[1].toUpperCase() : fileName
    })

    logger.startStep(
      'main',
      'process',
      `准备处理 ${videoCodes.length} 个视频文件`
    )

    // 批量处理视频
    const organizer = new Organizer('output')
    const results = await organizer.processVideos(videoCodes)

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
