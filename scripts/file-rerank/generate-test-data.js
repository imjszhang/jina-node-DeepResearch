const fs = require('fs');
const path = require('path');
require('dotenv').config();

// 测试数据内容
const testData = {
  // JavaScript 相关文件
  'array-methods.js': `
// JavaScript 数组方法详解
const numbers = [1, 2, 3, 4, 5];

// map 方法 - 转换数组元素
const doubled = numbers.map(num => num * 2);
console.log('Doubled:', doubled);

// filter 方法 - 过滤数组元素
const evenNumbers = numbers.filter(num => num % 2 === 0);
console.log('Even numbers:', evenNumbers);

// reduce 方法 - 累积计算
const sum = numbers.reduce((acc, num) => acc + num, 0);
console.log('Sum:', sum);

// forEach 方法 - 遍历数组
numbers.forEach((num, index) => {
  console.log(\`Index \${index}: \${num}\`);
});

// find 方法 - 查找元素
const firstEven = numbers.find(num => num % 2 === 0);
console.log('First even:', firstEven);
`,

  'async-programming.js': `
// JavaScript 异步编程
async function fetchData(url) {
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
}

// Promise 链式调用
function processData() {
  return fetchData('/api/users')
    .then(users => users.filter(user => user.active))
    .then(activeUsers => activeUsers.map(user => user.name))
    .catch(error => {
      console.error('Processing failed:', error);
      return [];
    });
}

// 并发处理
async function fetchMultipleData() {
  const urls = ['/api/users', '/api/posts', '/api/comments'];
  
  try {
    const results = await Promise.all(
      urls.map(url => fetchData(url))
    );
    return results;
  } catch (error) {
    console.error('Concurrent fetch failed:', error);
  }
}
`,

  'dom-manipulation.js': `
// DOM 操作和事件处理
document.addEventListener('DOMContentLoaded', function() {
  // 选择元素
  const button = document.getElementById('myButton');
  const list = document.querySelector('.item-list');
  
  // 添加事件监听器
  button.addEventListener('click', function() {
    addListItem();
  });
  
  // 创建新元素
  function addListItem() {
    const newItem = document.createElement('li');
    newItem.textContent = 'New Item ' + (list.children.length + 1);
    newItem.className = 'list-item';
    
    // 添加到列表
    list.appendChild(newItem);
    
    // 添加删除功能
    newItem.addEventListener('click', function() {
      this.remove();
    });
  }
  
  // 样式操作
  function toggleTheme() {
    document.body.classList.toggle('dark-theme');
  }
});
`,

  // Python 相关文件
  'machine-learning.py': `
# 机器学习基础示例
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error, r2_score
import matplotlib.pyplot as plt

# 生成示例数据
np.random.seed(42)
X = np.random.randn(100, 1)
y = 2 * X.flatten() + 1 + np.random.randn(100) * 0.1

# 分割数据集
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# 创建线性回归模型
model = LinearRegression()
model.fit(X_train, y_train)

# 预测
y_pred = model.predict(X_test)

# 评估模型
mse = mean_squared_error(y_test, y_pred)
r2 = r2_score(y_test, y_pred)

print(f"均方误差: {mse:.4f}")
print(f"R² 分数: {r2:.4f}")
print(f"模型参数: 斜率={model.coef_[0]:.4f}, 截距={model.intercept_:.4f}")

# 可视化结果
plt.figure(figsize=(10, 6))
plt.scatter(X_test, y_test, color='blue', alpha=0.6, label='实际值')
plt.scatter(X_test, y_pred, color='red', alpha=0.6, label='预测值')
plt.plot(X_test, y_pred, color='red', linewidth=2)
plt.xlabel('X')
plt.ylabel('y')
plt.title('线性回归预测结果')
plt.legend()
plt.grid(True, alpha=0.3)
plt.show()
`,

  'data-analysis.py': `
# 数据分析和可视化
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

# 创建示例数据
data = {
    'name': ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'],
    'age': [25, 30, 35, 28, 32],
    'salary': [50000, 60000, 70000, 55000, 65000],
    'department': ['IT', 'HR', 'IT', 'Finance', 'IT']
}

df = pd.DataFrame(data)

# 基本统计信息
print("数据概览:")
print(df.head())
print("\\n描述性统计:")
print(df.describe())

# 分组分析
print("\\n按部门分组的平均薪资:")
dept_salary = df.groupby('department')['salary'].mean()
print(dept_salary)

# 数据可视化
plt.figure(figsize=(12, 8))

# 子图1: 年龄分布
plt.subplot(2, 2, 1)
plt.hist(df['age'], bins=5, color='skyblue', alpha=0.7)
plt.title('年龄分布')
plt.xlabel('年龄')
plt.ylabel('频次')

# 子图2: 薪资分布
plt.subplot(2, 2, 2)
plt.boxplot(df['salary'])
plt.title('薪资分布')
plt.ylabel('薪资')

# 子图3: 部门薪资对比
plt.subplot(2, 2, 3)
dept_salary.plot(kind='bar', color='lightgreen')
plt.title('各部门平均薪资')
plt.xlabel('部门')
plt.ylabel('平均薪资')
plt.xticks(rotation=45)

# 子图4: 年龄与薪资关系
plt.subplot(2, 2, 4)
plt.scatter(df['age'], df['salary'], color='red', alpha=0.7)
plt.title('年龄与薪资关系')
plt.xlabel('年龄')
plt.ylabel('薪资')

plt.tight_layout()
plt.show()
`,

  // 文档文件
  'README.md': `
# 项目说明文档

## 概述
这是一个演示项目，展示了如何使用 Jina Rerank 模型对文件内容进行智能排序。

## 功能特性
- 支持多种文件格式 (JavaScript, Python, Markdown, JSON, HTML, CSS)
- 使用 Jina AI 的多语言重排序模型
- 批量处理大量文件
- 生成详细的排序报告

## 使用方法

### 1. 安装依赖
\`\`\`bash
npm install axios
\`\`\`

### 2. 设置环境变量
\`\`\`bash
export JINA_API_KEY=your_jina_api_key_here
\`\`\`

### 3. 运行脚本
\`\`\`bash
node scripts/file-rerank.js "JavaScript 函数" ./scripts/test-data
\`\`\`

## 示例查询
- "JavaScript 函数"
- "机器学习算法"
- "数据分析"
- "异步编程"
- "DOM 操作"

## 输出格式
脚本会生成一个 JSON 格式的报告，包含：
- 查询语句
- 时间戳
- 文件总数
- 排序结果（包含相关性分数和文件预览）
`,

  'api-reference.md': `
# API 参考文档

## Jina Rerank API

### 端点
\`https://api.jina.ai/v1/rerank\`

### 请求格式
\`\`\`json
{
  "model": "jina-reranker-v2-base-multilingual",
  "query": "查询语句",
  "top_n": 10,
  "documents": ["文档1", "文档2", "文档3"]
}
\`\`\`

### 响应格式
\`\`\`json
{
  "model": "jina-reranker-v2-base-multilingual",
  "results": [
    {
      "index": 0,
      "document": {
        "text": "文档内容"
      },
      "relevance_score": 0.95
    }
  ],
  "usage": {
    "total_tokens": 150
  }
}
\`\`\`

### 模型特性
- **多语言支持**: 支持中文、英文、日文等多种语言
- **高精度**: 基于深度学习的语义理解
- **快速响应**: 毫秒级别的响应时间
- **批量处理**: 支持一次处理多个文档

### 使用限制
- 每个请求最多 1000 个文档
- 每个文档最大 8192 个 token
- API 调用频率限制根据账户类型而定
`,

  // 配置文件
  'config.json': `{
  "rerank": {
    "model": "jina-reranker-v2-base-multilingual",
    "batchSize": 100,
    "timeout": 30000,
    "maxRetries": 3
  },
  "fileTypes": {
    "supported": [".txt", ".md", ".js", ".json", ".py", ".html", ".css"],
    "maxFileSize": "10MB",
    "encoding": "utf8"
  },
  "output": {
    "format": "json",
    "includePreview": true,
    "previewLength": 200,
    "sortBy": "relevance_score"
  },
  "logging": {
    "level": "info",
    "includeTimestamp": true,
    "colorOutput": true
  }
}`,

  // HTML 文件
  'index.html': `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>文件重排序演示</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            text-align: center;
            margin-bottom: 30px;
        }
        .search-box {
            margin-bottom: 20px;
        }
        input[type="text"] {
            width: 100%;
            padding: 12px;
            border: 2px solid #ddd;
            border-radius: 5px;
            font-size: 16px;
        }
        button {
            background-color: #007bff;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            margin-top: 10px;
        }
        button:hover {
            background-color: #0056b3;
        }
        .results {
            margin-top: 30px;
        }
        .result-item {
            background: #f8f9fa;
            padding: 15px;
            margin-bottom: 10px;
            border-radius: 5px;
            border-left: 4px solid #007bff;
        }
        .filename {
            font-weight: bold;
            color: #333;
        }
        .score {
            color: #666;
            font-size: 14px;
        }
        .preview {
            margin-top: 10px;
            color: #555;
            font-size: 14px;
            line-height: 1.4;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔍 文件内容重排序演示</h1>
        
        <div class="search-box">
            <input type="text" id="queryInput" placeholder="输入查询语句，例如：JavaScript 函数">
            <button onclick="searchFiles()">搜索排序</button>
        </div>
        
        <div id="results" class="results"></div>
    </div>

    <script>
        // 模拟搜索功能
        function searchFiles() {
            const query = document.getElementById('queryInput').value;
            const resultsDiv = document.getElementById('results');
            
            if (!query.trim()) {
                alert('请输入查询语句');
                return;
            }
            
            // 模拟结果
            const mockResults = [
                {
                    filename: 'array-methods.js',
                    score: 0.95,
                    preview: 'JavaScript 数组方法详解 - map, filter, reduce 等常用方法的使用示例...'
                },
                {
                    filename: 'async-programming.js',
                    score: 0.87,
                    preview: 'JavaScript 异步编程 - Promise, async/await 的使用方法和最佳实践...'
                },
                {
                    filename: 'dom-manipulation.js',
                    score: 0.82,
                    preview: 'DOM 操作和事件处理 - 如何选择元素、添加事件监听器和动态创建内容...'
                }
            ];
            
            resultsDiv.innerHTML = '<h3>搜索结果：</h3>';
            
            mockResults.forEach((result, index) => {
                const resultDiv = document.createElement('div');
                resultDiv.className = 'result-item';
                resultDiv.innerHTML = \`
                    <div class="filename">\${index + 1}. \${result.filename}</div>
                    <div class="score">相关性分数: \${result.score.toFixed(4)}</div>
                    <div class="preview">\${result.preview}</div>
                \`;
                resultsDiv.appendChild(resultDiv);
            });
        }
        
        // 回车键搜索
        document.getElementById('queryInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchFiles();
            }
        });
    </script>
</body>
</html>`,

  // CSS 文件
  'styles.css': `
/* 文件重排序演示样式 */
:root {
  --primary-color: #007bff;
  --secondary-color: #6c757d;
  --success-color: #28a745;
  --warning-color: #ffc107;
  --danger-color: #dc3545;
  --light-color: #f8f9fa;
  --dark-color: #343a40;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  line-height: 1.6;
  color: var(--dark-color);
  background-color: var(--light-color);
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.header {
  text-align: center;
  margin-bottom: 40px;
  padding: 20px;
  background: white;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.search-section {
  background: white;
  padding: 30px;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  margin-bottom: 30px;
}

.form-group {
  margin-bottom: 20px;
}

label {
  display: block;
  margin-bottom: 5px;
  font-weight: 600;
  color: var(--dark-color);
}

input[type="text"],
select {
  width: 100%;
  padding: 12px;
  border: 2px solid #ddd;
  border-radius: 5px;
  font-size: 16px;
  transition: border-color 0.3s;
}

input[type="text"]:focus,
select:focus {
  outline: none;
  border-color: var(--primary-color);
}

.btn {
  background-color: var(--primary-color);
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s;
}

.btn:hover {
  background-color: #0056b3;
}

.btn-secondary {
  background-color: var(--secondary-color);
}

.btn-secondary:hover {
  background-color: #545b62;
}

.results-section {
  background: white;
  padding: 30px;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.result-item {
  background: var(--light-color);
  padding: 20px;
  margin-bottom: 15px;
  border-radius: 8px;
  border-left: 4px solid var(--primary-color);
  transition: transform 0.2s;
}

.result-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.filename {
  font-weight: bold;
  font-size: 18px;
  color: var(--dark-color);
}

.score {
  background-color: var(--primary-color);
  color: white;
  padding: 4px 8px;
  border-radius: 15px;
  font-size: 14px;
}

.preview {
  color: var(--secondary-color);
  font-size: 14px;
  line-height: 1.5;
  margin-top: 10px;
}

.loading {
  text-align: center;
  padding: 40px;
  color: var(--secondary-color);
}

.error {
  background-color: #f8d7da;
  color: var(--danger-color);
  padding: 15px;
  border-radius: 5px;
  margin-bottom: 20px;
}

.success {
  background-color: #d4edda;
  color: var(--success-color);
  padding: 15px;
  border-radius: 5px;
  margin-bottom: 20px;
}

@media (max-width: 768px) {
  .container {
    padding: 10px;
  }
  
  .result-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .score {
    margin-top: 5px;
  }
}
`
};

