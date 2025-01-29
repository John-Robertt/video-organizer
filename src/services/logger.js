import EventEmitter from 'events'
import fs from 'fs/promises'
import path from 'path'
import { config } from './config.js'

export class Logger extends EventEmitter {
  constructor() {
    super()
    this.steps = new Map()
    this.logLevels = {
      INFO: 'info',
      WARN: 'warn',
      ERROR: 'error',
    }
    this.logFile = null
    this.logStream = null
  }

  // 添加格式化时间方法
  formatTime(date) {
    return date.toLocaleTimeString('zh-CN', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    })
  }

  /**
   * 开始一个新的处理步骤
   * @param {string} taskId 任务ID
   * @param {string} step 步骤名称
   * @param {string} message 步骤描述
   */
  startStep(taskId, step, message) {
    const stepInfo = {
      step,
      message,
      status: 'processing',
      startTime: new Date(),
      endTime: null,
      level: this.logLevels.INFO,
    }

    if (!this.steps.has(taskId)) {
      this.steps.set(taskId, new Map())
    }

    this.steps.get(taskId).set(step, stepInfo)
    this.emit('stepUpdate', { taskId, ...stepInfo })
  }

  /**
   * 完成一个处理步骤
   * @param {string} taskId 任务ID
   * @param {string} step 步骤名称
   * @param {string} message 完成消息
   */
  completeStep(taskId, step, message) {
    const taskSteps = this.steps.get(taskId)
    if (taskSteps?.has(step)) {
      const stepInfo = taskSteps.get(step)
      stepInfo.duration = new Date() - stepInfo.startTime
      stepInfo.status = 'completed'
      stepInfo.endTime = new Date()
      stepInfo.message = message || stepInfo.message
      this.emit('stepUpdate', { taskId, ...stepInfo })
    } else {
      console.warn(`未找到步骤 ${step} 的任务记录`)
    }
  }

  /**
   * 标记步骤失败
   * @param {string} taskId 任务ID
   * @param {string} step 步骤名称
   * @param {string} error 错误信息
   */
  failStep(taskId, step, error) {
    const taskSteps = this.steps.get(taskId)
    if (taskSteps?.has(step)) {
      const stepInfo = taskSteps.get(step)
      stepInfo.status = 'failed'
      stepInfo.endTime = new Date()
      stepInfo.error = error
      stepInfo.level = this.logLevels.ERROR
      this.emit('stepUpdate', { taskId, ...stepInfo })
    }
  }

  /**
   * 获取任务的所有步骤
   * @param {string} taskId 任务ID
   * @returns {Map} 步骤信息Map
   */
  getTaskSteps(taskId) {
    return this.steps.get(taskId) || new Map()
  }

  /**
   * 初始化日志文件
   */
  async initLogFile() {
    if (!config.get('log.enabled')) return

    const outputDir = config.get('base.outputDir')
    const logPath = config.get('log.path')
    const logFilename = config.get('log.filename')

    const logDir = path.join(outputDir, logPath)
    await fs.mkdir(logDir, { recursive: true })

    this.logFile = path.join(logDir, logFilename)
    // 确保文件存在
    await fs.appendFile(this.logFile, '')
  }

  /**
   * 写入日志到文件
   * @param {string} message 日志消息
   */
  async writeToFile(message) {
    if (!this.logFile || !config.get('log.enabled')) return

    try {
      const timestamp = new Date().toISOString()
      const logEntry = `${timestamp} ${message}\n`
      await fs.appendFile(this.logFile, logEntry)
    } catch (error) {
      console.error('写入日志文件失败:', error)
    }
  }

  emit(event, stepInfo) {
    if (event === 'stepUpdate') {
      const { taskId, step, status, message, error, duration } = stepInfo
      const statusEmoji = {
        processing: '🔄',
        completed: '✅',
        failed: '❌',
      }[status]

      // 构建日志消息
      let logMessage = `[${taskId}] ${step}: ${message}`
      if (duration) {
        logMessage += ` (耗时: ${duration}ms)`
      }
      if (error) {
        logMessage += `\n  错误: ${error}`
      }

      // 写入日志文件
      this.writeToFile(`${statusEmoji} ${logMessage}`)
    }

    super.emit(event, stepInfo)
  }
}

export const logger = new Logger()
