const { deepSearch, readFilesFromFolder } = require('./deep-search');
const fs = require('fs');
const path = require('path');

/**
 * 性能基准测试工具
 */
class Benchmark {
  constructor() {
    this.results = [];
  }

  /**
   * 运行单个测试
   */
  async runTest(name, fn) {
    console.log(`\n🏃 运行测试: ${name}`);
    console.log('─'.repeat(60));
    
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;
    
    try {
      const result = await fn();
      
      const endTime = Date.now();
      const endMemory = process.memoryUsage().heapUsed;
      const duration = endTime - startTime;
      const memoryUsed = (endMemory - startMemory) / 1024 / 1024;
      
      const testResult = {
        name,
        success: true,
        duration,
        memoryUsed,
        resultCount: result.length,
        topScore: result[0]?.finalScore || 0,
        timestamp: new Date().toISOString()
      };
      
      this.results.push(testResult);
      
      console.log(`✅ 完成: ${duration}ms`);
      console.log(`📊 内存使用: ${memoryUsed.toFixed(2)} MB`);
      console.log(`📈 结果数量: ${result.length}`);
      console.log(`⭐ 最高分数: ${testResult.topScore.toFixed(4)}`);
      
      return testResult;
    } catch (error) {
      console.error(`❌ 失败:`, error.message);
      
      const testResult = {
        name,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      
      this.results.push(testResult);
      return testResult;
    }
  }

  /**
   * 生成对比报告
   */
  generateReport(outputPath) {
    const report = {
      timestamp: new Date().toISOString(),
      totalTests: this.results.length,
      successfulTests: this.results.filter(r => r.success).length,
      failedTests: this.results.filter(r => !r.success).length,
      results: this.results,
      comparison: this.compareResults()
    };

    // 保存 JSON 报告
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf8');
    
    // 打印对比表格
    this.printComparisonTable();
    
    console.log(`\n📋 详细报告已保存: ${outputPath}`);
    
    return report;
  }

  /**
   * 对比结果
   */
  compareResults() {
    const successful = this.results.filter(r => r.success);
    
    if (successful.length === 0) {
      return null;
    }

    const fastest = successful.reduce((min, r) => r.duration < min.duration ? r : min);
    const slowest = successful.reduce((max, r) => r.duration > max.duration ? r : max);
    const mostAccurate = successful.reduce((max, r) => r.topScore > max.topScore ? r : max);
    
    const avgDuration = successful.reduce((sum, r) => sum + r.duration, 0) / successful.length;
    const avgMemory = successful.reduce((sum, r) => sum + r.memoryUsed, 0) / successful.length;
    const avgScore = successful.reduce((sum, r) => sum + r.topScore, 0) / successful.length;

    return {
      fastest: { name: fastest.name, duration: fastest.duration },
      slowest: { name: slowest.name, duration: slowest.duration },
      mostAccurate: { name: mostAccurate.name, score: mostAccurate.topScore },
      averages: {
        duration: avgDuration,
        memory: avgMemory,
        score: avgScore
      }
    };
  }

  /**
   * 打印对比表格
   */
  printComparisonTable() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 性能对比表');
    console.log('='.repeat(80));
    console.log('');
    
    const successful = this.results.filter(r => r.success);
    
    if (successful.length === 0) {
      console.log('❌ 没有成功的测试结果');
      return;
    }

    // 表头
    console.log('模式'.padEnd(25) + 
                '耗时'.padEnd(15) + 
                '内存'.padEnd(15) + 
                '结果数'.padEnd(10) + 
                '最高分');
    console.log('─'.repeat(80));

    // 数据行
    successful.forEach(result => {
      console.log(
        result.name.padEnd(25) +
        `${result.duration}ms`.padEnd(15) +
        `${result.memoryUsed.toFixed(2)} MB`.padEnd(15) +
        result.resultCount.toString().padEnd(10) +
        result.topScore.toFixed(4)
      );
    });

    console.log('─'.repeat(80));

    // 统计信息
    const comparison = this.compareResults();
    if (comparison) {
      console.log('\n📈 统计摘要:');
      console.log(`  ⚡ 最快: ${comparison.fastest.name} (${comparison.fastest.duration}ms)`);
      console.log(`  🐌 最慢: ${comparison.slowest.name} (${comparison.slowest.duration}ms)`);
      console.log(`  🎯 最准: ${comparison.mostAccurate.name} (${comparison.mostAccurate.score.toFixed(4)})`);
      console.log(`  📊 平均耗时: ${comparison.averages.duration.toFixed(2)}ms`);
      console.log(`  💾 平均内存: ${comparison.averages.memory.toFixed(2)} MB`);
      console.log(`  ⭐ 平均分数: ${comparison.averages.score.toFixed(4)}`);
    }

    console.log('\n' + '='.repeat(80));
  }
}

