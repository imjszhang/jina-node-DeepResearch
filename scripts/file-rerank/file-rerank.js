const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

// 配置
const JINA_API_KEY = process.env.JINA_API_KEY;
const JINA_API_URL = process.env.JINA_RERANK_BASE_URL || 'https://api.jina.ai/v1/rerank';
const JINA_RERANK_MODEL = process.env.JINA_RERANK_MODEL || 'jina-reranker-v3';
const BATCH_SIZE = 100; // 每批处理的文件数量

/**
 * 使用 Jina Rerank 对文档进行重排序
 * @param {string} query - 查询语句
 * @param {Array} documents - 文档数组，每个元素包含 {text: string, source: string}
 * @param {number} batchSize - 批处理大小
 * @returns {Promise<Array>} 排序后的文档数组
 */
async function rerankDocuments(query, documents, batchSize = BATCH_SIZE) {
  if (!JINA_API_KEY) {
    throw new Error('请设置 JINA_API_KEY 环境变量');
  }

  if (documents.length === 0) {
    return [];
  }

  console.log(`📊 开始重排序 ${documents.length} 个文档...`);

  // 分批处理
  const batches = [];
  for (let i = 0; i < documents.length; i += batchSize) {
    batches.push(documents.slice(i, i + batchSize));
  }

  console.log(`📦 分为 ${batches.length} 批处理`);

  try {
    // 并行处理所有批次
    const batchResults = await Promise.all(
      batches.map(async (batchDocuments, batchIndex) => {
        const startIdx = batchIndex * batchSize;
        
        console.log(`⏳ 处理批次 ${batchIndex + 1}/${batches.length} (${batchDocuments.length} 个文档)`);

        try {
          const request = {
            model: JINA_RERANK_MODEL,
            query: query,
            top_n: batchDocuments.length,
            documents: batchDocuments.map(doc => doc.text),
            return_documents: false
          };

          const response = await axios.post(JINA_API_URL, request, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${JINA_API_KEY}`
            },
            timeout: 30000
          });

          console.log(`✅ 批次 ${batchIndex + 1} 完成，使用 ${response.data.usage.total_tokens} tokens`);

          // 添加原始文档信息到结果中
          return response.data.results.map(result => ({
            ...result,
            originalIndex: startIdx + result.index,
            source: batchDocuments[result.index].source,
            originalText: batchDocuments[result.index].text
          }));
        } catch (error) {
          console.error(`❌ 批次 ${batchIndex + 1} 失败:`, error.message);
          // 返回原始文档，但设置默认相关性分数
          return batchDocuments.map((doc, idx) => ({
            index: idx,
            relevance_score: 0.0,
            originalIndex: startIdx + idx,
            source: doc.source,
            originalText: doc.text
          }));
        }
      })
    );

    // 合并所有批次结果并按相关性排序
    const allResults = batchResults.flat().sort((a, b) => b.relevance_score - a.relevance_score);

    console.log(`🎉 重排序完成！`);
    return allResults;

  } catch (error) {
    console.error('❌ 重排序失败:', error.message);
    if (error.response) {
      console.error('API 响应:', error.response.data);
    }
    throw error;
  }
}

/**
 * 读取文件夹中的所有文件内容
 * @param {string} folderPath - 文件夹路径
 * @param {Array} extensions - 允许的文件扩展名
 * @returns {Array} 文档数组
 */
function readFilesFromFolder(folderPath, extensions = ['.txt', '.md', '.js', '.json', '.py', '.html', '.css']) {
  if (!fs.existsSync(folderPath)) {
    throw new Error(`文件夹不存在: ${folderPath}`);
  }

  const files = fs.readdirSync(folderPath);
  const documents = [];
  let errorCount = 0;

  console.log(`📁 扫描文件夹: ${folderPath}`);

  for (const file of files) {
    const filePath = path.join(folderPath, file);
    const stat = fs.statSync(filePath);

    if (stat.isFile()) {
      const ext = path.extname(file).toLowerCase();
      
      if (extensions.includes(ext)) {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          
          // 过滤掉空文件和过短的文件
          if (content.trim().length > 10) {
            documents.push({
              text: content.trim(),
              source: file,
              path: filePath,
              size: stat.size,
              modified: stat.mtime
            });
            console.log(`📄 读取文件: ${file} (${stat.size} bytes)`);
          }
        } catch (error) {
          errorCount++;
          console.log(`⚠️  无法读取文件 ${file}: ${error.message}`);
        }
      }
    }
  }

  console.log(`📚 总共读取 ${documents.length} 个文件`);
  if (errorCount > 0) {
    console.log(`⚠️  跳过 ${errorCount} 个无法读取的文件`);
  }
  return documents;
}

/**
 * 格式化文件大小
 * @param {number} bytes - 字节数
 * @returns {string} 格式化后的大小
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 生成排序结果报告
 * @param {string} query - 查询语句
 * @param {Array} results - 排序结果
 * @param {string} outputPath - 输出文件路径
 */
function generateReport(query, results, outputPath) {
  const report = {
    query: query,
    timestamp: new Date().toISOString(),
    totalFiles: results.length,
    results: results.map((result, index) => ({
      rank: index + 1,
      filename: result.source,
      relevanceScore: result.relevance_score,
      fileSize: formatFileSize(result.originalText.length),
      preview: result.originalText.substring(0, 200) + (result.originalText.length > 200 ? '...' : '')
    }))
  };

  // 确保输出目录存在
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`📋 报告已保存到: ${outputPath}`);
}

/**
 * 验证配置和环境
 */
function validateConfig() {
  if (!JINA_API_KEY) {
    console.error('❌ 错误: 未设置 JINA_API_KEY 环境变量');
    console.log('请设置环境变量或在项目根目录创建 .env 文件:');
    console.log('JINA_API_KEY=your_jina_api_key_here');
    return false;
  }

  if (!JINA_API_URL) {
    console.error('❌ 错误: JINA_API_URL 未配置');
    return false;
  }

  console.log('✅ 配置验证通过');
  return true;
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log(`
🔍 Jina Rerank 文件排序工具

用法: node file-rerank.js <查询语句> <文件夹路径> [输出文件路径]

示例:
  node file-rerank.js "JavaScript 函数" ./work_dir/test-data
  node file-rerank.js "机器学习算法" ./work_dir/test-data ./work_dir/results.json

环境变量:
  JINA_API_KEY - Jina AI API 密钥 (必需)
    `);
    process.exit(1);
  }

  const query = args[0];
  const folderPath = args[1];
  const outputPath = args[2] || './work_dir/rerank-results.json';

  try {
    console.log(`🎯 查询语句: "${query}"`);
    console.log(`📁 目标文件夹: ${folderPath}`);
    console.log(`📄 输出文件: ${outputPath}`);
    console.log('─'.repeat(50));

    // 验证配置
    if (!validateConfig()) {
      process.exit(1);
    }

    // 读取文件
    const documents = readFilesFromFolder(folderPath);
    
    if (documents.length === 0) {
      console.log('❌ 没有找到可处理的文件');
      process.exit(1);
    }

    console.log('─'.repeat(50));

    // 重排序
    const results = await rerankDocuments(query, documents);

    console.log('─'.repeat(50));

    // 显示结果
    console.log('🏆 排序结果 (前10名):');
    results.slice(0, 10).forEach((result, index) => {
      console.log(`${index + 1}. ${result.source} (相关性: ${result.relevance_score.toFixed(4)})`);
    });

    if (results.length > 10) {
      console.log(`... 还有 ${results.length - 10} 个文件`);
    }

    // 生成报告
    generateReport(query, results, outputPath);

    console.log('─'.repeat(50));
    console.log('✅ 完成！');

  } catch (error) {
    console.error('❌ 错误:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  rerankDocuments,
  readFilesFromFolder,
  generateReport
}; 