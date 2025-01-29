import EventEmitter from 'events'

export class Logger extends EventEmitter {
  constructor() {
    super()
    this.steps = new Map()
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
      stepInfo.status = 'completed'
      stepInfo.endTime = new Date()
      stepInfo.message = message || stepInfo.message
      this.emit('stepUpdate', { taskId, ...stepInfo })
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
