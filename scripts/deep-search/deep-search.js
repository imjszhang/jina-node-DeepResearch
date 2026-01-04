const fs = require('fs');
const path = require('path');
const axios = require('axios');
// 从项目根目录加载 .env 文件
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// 配置
const JINA_API_KEY = process.env.JINA_API_KEY;
const JINA_RERANK_URL = process.env.JINA_RERANK_BASE_URL || 'https://api.jina.ai/v1/rerank';
const JINA_EMBEDDING_URL = process.env.JINA_EMBEDDING_BASE_URL || 'https://api.jina.ai/v1/embeddings';
const JINA_RERANK_MODEL = process.env.JINA_RERANK_MODEL || 'jina-reranker-v3';
const JINA_EMBEDDING_MODEL = process.env.JINA_EMBEDDING_MODEL || 'jina-embeddings-v4';
const RERANK_BATCH_SIZE = 100;
const EMBEDDING_BATCH_SIZE = 32;
const CHUNK_SIZE = 500; // 每个文本块的字符数
const SIMILARITY_THRESHOLD = 0.86; // 去重相似度阈值

/**
 * Token 使用追踪器
 * 监控 API 调用的 Token 消耗和成本
 */
class TokenTracker {
  constructor(budget = null) {
    this.usages = [];
    this.budget = budget;
    this.startTime = Date.now();
  }

  /**
   * 记录一次 API 调用的 Token 使用
   * @param {string} tool - 工具名称 (rerank/embedding)
   * @param {Object} usage - Token 使用信息
   */
  trackUsage(tool, usage) {
    const record = {
      tool,
      usage,
      timestamp: new Date().toISOString(),
      elapsedTime: Date.now() - this.startTime
    };
    this.usages.push(record);

    // 检查预算
    if (this.budget && this.getTotalTokens() > this.budget) {
      console.warn(`⚠️  Token 预算超限: ${this.getTotalTokens()}/${this.budget}`);
    }
  }

  /**
   * 获取总 Token 使用量
   */
  getTotalTokens() {
    return this.usages.reduce((sum, record) => {
      return sum + (record.usage.totalTokens || 0);
    }, 0);
  }

  /**
   * 获取各工具的使用统计
   */
  getBreakdown() {
    const breakdown = {};
    this.usages.forEach(record => {
      if (!breakdown[record.tool]) {
        breakdown[record.tool] = {
          count: 0,
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0
        };
      }
      breakdown[record.tool].count++;
      breakdown[record.tool].promptTokens += record.usage.promptTokens || 0;
      breakdown[record.tool].completionTokens += record.usage.completionTokens || 0;
      breakdown[record.tool].totalTokens += record.usage.totalTokens || 0;
    });
    return breakdown;
  }

  /**
   * 估算成本（基于 Jina AI 定价）
   * Rerank: $0.02 / 1K tokens
   * Embeddings: $0.02 / 1M tokens
   */
  estimateCost() {
    const breakdown = this.getBreakdown();
    let totalCost = 0;

    if (breakdown.rerank) {
      totalCost += (breakdown.rerank.totalTokens / 1000) * 0.02;
    }
    if (breakdown.embedding) {
      totalCost += (breakdown.embedding.totalTokens / 1000000) * 0.02;
    }

    return totalCost;
  }

