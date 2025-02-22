import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join, extname } from 'path'

/**
 * 清理 NFO 文件中的空白行
 * @param {string} filePath - NFO 文件路径
 */
const cleanNfoFile = (filePath) => {
  try {
    // 读取文件内容
    const content = readFileSync(filePath, 'utf8')

    // // 先删除包含 <website> 的行
    // let processedContent = content
    //   .split('\n')
    //   .filter((line) => !line.toLowerCase().includes('<website>'))
    //   .join('\n')

    // // 替换 MPAA 评级
    // processedContent = processedContent.replace(
    //   /<mpaa>NC-17<\/mpaa>/i,
    //   '<mpaa>R18+</mpaa>'
    // )

    // // 删除分钟
    // processedContent = processedContent.replace(/ 分鍾/i, '')
    // processedContent = processedContent.replace(/ {8}<actor>/i, '    <actor>')
    // processedContent = processedContent.replace(/ {8}<tag>/i, '    <tag>')
    // processedContent = processedContent.replace(/ {8}<genre>/i, '    <genre>')
    // processedContent = processedContent.replace(/ {6}<name>/gi, '    <name>')
    // processedContent = processedContent.replace(/ {6}<role>/gi, '    <role>')
    // // processedContent = processedContent.replace(/ {4}</gi, '  <')
    // // 删除标签
    // processedContent = processedContent.replace(/<label><\/label>/i, '')

    // 再移除空白行，保留有内容的行
    const cleanedContent = content
      .split('\n')
      .filter((line) => line.trim() !== '')
      .join('\n')

    // 写回文件
    writeFileSync(filePath, cleanedContent)
    console.log(`已清理文件: ${filePath}`)
  } catch (error) {
    console.error(`处理文件 ${filePath} 时出错:`, error)
  }
}

/**
 * 查找并处理目录中的所有 NFO 文件
 * @param {string} dirPath - 要搜索的目录路径
 */
const processNfoFiles = (dirPath) => {
  try {
    // 读取目录内容
    const files = readdirSync(dirPath)

    // 遍历所有文件
    files.forEach((file) => {
      const fullPath = join(dirPath, file)

      if (statSync(fullPath).isDirectory()) {
        // 如果是目录，递归处理
        processNfoFiles(fullPath)
      } else if (extname(file).toLowerCase() === '.nfo') {
        // 如果是 NFO 文件，进行处理
        cleanNfoFile(fullPath)
      }
    })
  } catch (error) {
    console.error('处理目录时出错:', error)
  }
}

export default {
  cleanNfoFile,
  processNfoFiles,
}

// 处理当前目录下的所有 NFO 文件
processNfoFiles('.')
