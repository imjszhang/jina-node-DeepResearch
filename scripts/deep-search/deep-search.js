const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

// 配置
const JINA_API_KEY = process.env.JINA_API_KEY;
const JINA_RERANK_URL = 'https://api.jina.ai/v1/rerank';
const JINA_EMBEDDING_URL = 'https://api.jina.ai/v1/embeddings';
const RERANK_BATCH_SIZE = 100;
const EMBEDDING_BATCH_SIZE = 32;
const CHUNK_SIZE = 500; // 每个文本块的字符数

/**
 * 计算余弦相似度
 * @param {Array} vecA - 向量 A
 * @param {Array} vecB - 向量 B
 * @returns {number} 相似度分数
 */
function cosineSimilarity(vecA, vecB) {
  if (vecA.length !== vecB.length) {
    throw new Error('向量维度不匹配');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * 将文本分割成块
 * @param {string} text - 原始文本
 * @param {number} chunkSize - 每块的字符数
 * @returns {Array} 文本块数组
 */
function chunkText(text, chunkSize = CHUNK_SIZE) {
  const chunks = [];
  const lines = text.split('\n');
  let currentChunk = '';
  let currentPosition = 0;
  
  for (const line of lines) {
    if (currentChunk.length + line.length > chunkSize && currentChunk.length > 0) {
      chunks.push({
        text: currentChunk.trim(),
        startPosition: currentPosition - currentChunk.length,
        endPosition: currentPosition
      });
      currentChunk = line + '\n';
    } else {
      currentChunk += line + '\n';
    }
    currentPosition += line.length + 1;
  }
  
  if (currentChunk.trim().length > 0) {
    chunks.push({
      text: currentChunk.trim(),
      startPosition: currentPosition - currentChunk.length,
      endPosition: currentPosition
    });
  }
  
  return chunks;
}

/**
 * 使用 Jina Rerank 对文档进行重排序（第一阶段：粗筛）
 * @param {string} query - 查询语句
 * @param {Array} documents - 文档数组
 * @param {number} topN - 返回前 N 个结果
 * @returns {Promise<Array>} 排序后的文档数组
 */
async function rerankDocuments(query, documents, topN = null) {
  if (!JINA_API_KEY) {
    throw new Error('请设置 JINA_API_KEY 环境变量');
  }

  if (documents.length === 0) {
    return [];
  }

  console.log(`📊 [Rerank] 开始粗筛 ${documents.length} 个文档...`);

  // 分批处理
  const batches = [];
  for (let i = 0; i < documents.length; i += RERANK_BATCH_SIZE) {
    batches.push(documents.slice(i, i + RERANK_BATCH_SIZE));
  }

  console.log(`📦 [Rerank] 分为 ${batches.length} 批处理`);

  try {
    const batchResults = await Promise.all(
      batches.map(async (batchDocuments, batchIndex) => {
        const startIdx = batchIndex * RERANK_BATCH_SIZE;
        
        console.log(`⏳ [Rerank] 处理批次 ${batchIndex + 1}/${batches.length}`);

        try {
          const request = {
            model: 'jina-reranker-v2-base-multilingual',
            query: query,
            documents: batchDocuments.map(doc => doc.text)
          };
          
          // 只在需要限制返回数量时添加 top_n
          if (topN && topN < batchDocuments.length) {
            request.top_n = topN;
          }

          const response = await axios.post(JINA_RERANK_URL, request, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${JINA_API_KEY}`
            },
            timeout: 30000
          });

          console.log(`✅ [Rerank] 批次 ${batchIndex + 1} 完成`);

          return response.data.results.map(result => ({
            ...batchDocuments[result.index],
            rerankScore: result.relevance_score,
            originalIndex: startIdx + result.index
          }));
        } catch (error) {
          console.error(`❌ [Rerank] 批次 ${batchIndex + 1} 失败:`, error.message);
          return batchDocuments.map((doc, idx) => ({
            ...doc,
            rerankScore: 0.0,
            originalIndex: startIdx + idx
          }));
        }
      })
    );

    const allResults = batchResults.flat().sort((a, b) => b.rerankScore - a.rerankScore);
    console.log(`✅ [Rerank] 粗筛完成，保留前 ${topN || allResults.length} 个结果`);
    
    return topN ? allResults.slice(0, topN) : allResults;

  } catch (error) {
    console.error('❌ [Rerank] 重排序失败:', error.message);
    throw error;
  }
}

/**
 * 使用 Jina Embeddings 获取文本向量（第二阶段：精细匹配）
 * @param {Array} texts - 文本数组
 * @param {Object} options - 配置选项
 * @returns {Promise<Array>} 向量数组
 */
async function getEmbeddings(texts, options = {}) {
  const {
    task = 'text-matching',
    dimensions = 1024,
    late_chunking = false,
    embedding_type = 'float'
  } = options;

  if (!JINA_API_KEY) {
    throw new Error('请设置 JINA_API_KEY 环境变量');
  }

  if (texts.length === 0) {
    return [];
  }

  console.log(`🧮 [Embedding] 获取 ${texts.length} 个文本的向量 (task: ${task}, late_chunking: ${late_chunking})...`);

  const batches = [];
  for (let i = 0; i < texts.length; i += EMBEDDING_BATCH_SIZE) {
    batches.push(texts.slice(i, i + EMBEDDING_BATCH_SIZE));
  }

  console.log(`📦 [Embedding] 分为 ${batches.length} 批处理`);

  try {
    const allEmbeddings = [];
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`⏳ [Embedding] 处理批次 ${i + 1}/${batches.length}`);
      
      const request = {
        model: 'jina-embeddings-v3',
        input: batch,
        task: task,
        dimensions: dimensions,
        embedding_type: embedding_type
      };

      // 只在启用时添加 late_chunking 参数
      if (late_chunking) {
        request.late_chunking = true;
      }

      const response = await axios.post(JINA_EMBEDDING_URL, request, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${JINA_API_KEY}`
        },
        timeout: 30000
      });

      const embeddings = response.data.data.map(item => item.embedding);
      allEmbeddings.push(...embeddings);
      
      console.log(`✅ [Embedding] 批次 ${i + 1} 完成`);
    }

    console.log(`✅ [Embedding] 向量化完成`);
    return allEmbeddings;

  } catch (error) {
    console.error('❌ [Embedding] 向量化失败:', error.message);
    throw error;
  }
}

/**
 * 深度搜索：结合 Rerank 和 Embedding
 * @param {string} query - 查询语句
 * @param {Array} documents - 文档数组
 * @param {Object} options - 配置选项
 * @returns {Promise<Array>} 搜索结果
 */
async function deepSearch(query, documents, options = {}) {
  const {
    mode = 'hybrid', // 'rerank-only', 'embedding-only', 'hybrid'
    rerankTopN = Math.min(50, documents.length), // Rerank 阶段保留的文档数
    finalTopN = 10, // 最终返回的结果数
    enableChunking = true, // 是否启用分块
    minChunkLength = 50, // 最小块长度
  } = options;

  console.log(`\n🔍 开始深度搜索 (模式: ${mode})`);
  console.log(`📚 总文档数: ${documents.length}`);
  console.log('─'.repeat(60));

  let results = [];

  if (mode === 'rerank-only') {
    // 仅使用 Rerank
    results = await rerankDocuments(query, documents, finalTopN);
    results = results.map(doc => ({
      ...doc,
      finalScore: doc.rerankScore,
      matchType: 'rerank'
    }));
  } else if (mode === 'embedding-only') {
    // 仅使用 Embedding
    const docTexts = documents.map(doc => doc.text);
    
    // 使用 retrieval.query 任务类型获取查询向量
    const [queryEmbedding] = await getEmbeddings([query], {
      task: 'retrieval.query',
      dimensions: 1024,
      embedding_type: 'float'
    });
    
    // 使用 retrieval.passage 任务类型获取文档向量
    const docEmbeddings = await getEmbeddings(docTexts, {
      task: 'retrieval.passage',
      dimensions: 1024,
      embedding_type: 'float'
    });
    
    results = documents.map((doc, idx) => ({
      ...doc,
      embeddingScore: cosineSimilarity(queryEmbedding, docEmbeddings[idx]),
      finalScore: cosineSimilarity(queryEmbedding, docEmbeddings[idx]),
      matchType: 'embedding'
    }));
    
    results.sort((a, b) => b.finalScore - a.finalScore);
    results = results.slice(0, finalTopN);
  } else {
    // 混合模式：Rerank + Embedding
    console.log(`\n🎯 第一阶段：Rerank 粗筛 (保留前 ${rerankTopN} 个)`);
    const rerankResults = await rerankDocuments(query, documents, rerankTopN);
    
    console.log(`\n🎯 第二阶段：Embedding 精细匹配`);
    
    if (enableChunking) {
      // 对通过 Rerank 的文档进行分块
      console.log(`📄 对文档进行智能分块...`);
      const allChunks = [];
      const chunkToDocMap = [];
      
      rerankResults.forEach((doc, docIdx) => {
        const chunks = chunkText(doc.text);
        chunks.forEach(chunk => {
          if (chunk.text.length >= minChunkLength) {
            allChunks.push(chunk.text);
            chunkToDocMap.push({
              docIndex: docIdx,
              doc: doc,
              chunkInfo: chunk
            });
          }
        });
      });
      
      console.log(`📊 生成了 ${allChunks.length} 个文本块`);
      
      // 获取查询的 embedding（使用 retrieval.query）
      const [queryEmbedding] = await getEmbeddings([query], {
        task: 'retrieval.query',
        dimensions: 1024,
        embedding_type: 'float'
      });
      
      // 获取所有块的 embedding（使用 retrieval.passage + late_chunking）
      const chunkEmbeddings = await getEmbeddings(allChunks, {
        task: 'retrieval.passage',
        dimensions: 1024,
        late_chunking: true,
        embedding_type: 'float'
      });
      
      // 计算每个块的相似度
      const chunkResults = chunkToDocMap.map((mapping, idx) => ({
        ...mapping.doc,
        chunk: mapping.chunkInfo,
        embeddingScore: cosineSimilarity(queryEmbedding, chunkEmbeddings[idx]),
        rerankScore: mapping.doc.rerankScore,
        finalScore: (mapping.doc.rerankScore * 0.4 + cosineSimilarity(queryEmbedding, chunkEmbeddings[idx]) * 0.6),
        matchType: 'hybrid-chunk'
      }));
      
      // 按最终分数排序
      chunkResults.sort((a, b) => b.finalScore - a.finalScore);
      
      // 去重：每个文档只保留最佳匹配的块
      const seenFiles = new Set();
      results = chunkResults.filter(result => {
        const key = result.source;
        if (seenFiles.has(key)) {
          return false;
        }
        seenFiles.add(key);
        return true;
      }).slice(0, finalTopN);
      
    } else {
      // 不分块，直接对整个文档计算 embedding
      const docTexts = rerankResults.map(doc => doc.text);
      
      // 获取查询的 embedding（使用 retrieval.query）
      const [queryEmbedding] = await getEmbeddings([query], {
        task: 'retrieval.query',
        dimensions: 1024,
        embedding_type: 'float'
      });
      
      // 获取文档的 embedding（使用 retrieval.passage）
      const docEmbeddings = await getEmbeddings(docTexts, {
        task: 'retrieval.passage',
        dimensions: 1024,
        embedding_type: 'float'
      });
      
      results = rerankResults.map((doc, idx) => ({
        ...doc,
        embeddingScore: cosineSimilarity(queryEmbedding, docEmbeddings[idx]),
        finalScore: (doc.rerankScore * 0.4 + cosineSimilarity(queryEmbedding, docEmbeddings[idx]) * 0.6),
        matchType: 'hybrid'
      }));
      
      results.sort((a, b) => b.finalScore - a.finalScore);
      results = results.slice(0, finalTopN);
    }
  }

  console.log('─'.repeat(60));
  console.log(`✅ 深度搜索完成，返回 ${results.length} 个结果\n`);
  
  return results;
}

/**
 * 读取文件夹中的所有文件
 * @param {string} folderPath - 文件夹路径
 * @param {Array} extensions - 允许的文件扩展名
 * @param {boolean} recursive - 是否递归搜索子目录
 * @returns {Array} 文档数组
 */
function readFilesFromFolder(folderPath, extensions = ['.txt', '.md', '.js', '.json', '.py', '.html', '.css', '.ts', '.jsx', '.tsx'], recursive = false) {
  if (!fs.existsSync(folderPath)) {
    throw new Error(`文件夹不存在: ${folderPath}`);
  }

  const documents = [];
  let errorCount = 0;

  console.log(`📁 扫描文件夹: ${folderPath}`);

  function scanDirectory(dirPath) {
    const files = fs.readdirSync(dirPath);
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory() && recursive) {
        scanDirectory(filePath);
      } else if (stat.isFile()) {
        const ext = path.extname(file).toLowerCase();
        
        if (extensions.includes(ext)) {
          try {
            const content = fs.readFileSync(filePath, 'utf8');
            
            if (content.trim().length > 10) {
              documents.push({
                text: content.trim(),
                source: file,
                path: filePath,
                relativePath: path.relative(folderPath, filePath),
                size: stat.size,
                modified: stat.mtime,
                extension: ext
              });
              console.log(`📄 读取: ${path.relative(folderPath, filePath)} (${formatFileSize(stat.size)})`);
            }
          } catch (error) {
            errorCount++;
            console.log(`⚠️  无法读取 ${file}: ${error.message}`);
          }
        }
      }
    }
  }

  scanDirectory(folderPath);

  console.log(`📚 总共读取 ${documents.length} 个文件`);
  if (errorCount > 0) {
    console.log(`⚠️  跳过 ${errorCount} 个无法读取的文件`);
  }
  
  return documents;
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 生成详细报告
 */
function generateReport(query, results, options, outputPath) {
  const report = {
    query: query,
    timestamp: new Date().toISOString(),
    searchMode: options.mode || 'hybrid',
    totalResults: results.length,
    options: options,
    results: results.map((result, index) => {
      const baseResult = {
        rank: index + 1,
        filename: result.source,
        relativePath: result.relativePath,
        finalScore: result.finalScore,
        matchType: result.matchType,
        fileSize: formatFileSize(result.text.length),
      };
      
      // 添加不同模式的分数
      if (result.rerankScore !== undefined) {
        baseResult.rerankScore = result.rerankScore;
      }
      if (result.embeddingScore !== undefined) {
        baseResult.embeddingScore = result.embeddingScore;
      }
      
      // 如果有块信息，添加匹配的具体位置
      if (result.chunk) {
        baseResult.matchedChunk = {
          text: result.chunk.text.substring(0, 300) + (result.chunk.text.length > 300 ? '...' : ''),
          startPosition: result.chunk.startPosition,
          endPosition: result.chunk.endPosition
        };
      } else {
        baseResult.preview = result.text.substring(0, 300) + (result.text.length > 300 ? '...' : '');
      }
      
      return baseResult;
    })
  };

  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`📋 详细报告已保存: ${outputPath}`);
}

/**
 * 显示结果摘要
 */
function displayResults(results, topN = 10) {
  console.log('\n🏆 搜索结果 (按相关性排序):\n');
  console.log('─'.repeat(80));
  
  results.slice(0, topN).forEach((result, index) => {
    console.log(`\n${index + 1}. 📄 ${result.source}`);
    console.log(`   路径: ${result.relativePath}`);
    console.log(`   最终得分: ${result.finalScore.toFixed(4)} (${result.matchType})`);
    
    if (result.rerankScore !== undefined) {
      console.log(`   Rerank 分数: ${result.rerankScore.toFixed(4)}`);
    }
    if (result.embeddingScore !== undefined) {
      console.log(`   Embedding 分数: ${result.embeddingScore.toFixed(4)}`);
    }
    
    if (result.chunk) {
      const preview = result.chunk.text.substring(0, 150).replace(/\n/g, ' ');
      console.log(`   匹配片段: ${preview}${result.chunk.text.length > 150 ? '...' : ''}`);
      console.log(`   位置: ${result.chunk.startPosition}-${result.chunk.endPosition}`);
    } else {
      const preview = result.text.substring(0, 150).replace(/\n/g, ' ');
      console.log(`   预览: ${preview}${result.text.length > 150 ? '...' : ''}`);
    }
  });
  
  console.log('\n' + '─'.repeat(80));
  
  if (results.length > topN) {
    console.log(`\n... 还有 ${results.length - topN} 个结果 (查看完整报告)`);
  }
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log(`
🔍 Jina 深度文件搜索工具

结合 Rerank 和 Embedding 模型，提供精准的语义搜索能力。

用法: node deep-search.js <查询语句> <文件夹路径> [选项]

示例:
  # 混合模式（推荐）
  node deep-search.js "JavaScript 异步编程" ./src

  # 仅使用 Rerank（快速）
  node deep-search.js "机器学习" ./docs --mode rerank-only

  # 仅使用 Embedding（精确）
  node deep-search.js "数据结构" ./src --mode embedding-only

  # 递归搜索子目录
  node deep-search.js "API 文档" ./project --recursive

  # 自定义输出路径
  node deep-search.js "React Hooks" ./src --output ./results.json

选项:
  --mode <模式>           搜索模式: hybrid, rerank-only, embedding-only (默认: hybrid)
  --rerank-top <数量>     Rerank 阶段保留的文档数 (默认: 50)
  --top <数量>            最终返回的结果数 (默认: 10)
  --no-chunk              禁用文本分块
  --recursive             递归搜索子目录
  --output <路径>         输出文件路径 (默认: ./work_dir/deep-search-results.json)

环境变量:
  JINA_API_KEY - Jina AI API 密钥 (必需)
    `);
    process.exit(1);
  }

  const query = args[0];
  const folderPath = args[1];
  
  // 解析选项
  const options = {
    mode: 'hybrid',
    rerankTopN: 50,
    finalTopN: 10,
    enableChunking: true,
    recursive: false,
    outputPath: './work_dir/deep-search-results.json'
  };
  
  for (let i = 2; i < args.length; i++) {
    if (args[i] === '--mode' && args[i + 1]) {
      options.mode = args[i + 1];
      i++;
    } else if (args[i] === '--rerank-top' && args[i + 1]) {
      options.rerankTopN = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--top' && args[i + 1]) {
      options.finalTopN = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--no-chunk') {
      options.enableChunking = false;
    } else if (args[i] === '--recursive') {
      options.recursive = true;
    } else if (args[i] === '--output' && args[i + 1]) {
      options.outputPath = args[i + 1];
      i++;
    }
  }

  try {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🔍 Jina 深度文件搜索`);
    console.log(`${'='.repeat(80)}`);
    console.log(`🎯 查询: "${query}"`);
    console.log(`📁 目录: ${folderPath}`);
    console.log(`🔧 模式: ${options.mode}`);
    console.log(`📊 返回结果数: ${options.finalTopN}`);
    console.log(`${'='.repeat(80)}\n`);

    // 验证 API Key
    if (!JINA_API_KEY) {
      console.error('❌ 错误: 未设置 JINA_API_KEY 环境变量');
      console.log('请在项目根目录创建 .env 文件并添加:');
      console.log('JINA_API_KEY=your_jina_api_key_here');
      process.exit(1);
    }

    // 读取文件
    const documents = readFilesFromFolder(folderPath, undefined, options.recursive);
    
    if (documents.length === 0) {
      console.log('❌ 没有找到可处理的文件');
      process.exit(1);
    }

    console.log('');

    // 执行深度搜索
    const results = await deepSearch(query, documents, options);

    // 显示结果
    displayResults(results, 10);

    // 生成报告
    generateReport(query, results, options, options.outputPath);

    console.log(`\n✅ 搜索完成！\n`);

  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    if (error.response) {
      console.error('API 响应:', error.response.data);
    }
    process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = {
  deepSearch,
  rerankDocuments,
  getEmbeddings,
  readFilesFromFolder,
  chunkText,
  cosineSimilarity
};