/**
 * 创建测试数据目录和文件
 */
function generateTestData() {
  const testDataDir = path.join(__dirname, '../../work_dir/test-data');
  
  // 创建目录
  if (!fs.existsSync(testDataDir)) {
    fs.mkdirSync(testDataDir, { recursive: true });
    console.log(`📁 创建测试数据目录: ${testDataDir}`);
  }
  
  // 生成测试文件
  let fileCount = 0;
  for (const [filename, content] of Object.entries(testData)) {
    const filePath = path.join(testDataDir, filename);
    fs.writeFileSync(filePath, content.trim(), 'utf8');
    console.log(`📄 生成文件: ${filename} (${content.length} 字符)`);
    fileCount++;
  }
  
  console.log(`✅ 成功生成 ${fileCount} 个测试文件`);
  console.log(`📍 测试数据位置: ${testDataDir}`);
  
  return testDataDir;
}

/**
 * 生成使用示例
 */
function generateUsageExamples() {
  const examples = [
    {
      query: "JavaScript 函数",
      description: "查找 JavaScript 函数相关的文件"
    },
    {
      query: "机器学习算法",
      description: "查找机器学习和算法相关的内容"
    },
    {
      query: "数据分析",
      description: "查找数据分析和可视化相关的文件"
    },
    {
      query: "异步编程",
      description: "查找异步编程和 Promise 相关的内容"
    },
    {
      query: "DOM 操作",
      description: "查找 DOM 操作和事件处理相关的文件"
    },
    {
      query: "API 文档",
      description: "查找 API 参考和文档相关的内容"
    }
  ];
  
  console.log('\n🔍 使用示例:');
  examples.forEach((example, index) => {
    console.log(`${index + 1}. ${example.description}`);
    console.log(`   node file-rerank.js "${example.query}" ./work_dir/test-data`);
    console.log('');
  });
}

/**
 * 主函数
 */
function main() {
  console.log('🚀 生成 Jina Rerank 测试数据...\n');
  
  try {
    const testDataDir = generateTestData();
    generateUsageExamples();
    
    console.log('─'.repeat(60));
    console.log('📋 下一步操作:');
    console.log('1. 设置环境变量:');
    console.log('   方法1: 创建 .env 文件，添加 JINA_API_KEY=your_api_key');
    console.log('   方法2: export JINA_API_KEY=your_api_key');
    console.log('2. 安装依赖: npm install axios dotenv');
    console.log('3. 运行测试: node file-rerank.js "JavaScript 函数" ./work_dir/test-data');
    console.log('─'.repeat(60));
    
  } catch (error) {
    console.error('❌ 生成测试数据失败:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  generateTestData,
  testData
}; 