/**
 * 运行完整的基准测试
 */
async function runFullBenchmark(query, folderPath, options = {}) {
  const {
    topN = 10,
    rerankTopN = 50,
    outputPath = './work_dir/benchmark-results.json'
  } = options;

  console.log('\n' + '='.repeat(80));
  console.log('🔬 Jina 深度搜索 - 性能基准测试');
  console.log('='.repeat(80));
  console.log(`🎯 查询: "${query}"`);
  console.log(`📁 目录: ${folderPath}`);
  console.log(`📊 返回结果数: ${topN}`);
  console.log('='.repeat(80));

  // 读取文件（只读一次，避免影响测试）
  console.log('\n📚 加载文件...');
  const documents = readFilesFromFolder(folderPath);
  console.log(`✅ 加载了 ${documents.length} 个文件`);

  const benchmark = new Benchmark();

  // 测试 1: Rerank-Only 模式
  await benchmark.runTest('Rerank-Only (快速模式)', async () => {
    return await deepSearch(query, documents, {
      mode: 'rerank-only',
      finalTopN: topN
    });
  });

  // 等待一下，避免 API 限流
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 测试 2: Embedding-Only 模式
  await benchmark.runTest('Embedding-Only (精确模式)', async () => {
    return await deepSearch(query, documents, {
      mode: 'embedding-only',
      finalTopN: topN
    });
  });

  await new Promise(resolve => setTimeout(resolve, 2000));

  // 测试 3: Hybrid 模式（不分块）
  await benchmark.runTest('Hybrid 不分块', async () => {
    return await deepSearch(query, documents, {
      mode: 'hybrid',
      rerankTopN: rerankTopN,
      finalTopN: topN,
      enableChunking: false
    });
  });

  await new Promise(resolve => setTimeout(resolve, 2000));

  // 测试 4: Hybrid 模式（分块）
  await benchmark.runTest('Hybrid 分块 (推荐)', async () => {
    return await deepSearch(query, documents, {
      mode: 'hybrid',
      rerankTopN: rerankTopN,
      finalTopN: topN,
      enableChunking: true
    });
  });

  // 生成报告
  const report = benchmark.generateReport(outputPath);

  return report;
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log(`
🔬 Jina 深度搜索 - 性能基准测试工具

用法: node benchmark.js <查询语句> <文件夹路径> [选项]

示例:
  node benchmark.js "JavaScript 异步编程" ../../work_dir/test-data
  node benchmark.js "错误处理" ../../src --top 5
  node benchmark.js "数据结构" ../../work_dir/test-data --output ./my-benchmark.json

选项:
  --top <数量>        返回的结果数 (默认: 10)
  --rerank-top <数量> Rerank 阶段保留数 (默认: 50)
  --output <路径>     输出报告路径 (默认: ./work_dir/benchmark-results.json)

说明:
  此工具会运行以下四种模式的测试：
  1. Rerank-Only (快速模式)
  2. Embedding-Only (精确模式)
  3. Hybrid 不分块
  4. Hybrid 分块 (推荐)

  并生成详细的性能对比报告。
    `);
    process.exit(1);
  }

  const query = args[0];
  const folderPath = args[1];

  const options = {
    topN: 10,
    rerankTopN: 50,
    outputPath: './work_dir/benchmark-results.json'
  };

  for (let i = 2; i < args.length; i++) {
    if (args[i] === '--top' && args[i + 1]) {
      options.topN = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--rerank-top' && args[i + 1]) {
      options.rerankTopN = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--output' && args[i + 1]) {
      options.outputPath = args[i + 1];
      i++;
    }
  }

  try {
    await runFullBenchmark(query, folderPath, options);
    console.log('\n✅ 基准测试完成！\n');
  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { Benchmark, runFullBenchmark };

