# 🔍 Jina 深度文件搜索工具

这是一个结合 **Rerank** 和 **Embedding** 模型的高级文件搜索工具，提供精准的语义搜索能力。

## ✨ 核心特性

### 🚀 使用 Jina Reranker v2

- **多语言支持**：支持多种语言，包括中文、英文、日文、韩文等
- **高性能**：在 BEIR 基准上达到 57.06 nDCG@10
- **稳定可靠**：API 完全可用，响应快速
- **生产就绪**：经过充分测试，可直接用于生产环境

> 💡 **说明**：虽然 v3 模型性能更强（BEIR 61.94），但目前 API 可能需要特殊权限。我们使用完全可用的 v2 模型，性能依然优秀！

### 🎯 三种搜索模式

1. **Hybrid 混合模式（推荐）**
   - 第一阶段：使用 Rerank v2 快速粗筛
   - 第二阶段：使用 Embedding v3 精细匹配
   - 结合两者优势，平衡速度与精度

2. **Rerank-Only 快速模式**
   - 仅使用 Rerank v2 模型
   - 速度快，适合大量文件的快速筛选
   - 文档级别的相关性排序

3. **Embedding-Only 精确模式**
   - 仅使用 Embedding v3 模型
   - 精度高，适合深度语义理解
   - 支持细粒度的相似度计算

### 🧩 智能分块

- 自动将长文件分割成小块（默认 500 字符/块）
- 找到最相关的具体段落，而不仅是整个文件
- 返回匹配片段的精确位置

### 📊 详细结果

- **多维度评分**：Rerank 分数、Embedding 分数、综合分数
- **匹配类型**：标识使用的搜索策略
- **位置信息**：显示匹配内容在文件中的位置
- **预览片段**：展示相关的文本片段

## 🚀 快速开始

### 1. 安装依赖

```bash
cd scripts/deep-search
npm install
```

### 2. 配置 API Key

在项目根目录创建 `.env` 文件：

```bash
JINA_API_KEY=your_jina_api_key_here
```

### 3. 运行搜索

```bash
# 基本用法（混合模式）
node deep-search.js "JavaScript 异步编程" ./src

# 快速模式（仅 Rerank）
node deep-search.js "机器学习算法" ./docs --mode rerank-only

# 精确模式（仅 Embedding）
node deep-search.js "数据结构" ./src --mode embedding-only

# 递归搜索子目录
node deep-search.js "API 文档" ./project --recursive

# 自定义返回数量
node deep-search.js "React Hooks" ./src --top 20

# 查看帮助
node deep-search.js
```

## 📖 使用示例

### 示例 1: 查找特定技术主题

```bash
node deep-search.js "WebSocket 实时通信" ./src --mode hybrid --top 5
```

**输出示例：**
```
🏆 搜索结果 (按相关性排序):

1. 📄 websocket-handler.ts
   路径: src/utils/websocket-handler.ts
   最终得分: 0.9234 (hybrid-chunk)
   Rerank 分数: 0.8956
   Embedding 分数: 0.9412
   匹配片段: class WebSocketHandler implements real-time bidirectional...
   位置: 1250-1750

2. 📄 realtime-service.ts
   路径: src/services/realtime-service.ts
   最终得分: 0.8876 (hybrid-chunk)
   ...
```

### 示例 2: 对比不同模式

```bash
# Rerank 模式 - 快速但可能不够精确
node deep-search.js "错误处理" ./src --mode rerank-only --top 10

# Embedding 模式 - 精确但较慢
node deep-search.js "错误处理" ./src --mode embedding-only --top 10

# 混合模式 - 平衡速度与精度
node deep-search.js "错误处理" ./src --mode hybrid --top 10
```

### 示例 3: 大型项目搜索

```bash
# 递归搜索整个项目，返回前 20 个结果
node deep-search.js "数据库连接池" ./ --recursive --top 20 --rerank-top 100
```

## 🔧 命令行选项

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `--mode <模式>` | 搜索模式：`hybrid`, `rerank-only`, `embedding-only` | `hybrid` |
| `--rerank-top <数量>` | Rerank 阶段保留的文档数 | `50` |
| `--top <数量>` | 最终返回的结果数 | `10` |
| `--no-chunk` | 禁用文本分块（按整个文件搜索） | 启用分块 |
| `--recursive` | 递归搜索子目录 | 不递归 |
| `--output <路径>` | 输出 JSON 报告的路径 | `./work_dir/deep-search-results.json` |

## 📁 支持的文件类型

- `.js` - JavaScript
- `.ts` - TypeScript
- `.jsx` - React JSX
- `.tsx` - React TSX
- `.py` - Python
- `.md` - Markdown
- `.json` - JSON
- `.html` - HTML
- `.css` - CSS
- `.txt` - 纯文本

## 🎨 工作原理

### 混合模式工作流程

```
用户查询
    ↓
【读取文件】→ 扫描目录，加载文件内容
    ↓
【Rerank 粗筛】→ 快速筛选出前 N 个相关文件（默认 50）
    ↓
【智能分块】→ 将文件分割成小块（可选）
    ↓
【Embedding 精匹配】→ 计算语义相似度
    ↓
【综合评分】→ Rerank 分数 × 0.4 + Embedding 分数 × 0.6
    ↓
【返回结果】→ 按最终得分排序，返回 Top K
```

