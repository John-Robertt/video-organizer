import EventEmitter from 'events'

export class Logger extends EventEmitter {
  constructor() {
    super()
    this.steps = new Map()
    this.logLevels = {
      INFO: 'info',
      WARN: 'warn',
      ERROR: 'error',
    }
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
}

export const logger = new Logger()
