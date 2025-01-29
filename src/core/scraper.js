// 根据配置选择不同的刮削网站
import { JavdbService } from '../services/javdb.js'

export class Scraper {
  constructor() {
    this.javdb = new JavdbService()
  }
}

export const scraper = new Scraper()