  /**
   * 显示详细的使用报告
   */
  displayReport() {
    console.log('\n' + '═'.repeat(60));
    console.log('📊 Token 使用报告');
    console.log('═'.repeat(60));

    const breakdown = this.getBreakdown();
    const totalTokens = this.getTotalTokens();
    const estimatedCost = this.estimateCost();

    Object.entries(breakdown).forEach(([tool, stats]) => {
      console.log(`\n🔧 ${tool.toUpperCase()}:`);
      console.log(`   调用次数: ${stats.count}`);
      console.log(`   Prompt Tokens: ${stats.promptTokens.toLocaleString()}`);
      console.log(`   Completion Tokens: ${stats.completionTokens.toLocaleString()}`);
      console.log(`   总计: ${stats.totalTokens.toLocaleString()} tokens`);
    });

    console.log('\n' + '─'.repeat(60));
    console.log(`💰 总 Token 使用: ${totalTokens.toLocaleString()}`);
    console.log(`💵 估算成本: $${estimatedCost.toFixed(4)} USD`);
    console.log(`⏱️  总耗时: ${((Date.now() - this.startTime) / 1000).toFixed(2)}s`);
    
    if (this.budget) {
      const percentage = ((totalTokens / this.budget) * 100).toFixed(1);
      console.log(`📈 预算使用: ${percentage}% (${totalTokens}/${this.budget})`);
    }
    
    console.log('═'.repeat(60) + '\n');
  }

  /**
   * 获取简洁的摘要信息
   */
  getSummary() {
    return {
      totalTokens: this.getTotalTokens(),
      estimatedCost: this.estimateCost(),
      breakdown: this.getBreakdown(),
      duration: Date.now() - this.startTime
    };
  }
}

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
 * 智能去重：使用 Embedding 去除语义相似的重复结果
 * @param {Array} results - 搜索结果数组
 * @param {TokenTracker} tracker - Token 追踪器
 * @param {number} threshold - 相似度阈值（默认 0.86）
 * @returns {Promise<Array>} 去重后的结果数组
 */
