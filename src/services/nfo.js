// 处理 NFO 文件的生成和解析
import fs from 'fs/promises'

export class nfo {
  /**
   * 生成NFO文件
   * @param {Object} metadata 视频元数据
   * @param {string} outputPath 输出路径
   */
  static async generateNfo(metadata, outputPath) {
    const nfoContent = `<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>
<movie>
    <title>${metadata.title || ''}</title>
    <sorttitle>${metadata.code || ''}</sorttitle>
    <num>${metadata.code || ''}</num>
    <studio>${metadata.maker || ''}</studio>
    <release>${metadata.releaseDate || ''}</release>
    <premiered>${metadata.releaseDate || ''}</premiered>
    <year>${metadata.releaseDate?.substring(0, 4) || ''}</year>
    <runtime>${metadata.duration?.replace('分鐘', '') || ''}</runtime>
    <mpaa>NC-17</mpaa>
    <country>JP</country>
    <poster>poster.jpg</poster>
    <thumb>poster.jpg</thumb>
    <fanart>fanart.jpg</fanart>
    ${(metadata.actors || [])
      .map(
        (actor) => `    <actor>
        <name>${actor}</name>
        <role>${actor}</role>
    </actor>`
      )
      .join('\n')}
    ${(metadata.categories || [])
      .map((category) => `    <tag>${category}</tag>`)
      .join('\n')}
    ${(metadata.categories || [])
      .map((category) => `    <genre>${category}</genre>`)
      .join('\n')}
    <set>${metadata.series || '----'}</set>
    <label></label>
    <cover>${metadata.coverUrl || ''}</cover>
    <website>https://www.dmm.co.jp/mono/dvd/-/detail/=/cid=%s</website>
</movie>`

    await fs.writeFile(outputPath, nfoContent, 'utf8')
  }
}
