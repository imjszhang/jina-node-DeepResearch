# 🛠️ Jina AI 工具集

这个目录包含了基于 Jina AI 模型的各种实用工具。

## 📁 工具列表

### 1. 🔍 [Deep Search](./deep-search/) - 深度文件搜索

结合 **Rerank** 和 **Embedding** 模型的高级文件搜索工具。

**特性**：
- ✅ 三种搜索模式：Hybrid、Rerank-Only、Embedding-Only
- ✅ 智能文本分块，精确定位匹配片段
- ✅ 多维度评分系统
- ✅ 性能基准测试工具

**快速开始**：
```bash
cd deep-search
npm install
npm run generate    # 生成测试数据
npm run test-hybrid # 运行混合模式搜索
```

**文档**：
- [完整文档](./deep-search/README.md)
- [快速开始](./deep-search/QUICKSTART.md)

---

### 2. 📊 [File Rerank](./file-rerank/) - 文件重排序

使用 Jina Rerank 模型对文件进行语义相关性排序。

**特性**：
- ✅ 快速批量处理
- ✅ 多语言支持
- ✅ 详细排序报告

**快速开始**：
```bash
cd file-rerank
npm install
node file-rerank.js "JavaScript 函数" ./test-data
```

**文档**：
- [完整文档](./file-rerank/README.md)

---

## 🎯 工具对比

| 工具 | 主要功能 | 使用模型 | 适用场景 |
|------|----------|----------|----------|
| **Deep Search** | 深度语义搜索 | Rerank + Embedding | 需要高精度的代码/文档搜索 |
| **File Rerank** | 快速文件排序 | Rerank | 快速筛选大量文件 |

## 🚀 选择合适的工具

### 使用 Deep Search 当你需要：
- 🎯 精确的语义理解
- 📍 定位具体的代码片段
- 🔍 深度搜索长文档
- 📊 多维度评分和对比

### 使用 File Rerank 当你需要：
- ⚡ 快速筛选大量文件
- 📁 文件级别的相关性排序
- 🚀 简单直接的排序结果

## 📚 技术栈

所有工具都基于以下技术：

- **Jina AI API**: 提供 Rerank 和 Embedding 能力
- **Node.js**: 运行环境
- **Axios**: HTTP 客户端
- **dotenv**: 环境变量管理

## 🔑 获取 API Key

1. 访问 [Jina AI](https://jina.ai/reader)
2. 注册账号
3. 获取 API Key
4. 在项目根目录创建 `.env` 文件：
   ```
   JINA_API_KEY=your_api_key_here
   ```

## 📖 相关资源

- [Jina AI 官网](https://jina.ai/)
- [Jina Rerank API 文档](https://docs.jina.ai/concepts/reranking/)
- [Jina Embeddings API 文档](https://docs.jina.ai/concepts/embeddings/)
- [项目主仓库](https://github.com/jina-ai/node-DeepResearch)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

Apache 2.0