async function deduplicateResults(results, tracker = null, threshold = SIMILARITY_THRESHOLD) {
  if (results.length <= 1) {
    return results;
  }

  console.log(`\n🔄 [去重] 开始智能去重 (阈值: ${threshold})...`);
  console.log(`📊 [去重] 原始结果数: ${results.length}`);

  try {
    // 获取所有结果的 embeddings
    const texts = results.map(r => r.text || r.chunk || '');
    const embeddings = await getEmbeddings(texts, {
      task: 'text-matching',
      dimensions: 1024,
      embedding_type: 'float'
    }, tracker);

    // 去重逻辑
    const uniqueResults = [];
    const duplicateIndices = new Set();

    for (let i = 0; i < results.length; i++) {
      if (duplicateIndices.has(i)) continue;

      let isDuplicate = false;
      
      // 与已选中的唯一结果比较
      for (let j = 0; j < uniqueResults.length; j++) {
        const similarity = cosineSimilarity(embeddings[i], embeddings[uniqueResults[j].originalIndex]);
        
        if (similarity > threshold) {
          isDuplicate = true;
          duplicateIndices.add(i);
          console.log(`   ⚠️  发现重复: 结果 ${i + 1} 与结果 ${uniqueResults[j].originalIndex + 1} 相似度 ${(similarity * 100).toFixed(1)}%`);
          break;
        }
      }

      if (!isDuplicate) {
        uniqueResults.push({
          ...results[i],
          originalIndex: i
        });
      }
    }

    console.log(`✅ [去重] 完成，保留 ${uniqueResults.length} 个唯一结果 (移除 ${results.length - uniqueResults.length} 个重复)`);
    
    return uniqueResults;

  } catch (error) {
    console.error('❌ [去重] 失败:', error.message);
    console.log('   ⚠️  跳过去重，返回原始结果');
    return results;
  }
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
 * 构建引用系统：为搜索结果添加详细的来源信息
 * @param {Array} results - 搜索结果数组
 * @param {Array} originalDocuments - 原始文档数组
 * @returns {Array} 带有引用信息的结果数组
 */
function buildReferences(results, originalDocuments) {
  console.log(`\n📎 [引用] 构建引用系统...`);
  
  return results.map((result, idx) => {
    // 查找原始文档
    const sourceDoc = originalDocuments.find(doc => 
      doc.path === result.path || 
      doc.filePath === result.filePath ||
      doc.source === result.source ||
      doc.text === result.text
    );

    if (!sourceDoc) {
      const fallbackText = (result.chunk && result.chunk.text) ? result.chunk.text : (result.text || '');
      return {
        ...result,
        reference: {
          index: idx + 1,
          filePath: result.filePath || result.path || '未知',
          fileName: result.fileName || result.source || '未知',
          excerpt: fallbackText.substring(0, 150) + (fallbackText.length > 150 ? '...' : ''),
          context: null
        }
      };
    }

    // 如果是块级结果，找到块在原文中的位置
    let contextStart = 0;
    let contextEnd = 0;
    let lineNumber = 0;

    if (result.chunk || result.text) {
      const searchText = (result.chunk && result.chunk.text) ? result.chunk.text : (result.chunk || result.text);
      const fullText = sourceDoc.content || sourceDoc.text;
      
      // 查找文本在原文中的位置
      const position = fullText.indexOf(searchText);
      
      if (position !== -1) {
        contextStart = Math.max(0, position - 100);
        contextEnd = Math.min(fullText.length, position + searchText.length + 100);
        
        // 计算行号
        const textBeforeMatch = fullText.substring(0, position);
        lineNumber = textBeforeMatch.split('\n').length;
      }
    }

    // 构建引用信息
    const excerptText = (result.chunk && result.chunk.text) ? result.chunk.text : (result.text || '');
    const reference = {
      index: idx + 1,
      filePath: result.filePath || result.path || '未知',
      fileName: result.fileName || result.source || (result.filePath ? path.basename(result.filePath) : (result.path ? path.basename(result.path) : '未知')),
      lineNumber: lineNumber > 0 ? lineNumber : null,
      excerpt: excerptText.substring(0, 150) + (excerptText.length > 150 ? '...' : ''),
      context: contextStart > 0 ? {
        before: (sourceDoc.content || sourceDoc.text).substring(contextStart, contextStart + 100),
        after: (sourceDoc.content || sourceDoc.text).substring(contextEnd - 100, contextEnd)
      } : null,
      position: result.startPosition !== undefined ? {
        start: result.startPosition,
        end: result.endPosition
      } : null
    };

    return {
      ...result,
      reference
    };
  });
}

/**
 * 格式化引用信息用于显示
 * @param {Object} reference - 引用对象
 * @returns {string} 格式化的引用字符串
 */
function formatReference(reference) {
  if (!reference) return '';
  
  let refText = `\n📎 引用 [${reference.index}]:\n`;
  refText += `   文件: ${reference.fileName}\n`;
  refText += `   路径: ${reference.filePath}\n`;
  
  if (reference.lineNumber) {
    refText += `   行号: ${reference.lineNumber}\n`;
  }
  
  if (reference.position) {
    refText += `   位置: ${reference.position.start} - ${reference.position.end}\n`;
  }
  
  refText += `   摘录: ${reference.excerpt}\n`;
  
  if (reference.context) {
    refText += `   上下文:\n`;
    refText += `     前文: ...${reference.context.before}...\n`;
    refText += `     后文: ...${reference.context.after}...\n`;
  }
  
  return refText;
}

/**
 * 使用 Jina Rerank 对文档进行重排序（第一阶段：粗筛）
 * @param {string} query - 查询语句
 * @param {Array} documents - 文档数组
 * @param {number} topN - 返回前 N 个结果
 * @param {TokenTracker} tracker - Token 追踪器
 * @returns {Promise<Array>} 排序后的文档数组
 */
async function rerankDocuments(query, documents, topN = null, tracker = null) {
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
            model: JINA_RERANK_MODEL,
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

          // 追踪 Token 使用
          if (tracker && response.data.usage) {
            tracker.trackUsage('rerank', {
              promptTokens: response.data.usage.total_tokens || 0,
              completionTokens: 0,
              totalTokens: response.data.usage.total_tokens || 0
            });
          }

          console.log(`✅ [Rerank] 批次 ${batchIndex + 1} 完成`);

          return response.data.results.map(result => ({
            ...batchDocuments[result.index],
            rerankScore: result.relevance_score,
            originalIndex: startIdx + result.index
          }));
        } catch (error) {
          console.error(`❌ [Rerank] 批次 ${batchIndex + 1} 失败:`, error.message);
          if (error.response && error.response.data) {
            console.error('   详细错误:', JSON.stringify(error.response.data, null, 2));
          }
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
 * @param {TokenTracker} tracker - Token 追踪器
 * @returns {Promise<Array>} 向量数组
 */
async function getEmbeddings(texts, options = {}, tracker = null) {
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
        model: JINA_EMBEDDING_MODEL,
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

      // 追踪 Token 使用
      if (tracker && response.data.usage) {
        tracker.trackUsage('embedding', {
          promptTokens: response.data.usage.total_tokens || 0,
          completionTokens: 0,
          totalTokens: response.data.usage.total_tokens || 0
        });
      }

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
 * @returns {Promise<Object>} 搜索结果和统计信息
 */
async function deepSearch(query, documents, options = {}) {
  const {
    mode = 'hybrid', // 'rerank-only', 'embedding-only', 'hybrid'
    rerankTopN = Math.min(50, documents.length), // Rerank 阶段保留的文档数
    finalTopN = 10, // 最终返回的结果数
    enableChunking = true, // 是否启用分块
    minChunkLength = 50, // 最小块长度
    enableDedup = true, // 是否启用智能去重
    enableReferences = true, // 是否启用引用系统
    tokenBudget = null, // Token 预算限制
  } = options;

  // 创建 Token 追踪器
  const tracker = new TokenTracker(tokenBudget);

  console.log(`\n🔍 开始深度搜索 (模式: ${mode})`);
  console.log(`📚 总文档数: ${documents.length}`);
  console.log('─'.repeat(60));

  let results = [];

  if (mode === 'rerank-only') {
    // 仅使用 Rerank
    results = await rerankDocuments(query, documents, finalTopN, tracker);
    results = results.map(doc => ({
      ...doc,
      finalScore: doc.rerankScore,
      matchType: 'rerank'
    }));
  } else if (mode === 'embedding-only') {
    // 仅使用 Embedding
    const docTexts = documents.map(doc => doc.text);
    
    // 使用 retrieval 任务类型获取查询向量
    const [queryEmbedding] = await getEmbeddings([query], {
      task: 'retrieval',
      dimensions: 1024,
      embedding_type: 'float'
    }, tracker);
    
    // 使用 retrieval 任务类型获取文档向量
    const docEmbeddings = await getEmbeddings(docTexts, {
      task: 'retrieval',
      dimensions: 1024,
      embedding_type: 'float'
    }, tracker);
    
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
    const rerankResults = await rerankDocuments(query, documents, rerankTopN, tracker);
    
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
      
      // 获取查询的 embedding（使用 retrieval）
      const [queryEmbedding] = await getEmbeddings([query], {
        task: 'retrieval',
        dimensions: 1024,
        embedding_type: 'float'
      }, tracker);
      
      // 获取所有块的 embedding（使用 retrieval + late_chunking）
      const chunkEmbeddings = await getEmbeddings(allChunks, {
        task: 'retrieval',
        dimensions: 1024,
        late_chunking: true,
        embedding_type: 'float'
      }, tracker);
      
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
      
      // 获取查询的 embedding（使用 retrieval）
      const [queryEmbedding] = await getEmbeddings([query], {
        task: 'retrieval',
        dimensions: 1024,
        embedding_type: 'float'
      }, tracker);
      
      // 获取文档的 embedding（使用 retrieval）
      const docEmbeddings = await getEmbeddings(docTexts, {
        task: 'retrieval',
        dimensions: 1024,
        embedding_type: 'float'
      }, tracker);
      
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

  // 智能去重
  if (enableDedup && results.length > 1) {
    results = await deduplicateResults(results, tracker);
  }

  // 构建引用系统
  if (enableReferences) {
    results = buildReferences(results, documents);
  }

  console.log('─'.repeat(60));
  console.log(`✅ 深度搜索完成，返回 ${results.length} 个结果\n`);
  
  // 显示 Token 使用报告
  tracker.displayReport();
  
  return {
    results,
    tokenUsage: tracker.getSummary()
  };
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
function generateReport(query, results, tokenUsage, options, outputPath) {
  const report = {
    query: query,
    timestamp: new Date().toISOString(),
    searchMode: options.mode || 'hybrid',
    totalResults: results.length,
    tokenUsage: tokenUsage,
    options: options,
    results: results.map((result, index) => {
      const baseResult = {
        rank: index + 1,
        filename: result.source,
        relativePath: result.relativePath,
        finalScore: result.finalScore,
        matchType: result.matchType,
        fileSize: formatFileSize(result.text ? result.text.length : 0),
      };
      
      // 添加不同模式的分数
      if (result.rerankScore !== undefined) {
        baseResult.rerankScore = result.rerankScore;
      }
      if (result.embeddingScore !== undefined) {
        baseResult.embeddingScore = result.embeddingScore;
      }
      
      // 添加引用信息
      if (result.reference) {
        baseResult.reference = result.reference;
      }
      
      // 如果有块信息，添加匹配的具体位置
      if (result.chunk) {
        baseResult.matchedChunk = {
          text: result.chunk.text.substring(0, 300) + (result.chunk.text.length > 300 ? '...' : ''),
          startPosition: result.chunk.startPosition,
          endPosition: result.chunk.endPosition
        };
      } else if (result.text) {
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
    
    // 显示引用信息
    if (result.reference) {
      if (result.reference.lineNumber) {
        console.log(`   行号: ${result.reference.lineNumber}`);
      }
      if (result.reference.position) {
        console.log(`   位置: ${result.reference.position.start}-${result.reference.position.end}`);
      }
    }
    
    if (result.chunk) {
      const preview = result.chunk.text.substring(0, 150).replace(/\n/g, ' ');
      console.log(`   匹配片段: ${preview}${result.chunk.text.length > 150 ? '...' : ''}`);
      if (!result.reference || !result.reference.position) {
        console.log(`   位置: ${result.chunk.startPosition}-${result.chunk.endPosition}`);
      }
    } else if (result.text) {
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
  --no-dedup              禁用智能去重
  --no-references         禁用引用系统
  --recursive             递归搜索子目录
  --output <路径>         输出文件路径 (默认: ./work_dir/deep-search-results.json)
  --token-budget <数量>   Token 使用预算限制

新功能:
  ✨ Token 追踪器 - 实时监控 API 成本和使用情况
  ✨ 智能去重 - 使用 Embedding 自动去除语义相似的重复结果
  ✨ 引用系统 - 显示结果的精确位置、行号和上下文

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
    enableDedup: true,
    enableReferences: true,
    recursive: false,
    tokenBudget: null,
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
    } else if (args[i] === '--no-dedup') {
      options.enableDedup = false;
    } else if (args[i] === '--no-references') {
      options.enableReferences = false;
    } else if (args[i] === '--recursive') {
      options.recursive = true;
    } else if (args[i] === '--token-budget' && args[i + 1]) {
      options.tokenBudget = parseInt(args[i + 1]);
      i++;
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
    const searchResult = await deepSearch(query, documents, options);
    const results = searchResult.results;

    // 显示结果
    displayResults(results, 10);

    // 生成报告
    generateReport(query, results, searchResult.tokenUsage, options, options.outputPath);

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
  cosineSimilarity,
  deduplicateResults,
  buildReferences,
  formatReference,
  TokenTracker
};

