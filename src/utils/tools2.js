import { promises } from 'fs'
import { join, extname, parse } from 'path'
import { relative } from 'path'

// 复用原有的配置
const CONFIG = {
  targetDir: '',
  maxDepth: 10,
  skipHiddenFiles: true,
  fileTypes: [
    '.mp4',
    '.avi',
    '.mkv',
    '.mov',
    '.wmv',
    '.flv',
    '.webm',
    '.m4v',
    '.mpg',
    '.mpeg',
    '.3gp',
    '.ts',
    '.mts',
  ],
  excludeDirs: ['node_modules', 'temp', 'downloads', '@eaDir'],
}

// 存储扫描结果
const results = {
  multipleVideoFolders: [],
}

async function scanVideoFolders(dirPath, depth = 0) {
  if (depth > CONFIG.maxDepth) {
    console.warn(`🔴 超过最大递归深度 (${CONFIG.maxDepth}): ${dirPath}`)
    return
  }

  // 检查是否为排除目录
  const dirName = parse(dirPath).base
  if (CONFIG.excludeDirs.includes(dirName)) {
    return
  }

  try {
    const items = await promises.readdir(dirPath)
    const videoFiles = []
    const directories = []

    // 分离文件和目录
    for (const item of items) {
      if (CONFIG.skipHiddenFiles && item.startsWith('.')) continue

      const fullPath = join(dirPath, item)
      const stat = await promises.stat(fullPath)

      if (stat.isDirectory()) {
        directories.push(fullPath)
      } else if (
        stat.isFile() &&
        CONFIG.fileTypes.includes(extname(fullPath).toLowerCase())
      ) {
        videoFiles.push({ path: fullPath, name: item })
      }
    }

    // 如果当前目录包含多个视频文件，添加到结果中
    if (videoFiles.length > 1) {
      results.multipleVideoFolders.push({
        path: dirPath,
        videoCount: videoFiles.length,
        videos: videoFiles.map((f) => f.name),
      })
    }

    // 递归处理子目录
    await Promise.all(
      directories.map((dir) => scanVideoFolders(dir, depth + 1))
    )
  } catch (error) {
    console.error(`❌ 扫描目录失败: ${dirPath}`, error)
  }
}

async function findMultipleVideoFolders() {
  console.log('📁 开始扫描包含多个视频文件的文件夹...\n')

  const startTime = Date.now()

  try {
    await scanVideoFolders(CONFIG.targetDir)

    // 输出结果
    console.log('\n📊 扫描结果')
    if (results.multipleVideoFolders.length === 0) {
      console.log('没有找到包含多个视频文件的文件夹')
    } else {
      console.log(
        `找到 ${results.multipleVideoFolders.length} 个包含多个视频文件的文件夹：\n`
      )
      results.multipleVideoFolders.forEach((folder) => {
        console.log(`📂 ${relative(CONFIG.targetDir, folder.path)}`)
        console.log(`   包含 ${folder.videoCount} 个视频文件：`)
        folder.videos.forEach((video) => console.log(`   - ${video}`))
        console.log()
      })
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log(`\n⏱️ 总耗时: ${duration} 秒`)
  } catch (error) {
    console.error('💥 程序执行出错:', error)
  }
}

// 执行函数
findMultipleVideoFolders().catch((error) => {
  console.error('💥 发生致命错误:', error)
  process.exit(1)
})