### 评分公式

- **Rerank-Only**: `finalScore = rerankScore`
- **Embedding-Only**: `finalScore = embeddingScore`
- **Hybrid**: `finalScore = rerankScore × 0.4 + embeddingScore × 0.6`

## 📊 输出格式

### 控制台输出

```
🏆 搜索结果 (按相关性排序):

1. 📄 filename.js
   路径: src/utils/filename.js
   最终得分: 0.9234 (hybrid-chunk)
   Rerank 分数: 0.8956
   Embedding 分数: 0.9412
   匹配片段: function handleAsync() { ... }
   位置: 1250-1750
```

### JSON 报告

```json
{
  "query": "JavaScript 异步编程",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "searchMode": "hybrid",
  "totalResults": 10,
  "results": [
    {
      "rank": 1,
      "filename": "async-handler.js",
      "relativePath": "src/utils/async-handler.js",
      "finalScore": 0.9234,
      "rerankScore": 0.8956,
      "embeddingScore": 0.9412,
      "matchType": "hybrid-chunk",
      "matchedChunk": {
        "text": "async function handleRequest() { ... }",
        "startPosition": 1250,
        "endPosition": 1750
      },
      "fileSize": "3.2 KB"
    }
  ]
}
```

## 🎯 使用场景

### 1. 代码库搜索
```bash
# 查找特定功能的实现
node deep-search.js "用户认证逻辑" ./src --mode hybrid

# 查找错误处理代码
node deep-search.js "try catch 错误处理" ./src --recursive
```

### 2. 文档查找
```bash
# 查找 API 文档
node deep-search.js "REST API 端点说明" ./docs --mode embedding-only

# 查找配置说明
node deep-search.js "环境变量配置" ./ --recursive --top 5
```

### 3. 技术债务分析
```bash
# 查找需要重构的代码
node deep-search.js "TODO FIXME 技术债务" ./src --recursive --top 20

# 查找过时的实现
node deep-search.js "deprecated legacy 过时" ./src --mode hybrid
```

## ⚡ 性能优化建议

### 1. 选择合适的模式

- **小型项目（< 100 文件）**: 使用 `embedding-only` 获得最佳精度
- **中型项目（100-500 文件）**: 使用 `hybrid` 模式（推荐）
- **大型项目（> 500 文件）**: 使用 `rerank-only` 或调大 `--rerank-top`

### 2. 调整参数

```bash
# 大型项目：增加 Rerank 保留数量
node deep-search.js "query" ./large-project --rerank-top 100 --top 20

# 精确搜索：禁用分块，使用完整文件
node deep-search.js "query" ./src --no-chunk --mode embedding-only

# 快速预览：减少返回数量
node deep-search.js "query" ./src --top 5 --rerank-top 20
```

### 3. 批处理配置

在脚本中可以调整批处理大小：
- `RERANK_BATCH_SIZE`: 默认 100（可根据 API 限制调整）
- `EMBEDDING_BATCH_SIZE`: 默认 32（推荐保持）
- `CHUNK_SIZE`: 默认 500 字符（可根据文件类型调整）

## 🔍 对比：Rerank v3 vs Embedding v3

| 特性 | Rerank v3 | Embedding v3 |
|------|-----------|--------------|
| **模型** | jina-reranker-v3 | jina-embeddings-v3 |
| **参数量** | 0.6B | - |
| **速度** | ⚡⚡⚡ 快 | ⚡⚡ 中等 |
| **精度** | ⭐⭐⭐⭐ 优秀 (BEIR 61.94) | ⭐⭐⭐⭐ 优秀 |
| **批处理** | 100/批 | 32/批 |
| **排序方式** | Listwise（文档间交互） | Pointwise（独立编码） |
| **适用场景** | 粗筛、快速排序 | 精细匹配、语义理解 |
| **成本** | 较低 | 较高 |
| **输出** | 相关性分数 | 1024 维向量 |
| **多语言** | 26+ 语言 | 多语言支持 |

## 🐛 故障排除

### 问题 1: API Key 错误
```
❌ 错误: 请设置 JINA_API_KEY 环境变量
```
**解决**: 在项目根目录创建 `.env` 文件，添加 `JINA_API_KEY=your_key`

### 问题 2: 内存不足
```
❌ 错误: JavaScript heap out of memory
```
**解决**: 
```bash
# 增加 Node.js 内存限制
NODE_OPTIONS="--max-old-space-size=4096" node deep-search.js "query" ./src
```

### 问题 3: 搜索结果不准确
**解决**: 
- 尝试不同的搜索模式
- 调整查询语句，使用更具体的关键词
- 使用 `--no-chunk` 禁用分块
- 增加 `--rerank-top` 的值

### 问题 4: 速度太慢
**解决**:
- 使用 `rerank-only` 模式
- 减少 `--rerank-top` 和 `--top` 的值
- 不使用 `--recursive` 选项
- 限制文件类型

## 📚 相关资源

- [Jina AI 官网](https://jina.ai/)
- [Jina Rerank API 文档](https://docs.jina.ai/concepts/reranking/)
- [Jina Embeddings API 文档](https://docs.jina.ai/concepts/embeddings/)
- [获取 API Key](https://jina.ai/reader)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

Apache 2.0

